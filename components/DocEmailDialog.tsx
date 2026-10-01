import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import type { ToastMessage } from '../types';
import { DOC_TYPES, extensionOf, formatBytes, guessDocType } from '../shared/docLinks';
import type { DocLinkItem, DocTypeId } from '../shared/docLinks';
import { buildDocEmailHtml, checkDocEmail, cleanSubject, draftSubject } from '../shared/docEmail';
import { fetchDocFile } from '../services/docLinksClient';
import {
  GMAIL_DRAFTS_URL, GatewayError, checkGateway, createGmailDraft, forgetGatewaySettings, gatewaySettings,
  saveGatewaySettings, settingsFromHandoffLink,
} from '../services/mailGateway';

// "Email this document" -- a Gold Elite Gmail DRAFT (never sent automatically) with the file
// attached, created through Bill's BLI Mail Gateway. Mirrors PDF Studio's approved flow.

export interface DocEmailTarget {
  item: DocLinkItem;
  typeId?: DocTypeId;
  customer?: string;
  /** The original File when it is still in this browser (just created); otherwise fetched. */
  file?: File | null;
}

interface Props {
  target: DocEmailTarget | null;
  onClose: () => void;
  addToast: (message: string, type?: ToastMessage['type']) => void;
}

const buttonClass = 'inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10';
const primaryClass = buttonClass + ' bg-[#003f87] !text-white hover:!bg-[#0076d3] dark:hover:!bg-[#0076d3]';
const fieldClass = 'w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60 dark:border-white/20 dark:bg-white/5 dark:text-white';
const labelClass = 'mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200';
const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

type Status =
  | { kind: 'idle' }
  | { kind: 'working'; step: string }
  | { kind: 'done'; remainingQuota: number | null }
  | { kind: 'error'; message: string; uncertain: boolean };

