import React, { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import {
  AUTO_SECTIONS, DRIVER_FIELDS, VEHICLE_FIELDS, MAX_DRIVERS, MAX_VEHICLES, RATER_URL, QUOTE_SKILL_OPTIONS, quoteSkillCarrier, quoteSkillPrompt,
  newAutoQuoteDraft, restoreAutoQuoteDraft, normalizeName, draftHasContent, autoQuoteGaps, vehicleConflicts,
  autoAnswerWarnings, buildAutoQuoteReport, buildAutoQuotePacket, packetBlockers, packetFileName, packetPrompt,
  decodeFromSummary, driverLabel, vehicleLabel,
} from '../shared/autoQuote';
import type { Answers, AutoField, AutoQuoteDraft, VinDecode } from '../shared/autoQuote';
import { decodeUrl, displayMake, normalizeVin, summarizeVehicle, validateVin } from '../shared/vin';
import AutoDeclarationImport from './AutoDeclarationImport';
import { mergeDeclaration } from '../shared/autoDeclaration';

// Separate from the home workspace on purpose: its own storage key, draft shape,
// interview and exports. Only the visual classes (.quote-*) are shared.
const STORAGE_KEY = 'matrix-auto-quote-session-v1';
const DECODE_TIMEOUT_MS = 12000;
const buttonClass = 'quote-button';
const icon = (name: string) => <i className={'fa-solid ' + name} aria-hidden="true" />;
function download(contents: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

const FieldInput: React.FC<{ field: AutoField; id: string; value: string; onChange: (value: string) => void }> = ({ field, id, value, onChange }) => {
  if (field.type === 'checks') {
    const selected = value.split(',').map(item => item.trim()).filter(Boolean);
    return <div className="quote-field-wide"><span className="quote-label" id={id + '-label'}>{field.label}</span>
      <div className="quote-checks" role="group" aria-labelledby={id + '-label'} aria-describedby={field.hint ? id + '-hint' : undefined}>
        {field.options?.map(option => <label key={option} className="quote-check"><input type="checkbox" checked={selected.includes(option)} onChange={event => onChange((event.target.checked ? [...selected, option] : selected.filter(item => item !== option)).filter(item => field.options?.includes(item)).join(', '))} /><span>{option}</span></label>)}
      </div>
      {field.hint && <p className="quote-hint" id={id + '-hint'}>{field.hint}</p>}</div>;
  }
  const props = { id, value, className: 'quote-input', 'aria-describedby': field.hint ? id + '-hint' : undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(event.target.value) };
  return <div className={field.type === 'textarea' ? 'quote-field-wide' : ''}><label className="quote-label" htmlFor={id}>{field.label}</label>
    {field.type === 'select' ? <select {...props}><option value="">Not answered</option>{field.options?.map(option => <option key={option}>{option}</option>)}</select>
      : field.type === 'textarea' ? <textarea {...props} rows={3} maxLength={4000} />
        : <input {...props} type={field.type || 'text'} maxLength={4000} max={field.key === 'dob' ? new Date().toISOString().slice(0, 10) : undefined} autoComplete="off" />}
    {field.hint && <p className="quote-hint" id={id + '-hint'}>{field.hint}</p>}</div>;
};

const AutoQuoteWorkspace: React.FC<{
  isOpen: boolean; prospect: string; onClose: () => void;
  onDraftChange: (hasDraft: boolean) => void;
}> = ({ isOpen, prospect, onClose, onDraftChange }) => {
  const [draft, setDraft] = useState<AutoQuoteDraft>(() => {
    try { const saved = sessionStorage.getItem(STORAGE_KEY); return saved ? restoreAutoQuoteDraft(JSON.parse(saved)) : newAutoQuoteDraft(); } catch { return newAutoQuoteDraft(); }
  });
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [storageError, setStorageError] = useState('');
  const [view, setView] = useState<'interview' | 'report'>('interview');
  const [section, setSection] = useState(0);
  const [notice, setNotice] = useState('');
  const [declarationOpen, setDeclarationOpen] = useState(false);
  const [pendingName, setPendingName] = useState('');
  const [confirmation, setConfirmation] = useState<'new' | 'clear' | 'import' | null>(null);
  const [imported, setImported] = useState<AutoQuoteDraft | null>(null);
  const [decodeBusy, setDecodeBusy] = useState<number | null>(null);
  const [decodeErrors, setDecodeErrors] = useState<Record<number, string>>({});
  const decodeRequest = useRef<AbortController | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const headingRef = useRef<HTMLParagraphElement>(null);
  const exportVersion = useRef('');
  const hasContent = draftHasContent(draft);

  const update = (value: Partial<AutoQuoteDraft>) => setDraft(previous => ({ ...previous, ...value, updatedAt: new Date().toISOString() }));
  const setAnswer = (key: string, value: string) => update({ answers: { ...draft.answers, [key]: value } });
  const setDriver = (index: number, key: string, value: string) => update({ drivers: draft.drivers.map((item, i) => i === index ? { ...item, [key]: value } : item) });
  const setVehicle = (index: number, key: string, value: string) => update({ vehicles: draft.vehicles.map((item, i) => i === index ? { ...item, [key]: value } : item) });
  const removeDriver = (index: number) => update({ drivers: draft.drivers.length > 1 ? draft.drivers.filter((_, i) => i !== index) : [{}] });
  const removeVehicle = (index: number) => { setDecodeErrors({}); update({ vehicles: draft.vehicles.length > 1 ? draft.vehicles.filter((_, i) => i !== index) : [{}] }); };
  const cancelDecode = () => { decodeRequest.current?.abort(); decodeRequest.current = null; setDecodeBusy(null); };
  const reset = (next: AutoQuoteDraft) => {
    cancelDecode(); setDraft(next); setDecodeErrors({}); setPendingName(''); setConfirmation(null); setNotice(''); setView('interview'); setSection(0); exportVersion.current = '';
  };
  useEffect(() => {
    if (!isOpen) return;
    const value = normalizeName(prospect);
    if (!value) return;
    const current = draftRef.current;
    if (!draftHasContent(current)) reset(newAutoQuoteDraft(value));
    else if (!current.answers.name?.trim()) setDraft(previous => ({ ...previous, answers: { ...previous.answers, name: value }, updatedAt: new Date().toISOString() }));
    else if (value.toLowerCase() !== current.answers.name.trim().toLowerCase()) setPendingName(value);
    // Opening with a different search never overwrites an interview in progress.
  }, [isOpen, prospect]);
  useEffect(() => () => { decodeRequest.current?.abort(); }, []);
  useEffect(() => { onDraftChange(hasContent); }, [hasContent, onDraftChange]);
  useEffect(() => {
    try {
      if (draftHasContent(draft)) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      else sessionStorage.removeItem(STORAGE_KEY);
      setStorageError('');
    } catch { setStorageError('Browser storage is unavailable. Download an editable draft before leaving this page.'); }
  }, [draft]);
  useEffect(() => {
    const preventLoss = (event: BeforeUnloadEvent) => {
      const current = draftRef.current;
      if (draftHasContent(current) && exportVersion.current !== current.updatedAt) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, []);

  const decodeVehicle = async (index: number) => {
    const vehicle = draftRef.current.vehicles[index];
    const validation = validateVin(vehicle?.vin || '');
    if (!validation.ok) { setDecodeErrors(previous => ({ ...previous, [index]: validation.reason || 'Enter a 17-character VIN.' })); return; }
    const vin = normalizeVin(vehicle.vin);
    cancelDecode();
    const controller = new AbortController();
    decodeRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), DECODE_TIMEOUT_MS);
    setDecodeBusy(index); setDecodeErrors(previous => ({ ...previous, [index]: '' }));
    try {
      const response = await fetch(decodeUrl(vin), { signal: controller.signal, headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error(`NHTSA answered ${response.status}.`);
      const payload = await response.json() as { Results?: unknown[] };
      const first = Array.isArray(payload.Results) ? payload.Results[0] : null;
      if (!first || typeof first !== 'object') throw new Error('NHTSA returned no decode for this VIN.');
      if (decodeRequest.current !== controller) return;
      const decode = decodeFromSummary(summarizeVehicle(vin, first as Record<string, string | number | null | undefined>));
      if (!decode.year && !decode.make) { setDecodeErrors(previous => ({ ...previous, [index]: 'NHTSA has no year or make for this VIN. Enter the vehicle by hand and verify the VIN against the title.' })); return; }
      // Public facts fill only blanks; anything the prospect already said stays and is compared in the report.
      setDraft(previous => ({
        ...previous, updatedAt: new Date().toISOString(),
        vehicles: previous.vehicles.map((item, i) => i === index ? { ...item, vin, year: item.year?.trim() || decode.year, make: item.make?.trim() || displayMake(decode.make), model: item.model?.trim() || [decode.model, decode.trim].filter(Boolean).join(' ') } : item),
        decodes: { ...previous.decodes, [vin]: decode },
      }));
    } catch (failure) {
      if (decodeRequest.current === controller) setDecodeErrors(previous => ({ ...previous, [index]: controller.signal.aborted ? 'The VIN decode timed out. Try again.' : failure instanceof Error ? failure.message : 'Could not reach NHTSA.' }));
    } finally {
      clearTimeout(timeout);
      if (decodeRequest.current === controller) { decodeRequest.current = null; setDecodeBusy(null); }
    }
  };

  const gaps = autoQuoteGaps(draft);
  const conflicts = vehicleConflicts(draft);
  const warnings = autoAnswerWarnings(draft);
  const blockers = packetBlockers(draft);
  const activeSection = AUTO_SECTIONS[section];
  const answersCount = activeSection.kind === 'fields' ? activeSection.fields.filter(field => draft.answers[field.key]?.trim()).length : 0;
  const report = view === 'report' ? buildAutoQuoteReport(draft) : '';
  const keepClose = () => { setDeclarationOpen(false); setConfirmation(null); onClose(); };
  const exportDraft = () => {
    download(JSON.stringify(draft, null, 2), 'auto-quote-draft.json', 'application/json');
    exportVersion.current = draft.updatedAt;
    setNotice('Editable draft downloaded. It contains private prospect information.');
  };
  const importDraft = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Choose an auto quote JSON draft smaller than 2 MB.');
      const loaded = restoreAutoQuoteDraft(JSON.parse(await file.text()));
      setImported(loaded); setConfirmation('import');
    } catch (failure) { setNotice(failure instanceof Error ? failure.message : 'Could not open that draft.'); }
    finally { if (uploadRef.current) uploadRef.current.value = ''; }
  };
  const downloadPacket = () => {
    const packet = buildAutoQuotePacket(draft);
    const filename = packetFileName(packet);
    download(JSON.stringify(packet, null, 2), filename, 'application/json');
    setNotice(`Quote packet downloaded as ${filename}. Claude Code finds it in Downloads; the BLI Auto Rater loads it with Load Packet.`);
  };
  const copyPacket = async () => {
    try {
      await navigator.clipboard.writeText(packetPrompt(buildAutoQuotePacket(draft)));
      setNotice('Quote packet copied. Paste it into Claude Code and say "start the quotes", or load it in the BLI Auto Rater.');
    } catch { downloadPacket(); }
  };
  const copyQuoteSkillPrompt = async () => {
    try {
      await navigator.clipboard.writeText(quoteSkillPrompt(draft.answers));
      setNotice('Prompt copied. Attach the downloaded report or PDF when you paste it into Codex.');
    } catch { setNotice('Clipboard unavailable. Select and copy the quote prompt below.'); }
  };
  const fieldsFor = (fields: AutoField[], values: Answers, prefix: string, onChange: (key: string, value: string) => void, skip: string[] = []) =>
    fields.filter(field => !skip.includes(field.key)).map(field => <FieldInput key={field.key} field={field} id={prefix + field.key} value={values[field.key] || ''} onChange={value => onChange(field.key, value)} />);

  const sectionBody = activeSection.kind === 'fields'
    ? <div className="quote-fields">{fieldsFor(activeSection.fields, draft.answers, 'auto-', setAnswer)}</div>
    : activeSection.kind === 'drivers'
      ? <>
        {draft.drivers.map((driver, index) => <section key={index} className="quote-card" aria-label={driverLabel(driver, index)}>
          <div className="quote-card-heading"><h4>{driverLabel(driver, index)}</h4><button className={buttonClass} aria-label={'Remove ' + driverLabel(driver, index)} onClick={() => removeDriver(index)}>{icon('fa-trash-can')}Remove</button></div>
          <div className="quote-fields">{fieldsFor(DRIVER_FIELDS, driver, `auto-driver-${index}-`, (key, value) => setDriver(index, key, value))}</div>
        </section>)}
        <div className="quote-add quote-actions"><button className={buttonClass} disabled={draft.drivers.length >= MAX_DRIVERS} onClick={() => update({ drivers: [...draft.drivers, {}] })}>{icon('fa-user-plus')}Add driver</button><span className="quote-muted">List every licensed household member, including anyone to exclude.</span></div>
      </>
      : <>
        {draft.vehicles.map((vehicle, index) => {
          const vin = normalizeVin(vehicle.vin || '');
          const decode: VinDecode | undefined = draft.decodes[vin];
          const id = `auto-vehicle-${index}-`;
          return <section key={index} className="quote-card" aria-label={vehicleLabel(vehicle, index, decode)}>
            <div className="quote-card-heading"><h4>{vehicleLabel(vehicle, index, decode)}</h4><button className={buttonClass} aria-label={'Remove ' + vehicleLabel(vehicle, index, decode)} onClick={() => removeVehicle(index)}>{icon('fa-trash-can')}Remove</button></div>
            <div className="quote-vin-row">
              <div><label className="quote-label" htmlFor={id + 'vin'}>VIN</label><input id={id + 'vin'} className="quote-input" value={vehicle.vin || ''} maxLength={24} autoComplete="off" spellCheck={false} aria-describedby={id + 'vin-hint'} onChange={event => setVehicle(index, 'vin', event.target.value.toUpperCase())} /></div>
              <button className={buttonClass} disabled={decodeBusy !== null || !vehicle.vin?.trim()} onClick={() => void decodeVehicle(index)}>{icon(decodeBusy === index ? 'fa-spinner fa-spin' : 'fa-magnifying-glass')}Decode VIN</button>
            </div>
            <p className="quote-hint" id={id + 'vin-hint'}>{decode ? `NHTSA: ${decode.headline || 'decoded'}${decode.body ? ' - ' + decode.body : ''}${decode.clean ? '' : '. ' + (decode.note || 'Decode incomplete; verify.')}` : '17 characters. Decode fills year, make and model from NHTSA public data.'}</p>
            {decodeErrors[index] && <p className="quote-alert" role="alert">{decodeErrors[index]}</p>}
            <div className="quote-fields">{fieldsFor(VEHICLE_FIELDS, vehicle, id, (key, value) => setVehicle(index, key, value), ['vin'])}</div>
          </section>;
        })}
        <div className="quote-add quote-actions"><button className={buttonClass} disabled={draft.vehicles.length >= MAX_VEHICLES} onClick={() => update({ vehicles: [...draft.vehicles, {}] })}>{icon('fa-car')}Add vehicle</button><span className="quote-muted">Quote only the vehicles the prospect lists; portal suggestions are not additions.</span></div>
      </>;

  return <>
    <Modal isOpen={isOpen} onClose={keepClose} title="Auto Quote Information" maxWidthClass="quote-dialog max-w-6xl" initialFocusRef={headingRef}>
      <div className="quote-workspace">
        <div className="quote-toolbar">
          <div><p ref={headingRef} tabIndex={-1} className="quote-address">{draft.answers.name || 'New auto quote'}</p><p className="quote-muted">Private interview. Retained in this tab; not backed up to the agency cloud.</p></div>
          <div className="quote-actions">
            <button type="button" className={buttonClass} onClick={() => setDeclarationOpen(true)} title="Take a photo or read an auto declarations page" aria-label="Read auto declarations">{icon('fa-camera')}Read declarations</button>
            <button className={buttonClass} onClick={exportDraft} disabled={!hasContent}>{icon('fa-download')}Save draft</button>
            <button className={buttonClass} onClick={() => uploadRef.current?.click()}>{icon('fa-folder-open')}Open draft</button>
            <button className={buttonClass} title="Clear quote draft" aria-label="Clear quote draft" onClick={() => setConfirmation('clear')}>{icon('fa-trash-can')}</button>
            <input type="file" accept=".json,application/json" ref={uploadRef} hidden onChange={event => void importDraft(event.target.files?.[0])} aria-label="Open auto quote draft file" />
          </div>
        </div>
        {notice && <p className="quote-notice" role="status">{notice}</p>}
        {storageError && <p className="quote-alert" role="alert">{storageError}</p>}
        {pendingName && <div className="quote-alert"><p>A draft for <strong>{draft.answers.name}</strong> is already open. New search: <strong>{pendingName}</strong>.</p><div className="quote-actions"><button className={buttonClass} onClick={() => setConfirmation('new')}>Start new prospect</button><button className={buttonClass} onClick={() => setPendingName('')}>Continue this draft</button></div></div>}
        <div className="quote-tabs quote-tabs-2" role="group" aria-label="Quote workspace view">
          <button aria-pressed={view === 'interview'} onClick={() => setView('interview')}>{icon('fa-clipboard-list')}<span>Interview</span></button>
          <button aria-pressed={view === 'report'} onClick={() => setView('report')}>{icon('fa-file-lines')}<span>Report &amp; packet</span></button>
        </div>
        {view === 'interview' && <section className="quote-interview" aria-label="Prospect interview">
          <div className="quote-step-select"><label htmlFor="auto-quote-section" className="quote-label">Interview section</label><select id="auto-quote-section" className="quote-input" value={section} onChange={event => setSection(Number(event.target.value))}>{AUTO_SECTIONS.map((item, index) => <option value={index} key={item.id}>{index + 1}. {item.label}</option>)}</select></div>
          <div className="quote-steps" role="group" aria-label="Interview sections">{AUTO_SECTIONS.map((item, index) => <button key={item.id} aria-pressed={section === index} onClick={() => setSection(index)}>{index + 1}. {item.label}</button>)}</div>
          <div className="quote-section-heading"><h3>{activeSection.label}</h3><span className="quote-muted">{activeSection.kind === 'fields' ? `${answersCount} / ${activeSection.fields.length} entered` : activeSection.kind === 'drivers' ? `${draft.drivers.length} on this quote` : `${draft.vehicles.length} on this quote`}</span></div>
          <p className="quote-muted">Ask the prospect. Leave unknown answers blank; do not assume No or clean.</p>
          {sectionBody}
          {warnings.length > 0 && <ul className="quote-alert" role="alert">{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
          <div className="quote-step-footer"><span className="quote-muted">All questions optional</span><div className="quote-actions"><button className={buttonClass} disabled={section === 0} onClick={() => setSection(section - 1)}>{icon('fa-arrow-left')}Back</button><button className={buttonClass + ' quote-primary'} onClick={() => section < AUTO_SECTIONS.length - 1 ? setSection(section + 1) : setView('report')}>{section < AUTO_SECTIONS.length - 1 ? 'Next section' : 'Review report'}{icon('fa-arrow-right')}</button></div></div>
        </section>}
        {view === 'report' && <section aria-label="Auto quote report and packet">
          <div className="quote-report-heading"><div><h3>Auto quote intake</h3><p className="quote-muted">{gaps.length} follow-up notes. All questions are optional; unanswered items do not block the report.</p></div><div className="quote-actions"><button className={buttonClass + ' quote-primary'} onClick={() => { download(buildAutoQuoteReport(draft), 'auto-quote-intake.html', 'text/html;charset=utf-8'); setNotice('Report downloaded as auto-quote-intake.html. It contains private prospect information.'); }}>{icon('fa-download')}Download report</button><button className={buttonClass} onClick={() => { try { previewRef.current?.contentWindow?.focus(); previewRef.current?.contentWindow?.print(); } catch { setNotice('Download the report and print it from your browser.'); } }}>{icon('fa-print')}Print / PDF</button></div></div>
          <div className="quote-card"><h4>Quote with Codex</h4><p className="quote-muted">Choose the company, then download the report or save it as a PDF. Copy the prompt into Codex and attach the report.</p><label className="quote-label" htmlFor="quote-skill-carrier">Company to quote</label><select id="quote-skill-carrier" className="quote-input" value={quoteSkillCarrier(draft.answers)} onChange={event => setAnswer('quoteSkillCarrier', event.target.value)}>{QUOTE_SKILL_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}</select><label className="quote-label" htmlFor="quote-skill-prompt">Prompt</label><textarea id="quote-skill-prompt" className="quote-input" readOnly rows={4} value={quoteSkillPrompt(draft.answers)} /><div className="quote-actions mt-4"><button className={buttonClass} onClick={() => void copyQuoteSkillPrompt()}>{icon('fa-copy')}Copy quote prompt</button></div><p className="quote-hint">This choice controls the Codex prompt and report. The separate BLI Auto Rater packet uses the carrier choices in the Coverage interview.</p></div>
          <div className="quote-research-status" role="status">{blockers.length ? `Quote packet needs: ${blockers.join(', ')}.` : 'Quote packet ready for the BLI Auto Rater or the start-auto-quotes skill.'}</div>
          <div className="quote-actions">
            <button className={buttonClass} disabled={blockers.length > 0} onClick={() => void copyPacket()}>{icon('fa-copy')}Copy quote packet</button>
            <button className={buttonClass} disabled={blockers.length > 0} onClick={downloadPacket}>{icon('fa-file-export')}Download packet</button>
            <a className={buttonClass} href={RATER_URL} target="_blank" rel="noopener noreferrer">BLI Auto Rater {icon('fa-arrow-up-right-from-square')}</a>
          </div>
          <details className="quote-followup"><summary>{gaps.length} follow-up notes{conflicts.length ? `; ${conflicts.length} conflicting answers` : ''}</summary><ul>{[...conflicts, ...gaps].map((gap, index) => <li key={index}>{gap}</li>)}</ul></details>
          <iframe ref={previewRef} title="Auto quote intake report preview" sandbox="allow-same-origin allow-modals allow-popups allow-popups-to-escape-sandbox" className="quote-preview" srcDoc={report} />
        </section>}
      </div>
    </Modal>
    <AutoDeclarationImport isOpen={isOpen && declarationOpen} onClose={() => setDeclarationOpen(false)} onApply={data => {
      const merged = mergeDeclaration(draftRef.current, data);
      setDraft(merged.draft);
      setNotice(`Declaration details added to empty fields. Review against the document.${merged.skipped ? ` ${merged.skipped} conflicting or unmatchable item(s) were kept or skipped.` : ''}`);
      setView('interview'); setSection(0);
    }} />
    <Modal isOpen={isOpen && Boolean(confirmation)} title={confirmation === 'clear' ? 'Clear private quote draft?' : confirmation === 'new' ? 'Start a new quote?' : 'Open a saved quote?'} onClose={() => setConfirmation(null)}>
      <p className="text-sm">This replaces the current draft in this tab. Download it first if you need to keep the answers.</p>
      <div className="quote-actions mt-4"><button className={buttonClass} onClick={exportDraft} disabled={!hasContent}>Save current draft</button><button className={buttonClass} onClick={() => setConfirmation(null)}>Cancel</button><button className={buttonClass + ' quote-primary'} onClick={() => {
        if (confirmation === 'new') reset(newAutoQuoteDraft(pendingName));
        else if (confirmation === 'import' && imported) { reset(imported); setImported(null); }
        else { reset(newAutoQuoteDraft()); onClose(); }
      }}>{confirmation === 'clear' ? 'Clear draft' : confirmation === 'new' ? 'Start new quote' : 'Open saved quote'}</button></div>
    </Modal>
  </>;
};
export default AutoQuoteWorkspace;
