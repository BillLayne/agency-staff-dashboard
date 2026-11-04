import React, { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import {
  QUOTE_SECTIONS, PROPERTY_FIELDS, PROPERTY_LINKS, newQuoteDraft, normalizeAddress,
  restoreQuoteDraft, selectedProperty, quoteGaps, propertyConflicts, answerWarnings,
  buildHomeQuoteReport, findMyHomeUrl,
} from '../shared/homeQuote';
import type { QuoteDraft, QuoteResearch } from '../shared/homeQuote';

const STORAGE_KEY = 'matrix-home-quote-session-v1';
const buttonClass = 'quote-button';
const icon = (name: string) => <i className={'fa-solid ' + name} aria-hidden="true" />;
function download(contents: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

const HomeQuoteWorkspace: React.FC<{
  isOpen: boolean; address: string; onClose: () => void;
  onDraftChange: (hasDraft: boolean) => void;
}> = ({ isOpen, address, onClose, onDraftChange }) => {
  const [draft, setDraft] = useState<QuoteDraft>(() => {
    try { const saved = sessionStorage.getItem(STORAGE_KEY); return saved ? restoreQuoteDraft(JSON.parse(saved)) : newQuoteDraft(); } catch { return newQuoteDraft(); }
  });
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [storageError, setStorageError] = useState('');
  const [view, setView] = useState<'interview' | 'property' | 'report'>('interview');
  const [section, setSection] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingAddress, setPendingAddress] = useState('');
  const [startingAddress, setStartingAddress] = useState('');
  const [confirmation, setConfirmation] = useState<'new' | 'clear' | 'import' | null>(null);
  const [imported, setImported] = useState<QuoteDraft | null>(null);
  const request = useRef<AbortController | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const headingRef = useRef<HTMLParagraphElement>(null);
  const exportVersion = useRef('');

  const update = (value: Partial<QuoteDraft>) => setDraft(previous => ({ ...previous, ...value, updatedAt: new Date().toISOString() }));
  const cancel = () => { request.current?.abort(); request.current = null; setBusy(false); };
  const research = async (current: QuoteDraft) => {
    cancel();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError('');
    // A retry invalidates the old match until the new lookup is reviewed.
    setDraft({ ...current, confirmed: false, research: null, selectedId: '', updatedAt: new Date().toISOString() });
    const timeout = setTimeout(() => controller.abort(), 28000);
    try {
      const response = await fetch('/api/home-quote', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address: current.address }), signal: controller.signal,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Property research could not finish. Please retry.');
      if (!result || result.address !== current.address || !Array.isArray(result.results)) throw new Error('The lookup returned an unexpected address. Please retry.');
      if (request.current !== controller) return;
      setDraft(previous => ({ ...previous, research: result as QuoteResearch, selectedId: result.results[0]?.id || '', confirmed: false, updatedAt: new Date().toISOString() }));
    } catch (failure) {
      if (request.current === controller) setError(controller.signal.aborted ? 'Research timed out. Your interview answers are unchanged. Retry or open Find My Home.' : failure instanceof Error ? failure.message : 'Property research failed. Please retry.');
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) { request.current = null; setBusy(false); }
    }
  };
  const startNew = (value: string) => {
    setPendingAddress(''); setStartingAddress(''); setConfirmation(null); setNotice(''); setView('interview'); setSection(0); exportVersion.current = '';
    void research(newQuoteDraft(value));
  };
  useEffect(() => {
    if (!isOpen) return;
    const value = normalizeAddress(address);
    if (!draftRef.current.address && value) startNew(value);
    else if (value && value.toLowerCase() !== draftRef.current.address.toLowerCase()) setPendingAddress(value);
    // Opening or changing the requested address must not overwrite an existing interview.
  }, [isOpen, address]);
  useEffect(() => () => { request.current?.abort(); }, []);
  useEffect(() => { onDraftChange(Boolean(draft.address)); }, [draft.address, onDraftChange]);
  useEffect(() => {
    try {
      if (draft.address) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      else sessionStorage.removeItem(STORAGE_KEY);
      setStorageError('');
    } catch { setStorageError('Browser storage is unavailable. Download an editable draft before leaving this page.'); }
  }, [draft]);
  useEffect(() => {
    const preventLoss = (event: BeforeUnloadEvent) => {
      const current = draftRef.current;
      if (Object.values(current.answers).some(Boolean) && exportVersion.current !== current.updatedAt) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, []);

  const property = selectedProperty(draft);
  const gaps = quoteGaps(draft);
  const conflicts = propertyConflicts(draft);
  const warnings = answerWarnings(draft.answers);
  const activeSection = QUOTE_SECTIONS[section];
  const answersCount = activeSection.fields.filter(field => draft.answers[field.key]?.trim()).length;
  const report = view === 'report' ? buildHomeQuoteReport(draft) : '';
  const keepClose = () => { setConfirmation(null); onClose(); };
  const exportDraft = () => {
    download(JSON.stringify(draft, null, 2), 'home-quote-draft.json', 'application/json');
    exportVersion.current = draft.updatedAt;
    setNotice('Editable draft downloaded. It contains private prospect information.');
  };
  const importDraft = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Choose a home quote JSON draft smaller than 2 MB.');
      const loaded = restoreQuoteDraft(JSON.parse(await file.text()));
      setImported(loaded); setConfirmation('import');
    } catch (failure) { setNotice(failure instanceof Error ? failure.message : 'Could not open that draft.'); }
    finally { if (uploadRef.current) uploadRef.current.value = ''; }
  };

  const propertyPanel = <section aria-label="Property research" className="quote-property">
    <div className="quote-section-heading"><h3>Property research</h3>{busy && icon('fa-spinner fa-spin')}</div>
    <p className="quote-muted">Find My Home / county records</p>
    <div className="quote-research-status" role="status">
      {busy ? 'Looking up the address. You can keep entering prospect answers.' : error ? 'Research needs attention' : !draft.research ? 'Research not loaded' : property?.hasCountyRecord ? `${draft.research.results.length} county record${draft.research.results.length === 1 ? '' : 's'} returned` : 'Limited public data; county record not confirmed'}
    </div>
    {error && <div className="quote-alert" role="alert"><p>{error}</p>{/session|sign.in/i.test(error) && <a href="/login" target="_blank" rel="noopener noreferrer">Sign in again</a>}</div>}
    {draft.research?.note && <p className="quote-muted">{draft.research.note}</p>}
    <div className="quote-actions">
      {busy ? <button className={buttonClass} onClick={() => { cancel(); setError('Research cancelled. Your interview answers are unchanged.'); }}>{icon('fa-stop')}Cancel</button> : <button className={buttonClass} disabled={!draft.address} onClick={() => void research(draft)}>{icon('fa-rotate-right')}Retry research</button>}
      <a className={buttonClass} href={findMyHomeUrl(draft.address)} target="_blank" rel="noopener noreferrer">Find My Home {icon('fa-arrow-up-right-from-square')}</a>
    </div>
    {draft.research && !draft.research.results.length && <p className="quote-alert">No property record returned. Verify the full NC address or open the county portal. The interview and report remain available.</p>}
    {property && <>
      <label className="quote-label" htmlFor="quote-parcel">Property / parcel match</label>
      <select id="quote-parcel" className="quote-input" value={draft.selectedId} onChange={event => update({ selectedId: event.target.value, confirmed: false })}>
        {draft.research?.results.map(record => <option key={record.id} value={record.id}>{record.officialAddress} | {record.facts.parcelId || record.facts.pin || 'No parcel ID'}</option>)}
      </select>
      <p className="quote-muted">Geocoded: {draft.research?.formattedAddress}</p>
      {property.recordAddressDiffers && <p className="quote-alert">Record address differs from the search. Check the parcel before confirming.</p>}
      <label className="quote-check"><input type="checkbox" checked={draft.confirmed} disabled={!property.hasCountyRecord} onChange={event => update({ confirmed: event.target.checked })} /><span>I checked the address and parcel; this is the correct home.</span></label>
      <dl className="quote-facts">{PROPERTY_FIELDS.map(([key, label]) => <div key={key}><dt>{label}</dt><dd className={property.facts[key] ? '' : 'quote-missing'}>{property.facts[key] || 'Not shown'}</dd></div>)}</dl>
      <p className="quote-alert">Tax value is not replacement cost. Roof age, ownership, claims and coverage must be confirmed with the prospect.</p>
      <h4 className="quote-label">Source links</h4>
      <ul className="quote-source-links">{PROPERTY_LINKS.filter(([key]) => property.links[key]).map(([key, label]) => <li key={key}><a href={property.links[key]} target="_blank" rel="noopener noreferrer">{label} {icon('fa-arrow-up-right-from-square')}</a></li>)}</ul>
      <p className="quote-muted">Source pages may require another search. Property cards and maps have not been independently verified.</p>
    </>}
  </section>;

  return <>
    <Modal isOpen={isOpen} onClose={keepClose} title="Home Quote Information" maxWidthClass="quote-dialog max-w-6xl" initialFocusRef={headingRef}>
      <div className="quote-workspace">
        <div className="quote-toolbar">
          <div><p ref={headingRef} tabIndex={-1} className="quote-address">{draft.address || address}</p><p className="quote-muted">Private interview. Retained in this tab; not backed up to the agency cloud.</p></div>
          <div className="quote-actions">
            <button className={buttonClass} onClick={exportDraft} disabled={!draft.address}>{icon('fa-download')}Save draft</button>
            <button className={buttonClass} onClick={() => uploadRef.current?.click()}>{icon('fa-folder-open')}Open draft</button>
            <button className={buttonClass} title="Clear quote draft" aria-label="Clear quote draft" onClick={() => setConfirmation('clear')}>{icon('fa-trash-can')}</button>
            <input type="file" accept=".json,application/json" ref={uploadRef} hidden onChange={event => void importDraft(event.target.files?.[0])} aria-label="Open home quote draft file" />
          </div>
        </div>
        {notice && <p className="quote-notice" role="status">{notice}</p>}
        {storageError && <p className="quote-alert" role="alert">{storageError}</p>}
        {pendingAddress && <div className="quote-alert"><p>A draft for <strong>{draft.address}</strong> is already open. New search: <strong>{pendingAddress}</strong>.</p><div className="quote-actions"><button className={buttonClass} onClick={() => setConfirmation('new')}>Start new address</button><button className={buttonClass} onClick={() => setPendingAddress('')}>Continue this draft</button></div></div>}
        {!draft.address ? <form onSubmit={event => { event.preventDefault(); const value = normalizeAddress(startingAddress); if (value) startNew(value); }}>
          <label className="quote-label" htmlFor="home-quote-start-address">Property address</label>
          <p className="quote-muted">Enter the full North Carolina property address to start the interview and property lookup.</p>
          <input id="home-quote-start-address" className="quote-input" value={startingAddress} onChange={event => setStartingAddress(event.target.value)} placeholder="Street address, city, NC and ZIP" autoComplete="off" />
          <div className="quote-actions mt-4"><button type="submit" className={buttonClass + ' quote-primary'} disabled={!startingAddress.trim()}>Start home quote</button></div>
        </form> : <>
        <div className="quote-tabs" role="group" aria-label="Quote workspace view">
          <button aria-pressed={view === 'interview'} onClick={() => setView('interview')}>{icon('fa-clipboard-question')}<span>Interview</span></button>
          <button aria-pressed={view === 'property'} onClick={() => setView('property')}>{icon('fa-house')}<span>Property</span>{busy && icon('fa-spinner fa-spin')}</button>
          <button aria-pressed={view === 'report'} onClick={() => setView('report')}>{icon('fa-file-lines')}<span>Report</span></button>
        </div>
        {view === 'interview' && <div className="quote-columns">
          <section className="quote-interview" aria-label="Prospect interview">
            <div className="quote-step-select"><label htmlFor="quote-section" className="quote-label">Interview section</label><select id="quote-section" className="quote-input" value={section} onChange={event => setSection(Number(event.target.value))}>{QUOTE_SECTIONS.map((item, index) => <option value={index} key={item.id}>{index + 1}. {item.label}</option>)}</select></div>
            <div className="quote-steps" role="group" aria-label="Interview sections">{QUOTE_SECTIONS.map((item, index) => <button key={item.id} aria-pressed={section === index} onClick={() => setSection(index)}>{index + 1}. {item.label}</button>)}</div>
            <div className="quote-section-heading"><h3>{activeSection.label}</h3><span className="quote-muted">{answersCount} / {activeSection.fields.length} entered</span></div>
            <p className="quote-muted">Ask the prospect. Leave unknown answers blank; do not assume No.</p>
            <div className="quote-fields">{activeSection.fields.map(field => {
              const id = 'quote-' + field.key;
              const props = { id, value: draft.answers[field.key] || '', className: 'quote-input', 'aria-describedby': field.hint ? id + '-hint' : undefined,
                onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => update({ answers: { ...draft.answers, [field.key]: event.target.value } }) };
              return <div key={field.key} className={field.type === 'textarea' ? 'quote-field-wide' : ''}><label className="quote-label" htmlFor={id}>{field.label}</label>
                {field.type === 'select' ? <select {...props}><option value="">Not answered</option>{field.options?.map(option => <option key={option}>{option}</option>)}</select>
                  : field.type === 'textarea' ? <textarea {...props} rows={3} maxLength={4000} />
                    : <input {...props} type={field.type || 'text'} maxLength={4000} max={field.key === 'dob' ? new Date().toISOString().slice(0, 10) : undefined} autoComplete="off" />}
                {field.hint && <p className="quote-hint" id={id + '-hint'}>{field.hint}</p>}</div>;
            })}</div>
            {warnings.length > 0 && <ul className="quote-alert" role="alert">{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
            <div className="quote-step-footer"><span className="quote-muted">All questions optional</span><div className="quote-actions"><button className={buttonClass} disabled={section === 0} onClick={() => setSection(section - 1)}>{icon('fa-arrow-left')}Back</button><button className={buttonClass + ' quote-primary'} onClick={() => section < QUOTE_SECTIONS.length - 1 ? setSection(section + 1) : setView('report')}>{section < QUOTE_SECTIONS.length - 1 ? 'Next section' : 'Review report'}{icon('fa-arrow-right')}</button></div></div>
          </section>
          <aside className="quote-research-aside">{propertyPanel}</aside>
        </div>}
        {view === 'property' && propertyPanel}
        {view === 'report' && <section aria-label="Combined quote report">
          <div className="quote-report-heading"><div><h3>Combined quote intake</h3><p className="quote-muted">{gaps.length} follow-up notes. All questions are optional; unanswered items do not block the report.</p></div><div className="quote-actions"><button className={buttonClass + ' quote-primary'} onClick={() => { download(buildHomeQuoteReport(draft), 'index.html', 'text/html;charset=utf-8'); setNotice('Report downloaded as index.html. It contains private prospect information.'); }}>{icon('fa-download')}Download report</button><button className={buttonClass} onClick={() => { try { previewRef.current?.contentWindow?.focus(); previewRef.current?.contentWindow?.print(); } catch { setNotice('Download the report and print it from your browser.'); } }}>{icon('fa-print')}Print / PDF</button></div></div>
          <details className="quote-followup"><summary>{gaps.length} follow-up notes{conflicts.length ? `; ${conflicts.length} conflicting answers` : ''}</summary><ul>{[...conflicts, ...gaps].map((gap, index) => <li key={index}>{gap}</li>)}</ul></details>
          <iframe ref={previewRef} title="Home quote intake report preview" sandbox="allow-same-origin allow-modals allow-popups allow-popups-to-escape-sandbox" className="quote-preview" srcDoc={report} />
        </section>}
        </>}
      </div>
    </Modal>
    <Modal isOpen={isOpen && Boolean(confirmation)} title={confirmation === 'clear' ? 'Clear private quote draft?' : confirmation === 'new' ? 'Start a new quote?' : 'Open a saved quote?'} onClose={() => setConfirmation(null)}>
      <p className="text-sm">This replaces the current draft in this tab. Download it first if you need to keep the answers.</p>
      <div className="quote-actions mt-4"><button className={buttonClass} onClick={exportDraft}>Save current draft</button><button className={buttonClass} onClick={() => setConfirmation(null)}>Cancel</button><button className={buttonClass + ' quote-primary'} onClick={() => {
        if (confirmation === 'new') startNew(pendingAddress);
        else if (confirmation === 'import' && imported) { cancel(); setDraft(imported); setError(''); setImported(null); setPendingAddress(''); setView('interview'); setSection(0); setConfirmation(null); }
        else { cancel(); setDraft(newQuoteDraft()); setPendingAddress(''); setConfirmation(null); onClose(); }
      }}>{confirmation === 'clear' ? 'Clear draft' : confirmation === 'new' ? 'Start new quote' : 'Open saved quote'}</button></div>
    </Modal>
  </>;
};
export default HomeQuoteWorkspace;
