import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ToastMessage } from '../types';
import {
  DOC_ACCEPT, DOC_TYPES, buildCustomerMessage, describeReceipt, emailSubject, extensionOf, finalizeFileName,
  AGE_FILTERS, DOC_LINK_SOURCES, TEXT_PREVIEW_IMAGE, formatBytes, isOlderThan, lastCustomerActivity, formatWhen, gmailComposeUrl, guessDocType, matchesDocQuery,
  previewLinkTitle, previewTypeForFileName, sourceLabel, staffTestUrl, suggestFileName, tidyCustomerName, validateDocFile,
  DOC_RETENTION_DAYS, autoDeleteAt, describeAutoDelete,
} from '../shared/docLinks';
import type { AgeFilter, DocLinkItem, DocLinkSource, DocTypeId, DocViewStats, ReceiptTone } from '../shared/docLinks';
import { createDocLink, deleteDocLink, fetchDocViews, listAllDocLinks } from '../services/docLinksClient';
import DocEmailDialog from './DocEmailDialog';
import type { DocEmailTarget } from './DocEmailDialog';

// Standalone twin of the SMS composer's document upload: PDF / Word / photo in,
// branded docs.billlayneinsurance.com/d/<id> page out -- the exact same customer
// preview page, receipts and storage, without opening a conversation.

interface DocumentLinksCardProps {
  addToast: (message: string, type?: ToastMessage['type']) => void;
  active?: boolean;
}
type SourceFilter = 'all' | DocLinkSource;

const buttonClass = 'inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10';
const primaryClass = buttonClass + ' bg-[#003f87] !text-white hover:!bg-[#0076d3] dark:hover:!bg-[#0076d3]';
const dangerClass = buttonClass + ' !border-rose-200 !text-rose-700 hover:!bg-rose-50 dark:!border-rose-400/30 dark:!text-rose-300 dark:hover:!bg-rose-400/10';
const dangerSolidClass = buttonClass + ' !border-rose-600 bg-rose-600 !text-white hover:!bg-rose-700';
const confirmBoxClass = 'w-full rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-100';
const RECENT_MS = 30 * 86400000;
// The library is a Cloudflare KV list(), which can keep showing a deleted row for
// up to about a minute. Rows deleted here stay hidden from refreshes this long.
const DELETE_SETTLE_MS = 5 * 60000;
const fieldClass = 'w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60 dark:border-white/20 dark:bg-white/5 dark:text-white';
const labelClass = 'mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200';
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please retry.';
const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

const RECEIPT_STYLES: Record<ReceiptTone, string> = {
  none: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300',
  viewed: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200',
  opened: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200',
  saved: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-200',
};

function fileIcon(nameOrType: string) {
  const value = nameOrType.toLowerCase();
  if (value.includes('pdf')) return 'fa-file-pdf text-rose-600';
  if (/image|jpe?g|png|gif|webp|avif/.test(value)) return 'fa-file-image text-sky-600';
  if (/word|docx?$/.test(value)) return 'fa-file-word text-blue-700';
  return 'fa-file-lines text-slate-500';
}

const ReceiptPill: React.FC<{ stats: DocViewStats | null | undefined; loading?: boolean }> = ({ stats, loading }) => {
  const receipt = describeReceipt(stats);
  return <span title={receipt.title} className={'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ' + RECEIPT_STYLES[receipt.tone]}>
    <i className={'fa-solid ' + (loading ? 'fa-spinner fa-spin' : receipt.tone === 'saved' ? 'fa-download' : receipt.tone === 'opened' ? 'fa-file-circle-check' : 'fa-eye')} aria-hidden="true" />
    <span className="truncate">{receipt.label}</span>
  </span>;
};

// The automatic-cleanup date, once the row's receipts have loaded (the rule needs the last open).
const AutoDeleteNote: React.FC<{ item: DocLinkItem; stats: DocViewStats | null | undefined }> = ({ item, stats }) => {
  if (stats === undefined) return null;
  const note = describeAutoDelete(autoDeleteAt(item, stats));
  if (!note) return null;
  return <span title={`Deleted automatically ${DOC_RETENTION_DAYS} days after the customer last opens it (or ${DOC_RETENTION_DAYS} days after it was made, if never opened).`}
    className={'inline-flex items-center gap-1 text-xs ' + (note.soon ? 'font-semibold text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400')}>
    <i className="fa-solid fa-hourglass-half" aria-hidden="true" />{note.label}
  </span>;
};

const SOURCE_BADGE: Record<DocLinkSource, string> = {
  'command-center': 'bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-200',
  'staff-dashboard': 'bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-200',
  sms: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200',
};

/**
 * What the customer's phone shows when the link is texted: the same picture
 * every SMS Command Center document link uses, with the page's title under it.
 */