const DocEmailDialog: React.FC<Props> = ({ target, onClose, addToast }) => {
  const [configured, setConfigured] = useState(() => gatewaySettings().configured);
  const [handoff, setHandoff] = useState('');
  const [gwUrl, setGwUrl] = useState('');
  const [gwSecret, setGwSecret] = useState('');
  const [setupStatus, setSetupStatus] = useState<{ error: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [typeId, setTypeId] = useState<DocTypeId>('general');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [subjectTouched, setSubjectTouched] = useState(false);
  const [note, setNote] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [checkedDrafts, setCheckedDrafts] = useState(false);
  const item = target?.item || null;

  // Fresh form for each document.
  useEffect(() => {
    if (!target) return;
    const guessed = target.typeId || guessDocType(target.item.fileName);
    setTypeId(guessed);
    setSubject(draftSubject(guessed));
    setSubjectTouched(false);
    setTo('');
    setNote('');
    setStatus({ kind: 'idle' });
    setCheckedDrafts(false);
    setConfigured(gatewaySettings().configured);
    setSetupStatus(null);
  }, [target]);
  useEffect(() => { if (!subjectTouched) setSubject(draftSubject(typeId)); }, [typeId, subjectTouched]);

  const ext = item ? (extensionOf(item.fileName) || 'file').toUpperCase() : '';
  const metaFor = (size: number | null) => [ext, size ? formatBytes(size) : ''].filter(Boolean).join(' · ');
  const previewHtml = useMemo(() => item ? buildDocEmailHtml({
    typeId, customer: target?.customer || item.customer || '', fileName: item.fileName,
    fileMeta: metaFor(item.size ?? target?.file?.size ?? null), url: item.url, note,
  }) : '', [item, typeId, target, note]); // eslint-disable-line react-hooks/exhaustive-deps

  const recipients = to.split(/[,;]/).map(value => value.trim()).filter(Boolean);
  const badRecipient = recipients.find(value => !EMAIL.test(value));
  const working = status.kind === 'working';
  const lockedByUncertainty = status.kind === 'error' && status.uncertain && !checkedDrafts;

  const connect = async () => {
    setSetupStatus(null);
    const fromLink = handoff.trim() ? settingsFromHandoffLink(handoff) : null;
    if (handoff.trim() && !fromLink) { setSetupStatus({ error: true, message: 'That is not a PDF Studio connection link (it should contain #gw=).' }); return; }
    const url = fromLink ? fromLink.url : gwUrl;
    const secret = fromLink ? fromLink.secret : gwSecret;
    setTesting(true);
    try {
      saveGatewaySettings(url, secret);
      const version = await checkGateway(url.trim());
      setConfigured(true);
      setHandoff(''); setGwUrl(''); setGwSecret('');
      setSetupStatus({ error: false, message: `Connected to the Mail Gateway (version ${version}). The secret is confirmed the first time you create a draft.` });
    } catch (error) {
      forgetGatewaySettings(); // never keep a connection that did not check out (the pasted values stay in the fields)
      setSetupStatus({ error: true, message: error instanceof Error ? error.message : 'Could not connect. Check the address and try again.' });
    } finally {
      setTesting(false);
    }
  };

  const createDraft = async () => {
    if (!item || working || lockedByUncertainty) return;
    if (badRecipient) { setStatus({ kind: 'error', message: `"${badRecipient}" is not an email address.`, uncertain: false }); return; }
    setCheckedDrafts(false);
    try {
      setStatus({ kind: 'working', step: target?.file ? 'Preparing the attachment...' : 'Loading the document to attach...' });
      const bytes = target?.file ? new Uint8Array(await target.file.arrayBuffer()) : await fetchDocFile(item.shortId);
      const html = buildDocEmailHtml({
        typeId, customer: target?.customer || item.customer || '', fileName: item.fileName,
        fileMeta: metaFor(bytes.length), url: item.url, note,
      });
      const problems = checkDocEmail(html);
      if (problems.length) { setStatus({ kind: 'error', message: `Email check failed, nothing was sent: ${problems.join(' ')}`, uncertain: false }); return; }
      setStatus({ kind: 'working', step: 'Creating the Gmail draft...' });
      const result = await createGmailDraft({
        to: recipients.join(', '),
        subject: cleanSubject(subject) || draftSubject(typeId),
        html,
        attachment: { name: item.fileName, mimeType: item.contentType || 'application/octet-stream', bytes },
      });
      setStatus({ kind: 'done', remainingQuota: result.remainingQuota });
      addToast('Gmail draft created with the document attached.', 'success');
    } catch (error) {
      const uncertain = error instanceof GatewayError && error.uncertain;
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : 'The draft could not be created.', uncertain });
    }
  };

  // Focus lands on [data-autofocus] (the To field) -- no Modal-specific prop, so this same
  // file also compiles against the staff dashboard's simpler Modal.
  return <Modal isOpen={Boolean(target)} onClose={onClose} title="Email this document" maxWidthClass="max-w-3xl">
    {item && <div className="min-w-0 space-y-4 text-sm text-slate-700 dark:text-slate-200">
      <p className="m-0">Creates a <strong>Gold Elite Gmail draft</strong> in your Drafts with <strong>{item.fileName}</strong> attached and a &ldquo;View it online&rdquo; button. Nothing is sent until you press Send in Gmail. A copy goes to Save@ for the agency record.</p>

      {!configured ? <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/30 dark:bg-amber-400/10" aria-label="Connect Gmail drafts">
        <p className="m-0 font-semibold text-amber-900 dark:text-amber-100">One-time setup on this device</p>
        <p className="m-0 mt-1 text-amber-900 dark:text-amber-100">Gmail drafts come from your BLI Mail Gateway. Paste PDF Studio&rsquo;s connection link (PDF Studio &rarr; Connections &rarr; copy the connection), or the gateway address and secret from <a className="font-semibold underline" href="https://www.billlayneinsurance.com/mail-gateway/" target="_blank" rel="noopener noreferrer">your Mail Gateway page</a>.</p>
        <label htmlFor="gw-handoff" className={labelClass + ' mt-3'}>PDF Studio connection link</label>
        <input id="gw-handoff" type="password" autoComplete="off" value={handoff} onChange={event => setHandoff(event.target.value)} placeholder="https://www.billlayneinsurance.com/pdf-tools/#gw=..." className={fieldClass} />
        <p className="my-2 text-center text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">or</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label htmlFor="gw-url" className={labelClass}>Gateway address</label>
            <input id="gw-url" autoComplete="off" value={gwUrl} onChange={event => setGwUrl(event.target.value)} placeholder="https://script.google.com/macros/s/.../exec" className={fieldClass} /></div>
          <div><label htmlFor="gw-secret" className={labelClass}>Gateway secret</label>
            <input id="gw-secret" type="password" autoComplete="off" value={gwSecret} onChange={event => setGwSecret(event.target.value)} className={fieldClass} /></div>
        </div>
        <button type="button" className={primaryClass + ' mt-3'} disabled={testing || (!handoff.trim() && (!gwUrl.trim() || !gwSecret.trim()))} onClick={() => void connect()}>
          <i className={'fa-solid ' + (testing ? 'fa-spinner fa-spin' : 'fa-plug')} aria-hidden="true" />{testing ? 'Checking...' : 'Check and save'}
        </button>
        {setupStatus && <p role={setupStatus.error ? 'alert' : 'status'} className={'m-0 mt-2 font-semibold ' + (setupStatus.error ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300')}>{setupStatus.message}</p>}
      </section> : <>
        {setupStatus && !setupStatus.error && <p role="status" className="m-0 font-semibold text-emerald-700 dark:text-emerald-300">{setupStatus.message}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor="doc-email-to" className={labelClass}>To <span className="font-normal text-slate-500">(optional &mdash; you can add it in Gmail)</span></label>
            <input id="doc-email-to" data-autofocus type="email" inputMode="email" autoComplete="email" value={to} disabled={working} onChange={event => setTo(event.target.value)} placeholder="customer@example.com" className={fieldClass} />
            {badRecipient && <p role="alert" className="m-0 mt-1 text-xs font-semibold text-rose-700 dark:text-rose-300">&ldquo;{badRecipient}&rdquo; is not an email address.</p>}
          </div>
          <div className="min-w-0">
            <label htmlFor="doc-email-type" className={labelClass}>Document type</label>
            <select id="doc-email-type" value={typeId} disabled={working} onChange={event => setTypeId(event.target.value as DocTypeId)} className={fieldClass}>
              {DOC_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="doc-email-subject" className={labelClass}>Subject</label>
          <input id="doc-email-subject" value={subject} disabled={working} maxLength={120} onChange={event => { setSubject(event.target.value); setSubjectTouched(true); }} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="doc-email-note" className={labelClass}>A note from Bill <span className="font-normal text-slate-500">(optional)</span></label>
          <textarea id="doc-email-note" rows={3} value={note} disabled={working} maxLength={1500} onChange={event => setNote(event.target.value)} placeholder="Anything personal to add. Leave blank to skip this section." className={fieldClass + ' !text-sm'} />
        </div>

        <div>
          <button type="button" className={buttonClass} aria-expanded={showPreview} onClick={() => setShowPreview(value => !value)}>
            <i className={'fa-solid ' + (showPreview ? 'fa-eye-slash' : 'fa-eye')} aria-hidden="true" />{showPreview ? 'Hide email preview' : 'Show email preview'}
          </button>
          {/* No allow-scripts, so nothing in the email can run. allow-same-origin keeps the
              preview in-process; an opaque-origin srcdoc frame painted blank in some embedded browsers. */}
          {showPreview && <iframe title="Email preview" sandbox="allow-same-origin" srcDoc={previewHtml}
            className="mt-2 h-[30rem] w-full rounded-lg border border-slate-200 bg-[#f1efe9] dark:border-white/15" />}
        </div>

        {status.kind === 'done' && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 font-semibold text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
          <i className="fa-solid fa-circle-check" aria-hidden="true" /> Draft created with {item.fileName} attached. <a className="underline" href={GMAIL_DRAFTS_URL} target="_blank" rel="noopener noreferrer">Open Gmail Drafts</a> to review and send.
          {status.remainingQuota != null && <span className="font-normal"> ({status.remainingQuota} sends left today)</span>}
        </div>}
        {status.kind === 'error' && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200">
          <p className="m-0 font-semibold">{status.message}</p>
          {status.uncertain && <label className="mt-2 flex items-center gap-2 font-semibold">
            <input type="checkbox" checked={checkedDrafts} onChange={event => setCheckedDrafts(event.target.checked)} className="h-4 w-4 accent-[#003f87]" />
            I checked my <a className="underline" href={GMAIL_DRAFTS_URL} target="_blank" rel="noopener noreferrer">Gmail Drafts</a> and the draft is not there
          </label>}
        </div>}

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={primaryClass + ' !min-h-11 !px-5 !text-sm'} disabled={working || lockedByUncertainty || status.kind === 'done'} onClick={() => void createDraft()}>
            <i className={'fa-solid ' + (working ? 'fa-spinner fa-spin' : 'fa-envelope')} aria-hidden="true" />{working ? status.step : status.kind === 'done' ? 'Draft created' : 'Create Gmail draft'}
          </button>
          <button type="button" className={buttonClass} onClick={onClose}>{status.kind === 'done' ? 'Close' : 'Cancel'}</button>
          <button type="button" className="ml-auto text-xs font-semibold text-slate-500 underline hover:text-slate-700 dark:text-slate-400"
            onClick={() => { forgetGatewaySettings(); setConfigured(false); setStatus({ kind: 'idle' }); }}>Disconnect this device</button>
        </div>
      </>}
    </div>}
  </Modal>;
};

export default DocEmailDialog;
