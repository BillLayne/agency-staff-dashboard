import React, { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import {
  decodeUrl, displayMake, normalizeRecalls, normalizeVin, recallsUrl, summarizeVehicle, validateVin, vehicleSummaryText,
} from '../shared/vin';
import type { RecallItem, VehicleSummary } from '../shared/vin';

interface VinLookupProps {
  isOpen: boolean;
  onClose: () => void;
  /** Prefilled when the search box already holds something VIN-shaped. */
  initialVin?: string;
  addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
}

const primaryClass = 'inline-flex items-center gap-2 rounded-lg bg-[#003f87] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0076d3] disabled:cursor-not-allowed disabled:opacity-50';
const buttonClass = 'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#0076d3]/50 hover:text-[#003f87] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:text-white';

const FETCH_TIMEOUT_MS = 12000;

const fetchJson = async (url: string, signal: AbortSignal): Promise<unknown> => {
  const response = await fetch(url, { signal, headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`NHTSA answered ${response.status}.`);
  return response.json();
};

const VinLookup: React.FC<VinLookupProps> = ({ isOpen, onClose, initialVin = '', addToast }) => {
  const [vin, setVin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checkDigitWarning, setCheckDigitWarning] = useState(false);
  const [summary, setSummary] = useState<VehicleSummary | null>(null);
  const [recalls, setRecalls] = useState<{ count: number; items: RecallItem[] } | null>(null);
  const [recallsNote, setRecallsNote] = useState('');
  const [showAllRecalls, setShowAllRecalls] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const cancel = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  };

  useEffect(() => {
    if (isOpen) {
      setVin(normalizeVin(initialVin));
      setError('');
      setCheckDigitWarning(false);
      setSummary(null);
      setRecalls(null);
      setRecallsNote('');
      setShowAllRecalls(false);
    } else {
      cancel();
      setBusy(false);
    }
    // initialVin is read only at open time on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => cancel, []);

  const decode = async () => {
    const validation = validateVin(vin);
    if (!validation.ok) {
      setError(validation.reason || 'That does not look like a VIN.');
      setSummary(null);
      inputRef.current?.focus();
      return;
    }
    const clean = normalizeVin(vin);
    setVin(clean);
    setError('');
    setCheckDigitWarning(validation.checkDigitOk === false);
    setSummary(null);
    setRecalls(null);
    setRecallsNote('');
    setShowAllRecalls(false);
    setBusy(true);

    cancel();
    const controller = new AbortController();
    controllerRef.current = controller;
    const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const payload = (await fetchJson(decodeUrl(clean), controller.signal)) as { Results?: unknown[] };
      const first = Array.isArray(payload.Results) ? payload.Results[0] : null;
      if (!first || typeof first !== 'object') throw new Error('NHTSA returned no decode for this VIN.');
      const result = summarizeVehicle(clean, first as Record<string, string | number | null | undefined>);
      setSummary(result);

      // Recalls are matched by make/model/year, so only ask when all three exist. Never fatal.
      if (result.make && result.model && result.year) {
        try {
          const feed = await fetchJson(recallsUrl(result.make, result.model, result.year), controller.signal);
          setRecalls(normalizeRecalls(feed));
        } catch (recallError) {
          if (!(recallError instanceof DOMException && recallError.name === 'AbortError')) {
            setRecallsNote('Recall check unavailable right now. Use the NHTSA link below.');
          }
        }
      } else {
        setRecallsNote('Not enough detail decoded to look up recalls automatically.');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('The VIN check was cancelled or timed out. Try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Could not reach NHTSA.');
      }
    } finally {
      window.clearTimeout(timer);
      if (controllerRef.current === controller) controllerRef.current = null;
      setBusy(false);
    }
  };

  const copySummary = async () => {
    if (!summary) return;
    const text = vehicleSummaryText(summary);
    try {
      await navigator.clipboard.writeText(text);
      addToast('Vehicle summary copied.');
    } catch {
      addToast('Could not copy. ' + text, 'danger');
    }
  };

  const visibleRecalls = recalls ? (showAllRecalls ? recalls.items : recalls.items.slice(0, 5)) : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Check a VIN" maxWidthClass="max-w-2xl" initialFocusRef={inputRef}>
      <div className="space-y-4">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => { event.preventDefault(); void decode(); }}
        >
          <label className="sr-only" htmlFor="vin-lookup-input">Vehicle identification number</label>
          <input
            id="vin-lookup-input"
            ref={inputRef}
            type="text"
            value={vin}
            onChange={(event) => setVin(event.target.value.toUpperCase())}
            placeholder="17-character VIN"
            autoComplete="off"
            spellCheck={false}
            maxLength={24}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-base tracking-wider text-slate-900 outline-none focus:border-[#0076d3] dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <button type="submit" className={primaryClass} disabled={busy || !vin.trim()}>
            <i className={'fa-solid ' + (busy ? 'fa-spinner fa-spin' : 'fa-magnifying-glass')} aria-hidden="true" />
            {busy ? 'Checking…' : 'Decode'}
          </button>
          {busy && <button type="button" className={buttonClass} onClick={() => { cancel(); setBusy(false); }}>Cancel</button>}
        </form>

        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}

        {summary && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">{summary.headline || 'Vehicle decoded'}</h4>
                <p className="font-mono text-xs tracking-wider text-slate-500 dark:text-slate-400">{summary.vin}</p>
              </div>
              <button type="button" className={buttonClass} onClick={() => void copySummary()}>
                <i className="fa-regular fa-copy" aria-hidden="true" />Copy summary
              </button>
            </div>

            {summary.clean && !checkDigitWarning && (
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300"><i className="fa-solid fa-circle-check mr-1" aria-hidden="true" />NHTSA decoded this VIN cleanly.</p>
            )}
            {checkDigitWarning && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
                The check digit does not match. That is normal for some imports, but for a North American vehicle it usually means one character was typed wrong — compare it to the title or dash plate.
              </p>
            )}
            {summary.decodeNote && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">NHTSA note: {summary.decodeNote}</p>
            )}

            {summary.facts.length > 0 ? (
              <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {summary.facts.map((fact) => (
                  <div key={fact.label} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/5">
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{fact.label}</dt>
                    <dd className="text-sm font-semibold text-slate-900 dark:text-white">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300">NHTSA has no public detail for this VIN beyond what is shown.</p>
            )}

            <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-white/10">
              <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                Recalls
                {recalls && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">{recalls.count}</span>}
              </h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Matched by {summary.year} {displayMake(summary.make)} {summary.model} — not by this exact VIN. Confirm on{' '}
                <a href="https://www.nhtsa.gov/recalls" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#003f87] underline dark:text-sky-300">NHTSA's recall lookup</a>{' '}
                by entering the VIN.
              </p>
              {recallsNote && <p className="text-sm text-slate-600 dark:text-slate-300">{recallsNote}</p>}
              {recalls && recalls.count === 0 && <p className="text-sm text-slate-600 dark:text-slate-300">No recalls on file for this make, model and year.</p>}
              {visibleRecalls.length > 0 && (
                <ul className="space-y-2">
                  {visibleRecalls.map((item) => (
                    <li key={item.campaign + item.component} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-white/10">
                      <p className="font-semibold text-slate-900 dark:text-white">{item.component || 'Recall'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{[item.campaign, item.date].filter(Boolean).join(' · ')}</p>
                      {item.summary && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs font-semibold text-[#003f87] dark:text-sky-300">Details</summary>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{item.summary}</p>
                        </details>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {recalls && recalls.items.length > 5 && (
                <button type="button" className={buttonClass} onClick={() => setShowAllRecalls((prev) => !prev)}>
                  {showAllRecalls ? 'Show fewer' : `Show all ${recalls.items.length}`}
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500">Source: NHTSA vPIC and recall data (public). Nothing is saved by this dashboard.</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default VinLookup;