const TextMessagePreview: React.FC<{ fileName: string }> = ({ fileName }) => <figure className="m-0 min-w-0">
  <figcaption className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">When texted, their phone shows</figcaption>
  <div className="max-w-[22rem] overflow-hidden rounded-2xl border border-slate-200 bg-[#e9e9eb] shadow-sm dark:border-white/15 dark:bg-white/10">
    <img src={TEXT_PREVIEW_IMAGE} alt="Bill Layne Insurance — Your insurance documents are ready. View, download, review." width={960} height={504}
      className="block aspect-[1731/909] h-auto w-full object-cover" />
    <div className="px-3.5 py-2.5">
      <p className="m-0 line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900 dark:text-white">{previewLinkTitle(fileName)}</p>
      <p className="m-0 mt-0.5 text-xs text-slate-500 dark:text-slate-400">docs.billlayneinsurance.com</p>
    </div>
  </div>
  <p className="m-0 mt-2 text-xs text-slate-500 dark:text-slate-400">The same picture as document links sent from the SMS Command Center.</p>
</figure>;

/** A faithful miniature of the docs.billlayneinsurance.com preview page hero. */
const CustomerPreview: React.FC<{ fileName: string; hasFile: boolean }> = ({ fileName, hasFile }) => {
  const kind = previewTypeForFileName(fileName);
  return <figure className="m-0 min-w-0">
    <div className="overflow-hidden rounded-2xl border-t-4 border-[#d97706] p-5 shadow-lg" style={{ background: 'linear-gradient(135deg, #0a1f44 0%, #1e3a8a 100%)' }}>
      <div className="mb-4 flex w-fit items-center gap-2 rounded-lg border border-[#d97706]/60 bg-black/30 px-2.5 py-1.5">
        <span className="grid h-6 w-6 place-items-center rounded bg-gradient-to-br from-[#f59e0b] to-[#d97706] text-[11px] font-black text-[#0a1f44]">BL</span>
        <span className="text-[11px] font-extrabold uppercase leading-tight tracking-wide text-white">Bill Layne<br /><span className="text-[#f59e0b]">Insurance</span></span>
      </div>
      <p className="m-0 mb-2 inline-block rounded-full bg-[#d97706]/20 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#fbbf24]">{kind}</p>
      <p className="m-0 font-outfit text-xl font-extrabold leading-tight text-white">Your {kind} is ready</p>
      <p className="m-0 mt-3 flex min-w-0 items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs text-slate-100">
        <i className="fa-regular fa-file text-[#fbbf24]" aria-hidden="true" />
        <span className="truncate">{hasFile ? fileName : 'your-document.pdf'}</span>
      </p>
      <div className="mt-3 flex gap-2" aria-hidden="true">
        <span className="flex-1 rounded-lg bg-gradient-to-r from-[#f59e0b] to-[#d97706] px-3 py-2 text-center text-xs font-bold text-[#0a1f44]">Open Document</span>
        <span className="rounded-lg border border-white/25 px-3 py-2 text-xs font-bold text-white">Save</span>
        <span className="rounded-lg border border-white/25 px-3 py-2 text-xs font-bold text-white">Share</span>
      </div>
    </div>
    <figcaption className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
      When they tap it: the branded page, then the document itself, a Download button, and Call / Text / Message. The headline comes from the file name.
    </figcaption>
  </figure>;
};

