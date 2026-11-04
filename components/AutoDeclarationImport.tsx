import React, { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import { DRIVER_FIELDS, POLICY_FIELDS, VEHICLE_FIELDS, type Answers, type AutoField } from '../shared/autoQuote';
import { declarationHasData, normalizeDeclaration, type DeclarationExtraction } from '../shared/autoDeclaration';

const MAX_BYTES = 8 * 1024 * 1024;
const formats = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const button = 'quote-button';
const icon = (name: string) => <i className={'fa-solid ' + name} aria-hidden="true" />;
const labels = (fields: AutoField[]) => Object.fromEntries(fields.map(f => [f.key, f.label]));
const names = { answers: labels(POLICY_FIELDS), drivers: labels(DRIVER_FIELDS), vehicles: labels(VEHICLE_FIELDS) };

function fileBase64(file: File, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const abort = () => reader.abort();
    const cleanup = () => signal.removeEventListener('abort', abort);
    reader.onload = () => { cleanup(); const value = String(reader.result); resolve(value.slice(value.indexOf(',') + 1)); };
    reader.onerror = () => { cleanup(); reject(new Error('The file could not be read. Please choose it again.')); };
    reader.onabort = () => { cleanup(); reject(new DOMException('Canceled', 'AbortError')); };
    if (signal.aborted) return reject(new DOMException('Canceled', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
    reader.readAsDataURL(file);
  });
}

const AutoDeclarationImport: React.FC<{ isOpen: boolean; onClose: () => void; onApply: (data: DeclarationExtraction) => void }> = ({ isOpen, onClose, onApply }) => {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<DeclarationExtraction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cancel = () => { request.current?.abort(); request.current = null; setBusy(false); };
  const close = () => { cancel(); setFile(null); setResult(null); setError(''); onClose(); };
  useEffect(() => () => { request.current?.abort(); }, []);
  useEffect(() => { if (!isOpen) { request.current?.abort(); request.current = null; setBusy(false); setFile(null); setResult(null); setError(''); } }, [isOpen]);
  const choose = (selected: File | undefined) => {
    setResult(null); setError('');
    if (!selected) return;
    if (!formats.includes(selected.type) || !selected.size || selected.size > MAX_BYTES) { setFile(null); setError('Choose a PDF, JPG, PNG or WebP file up to 8 MB.'); return; }
    setFile(selected);
  };
  const read = async () => {
    if (!file || busy) return;
    const controller = new AbortController(); request.current = controller; setBusy(true); setError(''); setResult(null);
    const timeout = setTimeout(() => controller.abort(), 100000);
    try {
      const data = await fileBase64(file, controller.signal);
      const response = await fetch('/api/auto-declaration', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mimeType: file.type, data }), signal: controller.signal });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'The document could not be read. Please retry.');
      if (request.current !== controller) return;
      const extracted = normalizeDeclaration(payload);
      if (!declarationHasData(extracted)) throw new Error('No usable auto policy details were found. Try a clearer photo or a different page.');
      setResult(extracted); setFile(null);
    } catch (failure) {
      if (request.current === controller) setError(controller.signal.aborted ? 'Reading timed out or was canceled. Your draft is unchanged.' : failure instanceof Error ? failure.message : 'The document could not be read.');
    } finally { clearTimeout(timeout); if (request.current === controller) { request.current = null; setBusy(false); } }
  };
  const table = (values: Answers, fieldNames: Record<string, string>) => <dl className="quote-facts">{Object.entries(values).map(([key, value]) => <div key={key}><dt>{fieldNames[key] || key}</dt><dd>{value}</dd></div>)}</dl>;
  return <Modal isOpen={isOpen} onClose={close} title="Read Auto Declarations" maxWidthClass="quote-dialog max-w-6xl">
    <div className="quote-workspace">
      <p className="quote-muted">Take a clear photo or choose a PDF or image of the auto declarations or renewal. The document is sent to Google Gemini for reading; review every result against the document before using it.</p>
      <div className="quote-actions">
        <button type="button" className={button} disabled={busy} onClick={() => cameraRef.current?.click()}>{icon('fa-camera')}Take photo</button>
        <button type="button" className={button} disabled={busy} onClick={() => fileRef.current?.click()}>{icon('fa-file-arrow-up')}Choose photo or PDF</button>
        <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={event => { choose(event.target.files?.[0]); event.target.value = ''; }} aria-label="Take a photo of auto declarations" />
        <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden onChange={event => { choose(event.target.files?.[0]); event.target.value = ''; }} aria-label="Choose auto declarations photo or PDF" />
      </div>
      <p className="quote-hint">PDF, JPG, PNG or WebP, up to 8 MB. Use a multi-page PDF for multiple pages.</p>
      {file && <p className="quote-notice">Ready to read: {file.name}</p>}
      {file && !result && <div className="quote-actions"><button type="button" className={button + ' quote-primary'} disabled={busy} onClick={() => void read()}>{icon(busy ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles')}{busy ? 'Reading document...' : 'Read document'}</button>{busy && <button type="button" className={button} onClick={() => { cancel(); setError('Reading canceled. Your draft is unchanged.'); }}>Cancel reading</button>}</div>}
      {error && <p role="alert" className="quote-alert">{error}</p>}
      {result && <section aria-label="Review extracted auto details">
        <div className="quote-alert"><strong>Review before adding.</strong> Document type: {result.documentType === 'unknown' ? 'not identified' : result.documentType}. The reader can make mistakes. Coverage shown is from the document, not a confirmed request. Existing answers are kept; unmatched or conflicting items may be skipped.</div>
        {result.warnings?.map((warning, i) => <p className="quote-alert" role="alert" key={i}>{warning}</p>)}
        {Object.keys(result.answers).length > 0 && <div className="quote-card"><h3>Policy and applicant</h3>{table(result.answers, names.answers)}</div>}
        {result.drivers.map((driver, i) => <div className="quote-card" key={'d' + i}><h3>Driver {i + 1}</h3>{table(driver, names.drivers)}</div>)}
        {result.vehicles.map((vehicle, i) => <div className="quote-card" key={'v' + i}><h3>Vehicle {i + 1}</h3>{table(vehicle, names.vehicles)}</div>)}
        <div className="quote-actions"><button type="button" className={button} onClick={close}>Cancel</button><button type="button" className={button + ' quote-primary'} onClick={() => { try { onApply(result); close(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not add the details. Your draft is unchanged.'); } }}>Add to empty fields</button></div>
      </section>}
    </div>
  </Modal>;
};
export default AutoDeclarationImport;
