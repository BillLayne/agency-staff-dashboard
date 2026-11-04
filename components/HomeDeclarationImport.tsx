import React, { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import { QUOTE_FIELDS } from '../shared/homeQuote';
import { homeDeclarationHasData, normalizeHomeDeclaration, type HomeDeclaration } from '../shared/homeDeclaration';

const maxBytes = 8 * 1024 * 1024;
const formats = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const button = 'quote-button';
const icon = (name: string) => <i className={'fa-solid ' + name} aria-hidden="true" />;
const labels = Object.fromEntries(QUOTE_FIELDS.map(field => [field.key, field.label]));
function fileBase64(file: File, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(), abort = () => reader.abort();
    const cleanup = () => signal.removeEventListener('abort', abort);
    reader.onload = () => { cleanup(); const value = String(reader.result); resolve(value.slice(value.indexOf(',') + 1)); };
    reader.onerror = () => { cleanup(); reject(new Error('The file could not be read. Please choose it again.')); };
    reader.onabort = () => { cleanup(); reject(new DOMException('Canceled', 'AbortError')); };
    if (signal.aborted) return reject(new DOMException('Canceled', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true }); reader.readAsDataURL(file);
  });
}
const HomeDeclarationImport: React.FC<{ isOpen: boolean; onClose: () => void; onApply: (data: HomeDeclaration, address: string) => void }> = ({ isOpen, onClose, onApply }) => {
  const [file, setFile] = useState<File | null>(null), [result, setResult] = useState<HomeDeclaration | null>(null);
  const [address, setAddress] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const request = useRef<AbortController | null>(null), cameraRef = useRef<HTMLInputElement>(null), fileRef = useRef<HTMLInputElement>(null);
  const cancel = () => { request.current?.abort(); request.current = null; setBusy(false); };
  const close = () => { cancel(); setFile(null); setResult(null); setAddress(''); setError(''); onClose(); };
  useEffect(() => () => { request.current?.abort(); }, []);
  useEffect(() => { if (!isOpen) { request.current?.abort(); request.current = null; setBusy(false); setFile(null); setResult(null); setAddress(''); setError(''); } }, [isOpen]);
  const choose = (selected: File | undefined) => {
    setResult(null); setAddress(''); setError('');
    if (!selected) return;
    if (!formats.includes(selected.type) || !selected.size || selected.size > maxBytes) { setFile(null); setError('Choose a PDF, JPG, PNG or WebP file up to 8 MB.'); return; }
    setFile(selected);
  };
  const read = async () => {
    if (!file || busy) return;
    const controller = new AbortController(); request.current = controller; setBusy(true); setError(''); setResult(null);
    const timeout = setTimeout(() => controller.abort(), 100000);
    try {
      const data = await fileBase64(file, controller.signal);
      const response = await fetch('/api/home-declaration', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mimeType: file.type, data }), signal: controller.signal });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'The document could not be read. Please retry.');
      if (request.current !== controller) return;
      const extracted = normalizeHomeDeclaration(payload);
      if (!homeDeclarationHasData(extracted)) throw new Error('No usable home policy details were found. Try a clearer photo or a different page.');
      setResult(extracted); setAddress(extracted.riskAddress); setFile(null);
    } catch (failure) {
      if (request.current === controller) setError(controller.signal.aborted ? 'Reading timed out or was canceled. Your draft is unchanged.' : failure instanceof Error ? failure.message : 'The document could not be read.');
    } finally { clearTimeout(timeout); if (request.current === controller) { request.current = null; setBusy(false); } }
  };
  return <Modal isOpen={isOpen} onClose={close} title="Read Home Declarations" maxWidthClass="quote-dialog max-w-6xl">
    <div className="quote-workspace">
      <p className="quote-muted">Take a clear photo or choose a PDF or image of the home declarations or renewal. The document is sent to Google Gemini for reading; review every result against the document before using it.</p>
      <div className="quote-actions">
        <button type="button" className={button} disabled={busy} onClick={() => cameraRef.current?.click()}>{icon('fa-camera')}Take photo</button>
        <button type="button" className={button} disabled={busy} onClick={() => fileRef.current?.click()}>{icon('fa-file-arrow-up')}Choose photo or PDF</button>
        <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={event => { choose(event.target.files?.[0]); event.target.value = ''; }} aria-label="Take a photo of home declarations" />
        <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden onChange={event => { choose(event.target.files?.[0]); event.target.value = ''; }} aria-label="Choose home declarations photo or PDF" />
      </div>
      <p className="quote-hint">PDF, JPG, PNG or WebP, up to 8 MB. Use a multi-page PDF for multiple pages.</p>
      {file && <p className="quote-notice">Ready to read: {file.name}</p>}
      {file && !result && <div className="quote-actions"><button type="button" className={button + ' quote-primary'} disabled={busy} onClick={() => void read()}>{icon(busy ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles')}{busy ? 'Reading document...' : 'Read document'}</button>{busy && <button type="button" className={button} onClick={() => { cancel(); setError('Reading canceled. Your draft is unchanged.'); }}>Cancel reading</button>}</div>}
      {error && <p role="alert" className="quote-alert">{error}</p>}
      {result && <section aria-label="Review extracted home details">
        <div className="quote-alert"><strong>Review before adding.</strong> Document type: {result.documentType === 'unknown' ? 'not identified' : result.documentType}. The reader can make mistakes. Verify the insured property and every value; policy coverage is not a confirmed request. Existing answers are kept.</div>
        <div className="quote-card"><label htmlFor="home-document-address" className="quote-label">Property address to research</label>
          <input id="home-document-address" className="quote-input" value={address} onChange={event => setAddress(event.target.value)} placeholder="Street address, city, NC and ZIP" autoComplete="off" />
          {result.riskAddress && <p className="quote-hint">Document showed: {result.riskAddress}</p>}
          <p className="quote-hint">{result.riskAddress ? 'Confirm this is the insured property, not a mailing address.' : 'No labeled property address was identified. Enter and verify the insured property address.'}</p>
        </div>
        {Object.keys(result.answers).length > 0 && <div className="quote-card"><h3>Policy and property details</h3><dl className="quote-facts">{Object.entries(result.answers).map(([key, value]) => <div key={key}><dt>{labels[key] || key}</dt><dd>{value}</dd></div>)}</dl></div>}
        <div className="quote-actions"><button type="button" className={button} onClick={close}>Cancel</button><button type="button" className={button + ' quote-primary'} onClick={() => { try { onApply(result, address); close(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not add the details. Your draft is unchanged.'); } }}>Add to empty fields</button></div>
      </section>}
    </div>
  </Modal>;
};
export default HomeDeclarationImport;