const DocumentLinksCard: React.FC<DocumentLinksCardProps> = ({ addToast, active = true }) => {
  const [tab, setTab] = useState<'create' | 'library'>('create');
  // --- create form ---
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [typeId, setTypeId] = useState<DocTypeId>('general');
  const [customer, setCustomer] = useState('');
  const [fileName, setFileName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [created, setCreated] = useState<{ item: DocLinkItem; typeId: DocTypeId; customer: string; file: File } | null>(null);
  // Gold Elite Gmail drafts (Command Center only -- the server decides via canGmailDraft).
  const [canGmailDraft, setCanGmailDraft] = useState(false);
  const [emailTarget, setEmailTarget] = useState<DocEmailTarget | null>(null);
  const [message, setMessage] = useState('');
  // --- library ---
  const [library, setLibrary] = useState<DocLinkItem[]>([]);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryProgress, setLibraryProgress] = useState(0);
  const [libraryError, setLibraryError] = useState('');
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [visibleCount, setVisibleCount] = useState(40);
  const [views, setViews] = useState<Record<string, DocViewStats | null>>({});
  // --- delete (Command Center only; the server says whether this dashboard may) ---
  const [canDelete, setCanDelete] = useState(false);
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('any');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [bulkError, setBulkError] = useState('');
  const [viewsLoading, setViewsLoading] = useState<Record<string, boolean>>({});
  // --- clipboard ---
  const [copyState, setCopyState] = useState<{ value: string; error: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadRequest = useRef<AbortController | null>(null);
  const libraryRequest = useRef<AbortController | null>(null);
  const requestedViews = useRef<Set<string>>(new Set());
  const recentlyDeleted = useRef<Map<string, number>>(new Map());
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; uploadRequest.current?.abort(); libraryRequest.current?.abort(); }, []);

  const extension = file ? extensionOf(file.name) : '';
  const finalName = file ? finalizeFileName(fileName || file.name, extension ? '.' + extension : '') : '';

  // Keep the customer-facing name in step with type + customer until Bill edits it himself.
  useEffect(() => {
    if (file && !nameTouched) setFileName(suggestFileName(file.name, customer, typeId));
  }, [file, customer, typeId, nameTouched]);

  const chooseFile = (next: File | undefined | null) => {
    if (!next || creating) return;
    const problem = validateDocFile(next);
    setCreateError('');
    if (problem) { setFileError(problem); return; }
    setFileError(''); setFile(next); setNameTouched(false); setTypeId(guessDocType(next.name));
  };
  const clearForm = () => {
    setFile(null); setFileError(''); setCustomer(''); setTypeId('general'); setFileName(''); setNameTouched(false);
    setCreateError(''); setCreated(null); setMessage(''); setCopyState(null);
  };

  const copyText = useCallback(async (value: string, success: string) => {
    setCopyState(null);
    try {
      await navigator.clipboard.writeText(value);
      if (mounted.current) { setCopyState({ value, error: false, message: success }); addToast(success, 'success'); }
      return true;
    } catch {
      if (mounted.current) setCopyState({ value, error: true, message: 'Clipboard access failed. Select the text below and copy it manually.' });
      return false;
    }
  }, [addToast]);

  const loadViews = useCallback(async (ids: string[], force = false) => {
    const wanted = ids.filter(id => force || !requestedViews.current.has(id));
    if (!wanted.length) return;
    wanted.forEach(id => requestedViews.current.add(id));
    setViewsLoading(prev => ({ ...prev, ...Object.fromEntries(wanted.map(id => [id, true])) }));
    try {
      const stats = await fetchDocViews(wanted);
      if (mounted.current) setViews(prev => ({ ...prev, ...Object.fromEntries(wanted.map(id => [id, stats[id] || null])) }));
    } catch {
      wanted.forEach(id => requestedViews.current.delete(id)); // allow a later retry
    } finally {
      if (mounted.current) setViewsLoading(prev => { const next = { ...prev }; wanted.forEach(id => delete next[id]); return next; });
    }
  }, []);

  const loadLibrary = useCallback(async (refresh = false) => {
    libraryRequest.current?.abort();
    const controller = new AbortController();
    libraryRequest.current = controller;
    setLibraryLoading(true); setLibraryError(''); setLibraryProgress(0);
    if (refresh) { requestedViews.current.clear(); setViews({}); }
    try {
      const { items, canDelete: allowed, canGmailDraft: draftsAllowed } = await listAllDocLinks(controller.signal, count => { if (mounted.current) setLibraryProgress(count); });
      if (!mounted.current || controller.signal.aborted) return;
      const now = Date.now();
      recentlyDeleted.current.forEach((at, id) => { if (now - at > DELETE_SETTLE_MS) recentlyDeleted.current.delete(id); });
      setLibrary(items.filter(item => !recentlyDeleted.current.has(item.shortId)));
      setLibraryLoaded(true); setCanDelete(allowed); setCanGmailDraft(draftsAllowed);
    } catch (error) {
      if (!isAbort(error) && mounted.current) setLibraryError(errorText(error));
    } finally {
      if (libraryRequest.current === controller) { libraryRequest.current = null; if (mounted.current) setLibraryLoading(false); }
    }
  }, []);

  // Load the library the first time the Docs workspace is opened (for the tab count and search).
  useEffect(() => {
    if (active && !libraryLoaded && !libraryLoading && !libraryError) void loadLibrary();
  }, [active, libraryLoaded, libraryLoading, libraryError, loadLibrary]);

  const ageDays = AGE_FILTERS.find(filter => filter.id === ageFilter)?.days || 0;
  const matches = useMemo(() => library.filter(item => (sourceFilter === 'all' || item.source === sourceFilter)
    && isOlderThan(item, ageDays) && matchesDocQuery(item, query)), [library, sourceFilter, ageDays, query]);
  const visible = useMemo(() => matches.slice(0, visibleCount), [matches, visibleCount]);
  useEffect(() => { setVisibleCount(40); }, [query, sourceFilter, ageFilter]);
  // Receipts only for rows actually on screen.
  useEffect(() => {
    if (active && tab === 'library' && visible.length) void loadViews(visible.map(item => item.shortId));
  }, [active, tab, visible, loadViews]);

  const handleCreate = async () => {
    if (!file || creating) return;
    const controller = new AbortController();
    uploadRequest.current = controller;
    setCreating(true); setCreateError(''); setCopyState(null);
    try {
      const upload = new File([file], finalName, { type: file.type });
      const person = tidyCustomerName(customer);
      const item = await createDocLink(upload, person, controller.signal);
      if (!mounted.current) return;
      setCreated({ item, typeId, customer: person, file: upload });
      setMessage(buildCustomerMessage(typeId, person, item.url));
      setLibrary(prev => [item, ...prev.filter(existing => existing.shortId !== item.shortId)]);
      setViews(prev => ({ ...prev, [item.shortId]: null }));
      requestedViews.current.add(item.shortId);
      try {
        await navigator.clipboard.writeText(item.url);
        setCopyState({ value: item.url, error: false, message: 'Link created and copied to your clipboard.' });
        addToast('Document link created and copied.', 'success');
      } catch {
        addToast('Document link created.', 'success');
      }
    } catch (error) {
      if (!mounted.current) return;
      setCreateError(isAbort(error)
        ? 'Upload cancelled here. If it had already reached the server, the link may still appear in the Library; check there before retrying.'
        : errorText(error));
    } finally {
      if (uploadRequest.current === controller) { uploadRequest.current = null; if (mounted.current) setCreating(false); }
    }
  };

  const openGmail = (subject: string, body: string) => window.open(gmailComposeUrl(subject, body), '_blank', 'noopener,noreferrer');

  const recentActivity = (id: string) => {
    const last = lastCustomerActivity(views[id]);
    return last && Date.now() - Date.parse(last) < RECENT_MS ? last : null;
  };
  const removeFromLibrary = (ids: string[]) => {
    const gone = new Set(ids);
    ids.forEach(id => recentlyDeleted.current.set(id, Date.now()));
    setLibrary(prev => prev.filter(item => !gone.has(item.shortId)));
    setSelected(prev => prev.filter(id => !gone.has(id)));
    setViews(prev => { const next = { ...prev }; ids.forEach(id => delete next[id]); return next; });
  };
  const deleteOne = async (item: DocLinkItem) => {
    const id = item.shortId;
    setDeletingIds(prev => ({ ...prev, [id]: true }));
    setDeleteErrors(prev => { const next = { ...prev }; delete next[id]; return next; });
    try {
      await deleteDocLink(id);
      if (!mounted.current) return;
      removeFromLibrary([id]);
      setConfirmDeleteId(null);
      addToast(`Deleted ${item.fileName}.`, 'success');
    } catch (error) {
      if (mounted.current) setDeleteErrors(prev => ({ ...prev, [id]: errorText(error) }));
    } finally {
      if (mounted.current) setDeletingIds(prev => { const next = { ...prev }; delete next[id]; return next; });
    }
  };
  // Four at a time; failures stay selected so one click retries just those.
  const deleteSelected = async () => {
    const ids = [...selected];
    if (!ids.length || bulkProgress) return;
    setBulkError('');
    setBulkProgress({ done: 0, total: ids.length });
    const removed: string[] = [];
    const failed: string[] = [];
    let next = 0;
    let done = 0;
    const work = async () => {
      while (next < ids.length) {
        const id = ids[next++];
        try { await deleteDocLink(id); removed.push(id); } catch { failed.push(id); }
        done += 1;
        if (mounted.current) setBulkProgress({ done, total: ids.length });
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, ids.length) }, work));
    if (!mounted.current) return;
    removeFromLibrary(removed);
    setBulkProgress(null);
    if (failed.length) {
      setSelected(failed);
      setBulkError(`${failed.length} of ${ids.length} could not be deleted and are still selected. Retry, or Cancel.`);
      addToast(`Deleted ${removed.length}; ${failed.length} need a retry.`, 'warning');
    } else {
      setBulkConfirm(false);
      setSelectMode(false);
      addToast(`Deleted ${removed.length} document link${removed.length === 1 ? '' : 's'}.`, 'success');
    }
  };
  const toggleSelected = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);

  const renderRow = (item: DocLinkItem) => {
    const kind = previewTypeForFileName(item.fileName);
    const typeForEmail = guessDocType(item.fileName);
    const id = item.shortId;
    const isSelected = selected.includes(id);
    const deleting = Boolean(deletingIds[id]);
    const recent = recentActivity(id);
    return <article key={id} className={'flex min-w-0 flex-col gap-2 border-b border-slate-200 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 dark:border-white/10' + (isSelected ? ' bg-sky-50/70 dark:bg-sky-400/5' : '')}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {selectMode && <input type="checkbox" checked={isSelected} onChange={() => toggleSelected(id)} aria-label={'Select ' + item.fileName}
          className="mt-3 h-4 w-4 shrink-0 cursor-pointer accent-[#003f87]" />}
        <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white dark:border-white/15 dark:bg-white/5">
          <i className={'fa-solid text-lg ' + fileIcon(item.contentType || item.fileName)} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <a href={staffTestUrl(item.url)} target="_blank" rel="noopener noreferrer" title={'Open ' + item.fileName + ' (test views are not counted)'}
            className="block truncate text-sm font-semibold text-slate-900 hover:underline dark:text-white">{item.fileName}</a>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            {item.customer && <span className="font-semibold text-slate-700 dark:text-slate-200">{item.customer}</span>}
            <span>{kind.charAt(0).toUpperCase() + kind.slice(1)}</span>
            <span>{formatWhen(item.createdAt, false)}</span>
            {item.size ? <span>{formatBytes(item.size)}</span> : null}
            <span className={'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ' + SOURCE_BADGE[item.source]}>
              {sourceLabel(item.source)}
            </span>
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <ReceiptPill stats={views[item.shortId]} loading={viewsLoading[item.shortId]} />
            <AutoDeleteNote item={item} stats={views[item.shortId]} />
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5 pl-[3.25rem] sm:pl-0">
        <button type="button" className={buttonClass} onClick={() => void copyText(item.url, 'Document link copied.')} title={'Copy link for ' + item.fileName}>
          <i className="fa-solid fa-copy" aria-hidden="true" />Copy
        </button>
        <a className={buttonClass} href={staffTestUrl(item.url)} target="_blank" rel="noopener noreferrer" title="Open the customer page (your test views are not counted)">
          <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />Open
        </a>
        <button type="button" className={buttonClass} title="Start a Gmail message with this link"
          onClick={() => canGmailDraft
            ? setEmailTarget({ item })
            : openGmail(emailSubject(typeForEmail), buildCustomerMessage(typeForEmail, item.customer || '', item.url))}>
          <i className="fa-solid fa-envelope" aria-hidden="true" />Email
        </button>
        {canDelete && !selectMode && <button type="button" className={dangerClass} title={'Delete ' + item.fileName + ' permanently'}
          aria-expanded={confirmDeleteId === id} onClick={() => setConfirmDeleteId(current => current === id ? null : id)}>
          <i className="fa-solid fa-trash-can" aria-hidden="true" />Delete
        </button>}
      </div>
      {confirmDeleteId === id && !selectMode && <div role="alertdialog" aria-label={'Confirm deleting ' + item.fileName} className={confirmBoxClass + ' sm:basis-full'}>
        <p className="m-0 font-semibold">Delete this document permanently?</p>
        <p className="m-0 mt-1">The file is removed, and anyone who opens the link will see &ldquo;This document is no longer available&rdquo; with your phone number. This can&rsquo;t be undone.</p>
        {recent && <p className="m-0 mt-2 font-semibold"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> The customer last opened it {formatWhen(recent)} &mdash; make sure they no longer need it.</p>}
        {deleteErrors[id] && <p role="alert" className="m-0 mt-2 font-semibold">{deleteErrors[id]}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" autoFocus className={buttonClass + ' bg-white dark:bg-transparent'} disabled={deleting} onClick={() => setConfirmDeleteId(null)}>Cancel</button>
          <button type="button" className={dangerSolidClass} disabled={deleting} onClick={() => void deleteOne(item)}>
            <i className={'fa-solid ' + (deleting ? 'fa-spinner fa-spin' : 'fa-trash-can')} aria-hidden="true" />{deleting ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>}
    </article>;
  };

  const tabs = [
    { id: 'create' as const, label: 'Create Link', icon: 'fa-cloud-arrow-up' },
    { id: 'library' as const, label: libraryLoaded ? `Library (${library.length})` : 'Library', icon: 'fa-folder-open' },
  ];

  return <section aria-label="Document Links" className="min-w-0 border-b border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5 sm:p-5">
    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 font-outfit text-lg font-bold text-slate-900 dark:text-white"><i className="fa-solid fa-file-shield text-[#0076d3]" aria-hidden="true" />Document Links</h2>
    </div>
    <p className="mb-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300">Upload a PDF, Word file or photo and get a branded link that opens on any phone or computer. Paste it into an email or a text — no SMS conversation needed.</p>

    <div role="tablist" aria-label="Document Links" className="mb-4 flex gap-1 border-b border-slate-200 pb-2 dark:border-white/10">
      {tabs.map(item => <button key={item.id} id={'doc-tab-' + item.id} role="tab" type="button" aria-selected={tab === item.id} aria-controls={'doc-panel-' + item.id}
        tabIndex={tab === item.id ? 0 : -1} className={tab === item.id ? primaryClass : buttonClass}
        onKeyDown={event => {
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const next = event.key === 'Home' ? 'create' : event.key === 'End' ? 'library' : tab === 'create' ? 'library' : 'create';
            setTab(next); document.getElementById('doc-tab-' + next)?.focus();
          }
        }} onClick={() => setTab(item.id)}><i className={'fa-solid ' + item.icon} aria-hidden="true" />{item.label}</button>)}
    </div>

    {tab === 'create' && <div role="tabpanel" id="doc-panel-create" aria-labelledby="doc-tab-create" className="min-w-0">
      {created ? <div className="min-w-0 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-400/30 dark:bg-emerald-400/5">
        <p className="m-0 flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-200"><i className="fa-solid fa-circle-check" aria-hidden="true" />Your link is ready</p>
        <p className="m-0 mt-1 truncate text-xs text-slate-600 dark:text-slate-300" title={created.item.fileName}>{created.item.fileName}{created.customer ? ` · ${created.customer}` : ''}</p>
        <div className="mt-3 flex min-w-0 gap-2">
          <input aria-label="Document link" readOnly value={created.item.url} onFocus={event => event.target.select()} className={fieldClass + ' flex-1 !text-sm font-semibold'} />
          <button type="button" className={primaryClass + ' !min-h-11'} onClick={() => void copyText(created.item.url, 'Document link copied.')}><i className="fa-solid fa-copy" aria-hidden="true" />Copy Link</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a className={buttonClass} href={staffTestUrl(created.item.url)} target="_blank" rel="noopener noreferrer" title="Opens the customer page. Your own test views are not counted.">
            <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />Test Link
          </a>
          <button type="button" className={canGmailDraft ? primaryClass : buttonClass}
            title={canGmailDraft ? 'Gold Elite Gmail draft with the document attached' : 'Open a Gmail message with the link'}
            onClick={() => canGmailDraft
              ? setEmailTarget({ item: created.item, typeId: created.typeId, customer: created.customer, file: created.file })
              : openGmail(emailSubject(created.typeId), message)}>
            <i className="fa-solid fa-envelope" aria-hidden="true" />Email in Gmail
          </button>
          <button type="button" className={buttonClass} onClick={() => void copyText(message, 'Message copied.')}><i className="fa-solid fa-message" aria-hidden="true" />Copy Message</button>
          <button type="button" className={buttonClass} onClick={() => void loadViews([created.item.shortId], true)} title="Check whether the customer has opened it"><i className="fa-solid fa-rotate" aria-hidden="true" />Check Receipt</button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <ReceiptPill stats={views[created.item.shortId]} loading={viewsLoading[created.item.shortId]} />
          <span className="text-xs text-slate-500 dark:text-slate-400">Deletes automatically {DOC_RETENTION_DAYS} days after the customer last opens it.</span>
        </div>
        <label htmlFor="doc-message" className={labelClass + ' mt-4'}>Message to send with the link <span className="font-normal text-slate-500">(edit before emailing or copying)</span></label>
        <textarea id="doc-message" rows={8} value={message} onChange={event => setMessage(event.target.value)} className={fieldClass + ' !text-sm leading-relaxed'} />
        <button type="button" className={primaryClass + ' mt-4'} onClick={clearForm}><i className="fa-solid fa-plus" aria-hidden="true" />Create Another Link</button>
      </div> : <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="min-w-0">
          <div onDragOver={event => { event.preventDefault(); if (!creating) setDragActive(true); }} onDragLeave={() => setDragActive(false)}
            onDrop={event => { event.preventDefault(); setDragActive(false); chooseFile(event.dataTransfer.files[0]); }}
            className={'min-w-0 rounded-xl border-2 border-dashed p-4 transition-colors ' + (dragActive ? 'border-sky-500 bg-sky-50 dark:bg-sky-500/10' : 'border-slate-200 dark:border-white/20')}>
            {file ? <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white dark:border-white/15 dark:bg-white/5"><i className={'fa-solid text-xl ' + fileIcon(file.type || file.name)} aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-sm font-semibold text-slate-900 dark:text-white" title={file.name}>{file.name}</p>
                <p className="m-0 text-xs text-slate-500 dark:text-slate-400">{formatBytes(file.size)} · original file</p>
              </div>
              <button type="button" className={buttonClass} disabled={creating} onClick={() => fileInputRef.current?.click()}>Change</button>
              <button type="button" className={buttonClass + ' !w-9 !px-0'} disabled={creating} aria-label="Remove file" title="Remove file" onClick={() => { setFile(null); setFileName(''); setNameTouched(false); }}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
            </div> : <div className="flex flex-col items-center gap-2 py-4 text-center">
              <i className="fa-solid fa-file-arrow-up text-3xl text-[#0076d3]" aria-hidden="true" />
              <p className="m-0 text-sm font-semibold text-slate-800 dark:text-slate-100">Drop a PDF, Word file or photo here</p>
              <p className="m-0 text-xs text-slate-500 dark:text-slate-400">PDF · Word · JPG · PNG · GIF · WebP — up to 15{' '}MB</p>
              <button type="button" className={primaryClass + ' mt-1'} onClick={() => fileInputRef.current?.click()}><i className="fa-solid fa-plus" aria-hidden="true" />Choose File</button>
            </div>}
            <input ref={fileInputRef} type="file" className="hidden" accept={DOC_ACCEPT} aria-label="Choose a document to share"
              onChange={event => { const next = event.target.files?.[0]; event.target.value = ''; chooseFile(next); }} />
          </div>
          {fileError && <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">{fileError}</p>}

          <fieldset className="mt-5 min-w-0 border-0 p-0" disabled={creating}>
            <legend className={labelClass}>Document type</legend>
            <div className="flex flex-wrap gap-1.5">
              {DOC_TYPES.map(type => <button key={type.id} type="button" aria-pressed={typeId === type.id} onClick={() => setTypeId(type.id)}
                className={typeId === type.id ? primaryClass : buttonClass}>{type.label}</button>)}
            </div>
          </fieldset>

          <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="doc-customer" className={labelClass}>Customer name <span className="font-normal text-slate-500">(optional)</span></label>
              <input id="doc-customer" value={customer} maxLength={80} disabled={creating} autoComplete="off" placeholder="e.g. Roy Meyreles"
                onChange={event => setCustomer(event.target.value)} className={fieldClass} />
            </div>
            <div className="min-w-0">
              <label htmlFor="doc-filename" className={labelClass}>File name your customer sees</label>
              <input id="doc-filename" value={fileName} maxLength={90} disabled={!file || creating} placeholder="Choose a file first"
                onChange={event => { setFileName(event.target.value); setNameTouched(true); }} className={fieldClass} />
              {file && <p className="m-0 mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="truncate">Saved as {finalName}</span>
                {nameTouched && <button type="button" className="font-semibold text-[#0076d3] hover:underline" onClick={() => setNameTouched(false)}>Reset</button>}
                {file.name !== finalName && <button type="button" className="font-semibold text-[#0076d3] hover:underline" onClick={() => { setFileName(file.name); setNameTouched(true); }}>Use original name</button>}
              </p>}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button type="button" className={primaryClass + ' !min-h-11 !px-5 !text-sm'} disabled={!file || creating} onClick={() => void handleCreate()}>
              <i className={'fa-solid ' + (creating ? 'fa-spinner fa-spin' : 'fa-link')} aria-hidden="true" />{creating ? 'Creating link…' : 'Create Link'}
            </button>
            {creating && <button type="button" className={buttonClass} onClick={() => uploadRequest.current?.abort()}>Cancel</button>}
            {!file && !creating && <span className="text-xs text-slate-500 dark:text-slate-400">Choose a file to create a link.</span>}
          </div>
          {createError && <div role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">
            <p className="m-0">{createError}</p>
            {file && <button type="button" className={buttonClass + ' mt-2'} disabled={creating} onClick={() => void handleCreate()}><i className="fa-solid fa-rotate-right" aria-hidden="true" />Retry</button>}
          </div>}
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <TextMessagePreview fileName={finalName || 'your-document.pdf'} />
          <CustomerPreview fileName={finalName || 'your-document.pdf'} hasFile={Boolean(file)} />
        </div>
      </div>}
    </div>}

    {tab === 'library' && <div role="tabpanel" id="doc-panel-library" aria-labelledby="doc-tab-library" className="min-w-0">
      <label htmlFor="doc-library-query" className={labelClass}>Search every document link</label>
      <div className="flex min-w-0 gap-2">
        <input id="doc-library-query" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Customer, file name or document type" className={fieldClass + ' flex-1'} />
        <button type="button" className={buttonClass} disabled={libraryLoading} title="Refresh the library and receipts" aria-label="Refresh the library and receipts" onClick={() => void loadLibrary(true)}><i className={'fa-solid fa-rotate' + (libraryLoading ? ' fa-spin' : '')} aria-hidden="true" /></button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Where the link was created">
        {[{ id: 'all' as SourceFilter, label: 'All' }, ...DOC_LINK_SOURCES].map(({ id, label }) =>
          <button key={id} type="button" aria-pressed={sourceFilter === id} onClick={() => setSourceFilter(id)} className={sourceFilter === id ? primaryClass : buttonClass}>{label}</button>)}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="How old">
        {AGE_FILTERS.map(filter => <button key={filter.id} type="button" aria-pressed={ageFilter === filter.id} onClick={() => setAgeFilter(filter.id)}
          className={ageFilter === filter.id ? primaryClass : buttonClass}>{filter.label}</button>)}
      </div>
      <p className="my-2 text-xs text-slate-500 dark:text-slate-400" role="status" aria-live="polite">
        {libraryLoading ? `Loading document links… ${libraryProgress}` : libraryLoaded ? `${matches.length} of ${library.length} document links` : 'Library not loaded'}
      </p>
      <p className="-mt-1 mb-2 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <i className="fa-solid fa-hourglass-half mt-0.5" aria-hidden="true" />
        <span>Automatic cleanup: a document is deleted {DOC_RETENTION_DAYS} days after the customer last opens it, or {DOC_RETENTION_DAYS} days after it was made if it is never opened.</span>
      </p>
      {libraryError && <div role="alert" className="my-2 text-sm text-rose-700 dark:text-rose-300"><p className="m-0">{libraryError}</p>
        <button type="button" className={buttonClass + ' mt-2'} disabled={libraryLoading} onClick={() => void loadLibrary(true)}><i className="fa-solid fa-rotate-right" aria-hidden="true" />Retry</button></div>}
      {canDelete && libraryLoaded && library.length > 0 && <div className="mb-2 flex flex-wrap items-center gap-2">
        <button type="button" className={selectMode ? primaryClass : buttonClass} aria-pressed={selectMode}
          onClick={() => { setSelectMode(mode => !mode); setSelected([]); setBulkConfirm(false); setBulkError(''); setConfirmDeleteId(null); }}>
          <i className={'fa-solid ' + (selectMode ? 'fa-check' : 'fa-list-check')} aria-hidden="true" />{selectMode ? 'Done' : 'Select to delete'}
        </button>
        {selectMode && <>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{selected.length} selected</span>
          <button type="button" className={buttonClass} disabled={!matches.length || Boolean(bulkProgress)}
            onClick={() => setSelected(prev => [...new Set([...prev, ...matches.map(item => item.shortId)])])}>Select all {matches.length} shown</button>
          {selected.length > 0 && <button type="button" className={buttonClass} disabled={Boolean(bulkProgress)} onClick={() => setSelected([])}>Clear</button>}
          <button type="button" className={dangerClass} disabled={!selected.length || Boolean(bulkProgress)} onClick={() => setBulkConfirm(true)}>
            <i className="fa-solid fa-trash-can" aria-hidden="true" />Delete selected ({selected.length})
          </button>
        </>}
      </div>}
      {bulkConfirm && selectMode && (() => {
        const chosen = library.filter(item => selected.includes(item.shortId));
        const recentCount = chosen.filter(item => recentActivity(item.shortId)).length;
        return <div role="alertdialog" aria-labelledby="doc-bulk-title" className={confirmBoxClass + ' mb-3'}>
          <p id="doc-bulk-title" className="m-0 font-semibold">Permanently delete {selected.length} document link{selected.length === 1 ? '' : 's'}?</p>
          <p className="m-0 mt-1">Each file is removed, and anyone who opens one of these links will see &ldquo;This document is no longer available.&rdquo; This can&rsquo;t be undone.</p>
          <ul className="m-0 mt-2 list-disc pl-5 text-xs">
            {chosen.slice(0, 5).map(item => <li key={item.shortId} className="truncate">{item.fileName}</li>)}
            {chosen.length > 5 && <li>&hellip;and {chosen.length - 5} more</li>}
          </ul>
          {recentCount > 0 && <p className="m-0 mt-2 font-semibold"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {recentCount} of these {recentCount === 1 ? 'was' : 'were'} opened by a customer in the last 30 days.</p>}
          {bulkProgress && <p role="status" className="m-0 mt-2">Deleting {bulkProgress.done} of {bulkProgress.total}&hellip;</p>}
          {bulkError && <p role="alert" className="m-0 mt-2 font-semibold">{bulkError}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" autoFocus className={buttonClass + ' bg-white dark:bg-transparent'} disabled={Boolean(bulkProgress)} onClick={() => { setBulkConfirm(false); setBulkError(''); }}>Cancel</button>
            <button type="button" className={dangerSolidClass} disabled={Boolean(bulkProgress) || !selected.length} onClick={() => void deleteSelected()}>
              <i className={'fa-solid ' + (bulkProgress ? 'fa-spinner fa-spin' : 'fa-trash-can')} aria-hidden="true" />{bulkProgress ? 'Deleting…' : `Delete ${selected.length} permanently`}
            </button>
          </div>
        </div>;
      })()}
      {libraryLoaded && <div className="max-h-[38rem] min-w-0 overflow-y-auto overscroll-contain pr-1 custom-scrollbar" aria-label="Document links">
        {visible.map(renderRow)}
        {!matches.length && <p className="py-6 text-sm text-slate-500 dark:text-slate-400">{library.length ? 'No document links match this search.' : 'No document links yet. Create one from the Create Link tab.'}</p>}
        {matches.length > visibleCount && <button type="button" className={buttonClass + ' my-3'} onClick={() => setVisibleCount(count => count + 40)}>Show More ({matches.length - visibleCount})<i className="fa-solid fa-chevron-down" aria-hidden="true" /></button>}
      </div>}
    </div>}

    {copyState && <div className="mt-3 min-w-0 border-t border-slate-200 pt-3 dark:border-white/10">
      <p role={copyState.error ? 'alert' : 'status'} className={'m-0 text-sm ' + (copyState.error ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300')}>{copyState.message}</p>
      {copyState.error && <textarea readOnly aria-label="Text to copy manually" rows={copyState.value.includes('\n') ? 6 : 1} value={copyState.value}
        onFocus={event => event.target.select()} className={fieldClass + ' mt-2 !text-xs'} />}
    </div>}
    <DocEmailDialog target={emailTarget} onClose={() => setEmailTarget(null)} addToast={addToast} />
  </section>;
};

export default DocumentLinksCard;
