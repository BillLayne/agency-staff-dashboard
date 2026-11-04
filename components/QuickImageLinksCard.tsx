import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LOCAL_STORAGE_HISTORY_KEY } from '../constants';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  IMAGE_PRESETS, checkAccessCode, getAccessCode, getCachedHostedImages,
  listAllHostedImages, setAccessCode, uploadImage, validateImage,
} from '../services/imageHostService';
import type { ImageHostLibraryItem, ImagePresetId } from '../services/imageHostService';
import type { HistoryItem, ToastMessage } from '../types';

interface QuickImageLinksCardProps {
  addToast: (message: string, type?: ToastMessage['type']) => void;
  active?: boolean;
}
type RecentImage = HistoryItem & { size?: number; contentType?: string };
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'The image host could not be reached. Please retry.';
const formatDate = (value: string | number) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
};
const buttonClass = 'inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10';
const primaryClass = buttonClass + ' bg-[#003f87] !text-white hover:!bg-[#0076d3] dark:hover:!bg-[#0076d3]';
const fieldClass = 'w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60 dark:border-white/20 dark:bg-white/5 dark:text-white';

const QuickImageLinksCard: React.FC<QuickImageLinksCardProps> = ({ addToast, active = true }) => {
  const [history, setHistory] = useLocalStorage<RecentImage[]>(LOCAL_STORAGE_HISTORY_KEY, []);
  const [view, setView] = useState<'upload' | 'library'>('library');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [latestLink, setLatestLink] = useState('');
  const [copyingLink, setCopyingLink] = useState('');
  const [copyState, setCopyState] = useState<{ link: string; error: boolean; message: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [hasAccessCode, setHasAccessCode] = useState(() => Boolean(getAccessCode()));
  const [codeDraft, setCodeDraft] = useState('');
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [authError, setAuthError] = useState('');
  const [presetId, setPresetId] = useLocalStorage<ImagePresetId>('quick-image-preset', 'gmail');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [libraryImages, setLibraryImages] = useState<ImageHostLibraryItem[]>(() => getCachedHostedImages() || []);
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(() => getCachedHostedImages() !== null);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState('');
  const [progress, setProgress] = useState({ count: 0, pages: 0 });
  const [visibleCount, setVisibleCount] = useState(60);
  const [dimensions, setDimensions] = useState<Record<string, { width: number; height: number }>>({});
  const [brokenPreviews, setBrokenPreviews] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const libraryRequest = useRef<AbortController | null>(null);
  const uploadRequest = useRef<AbortController | null>(null);
  const authRequest = useRef<AbortController | null>(null);
  const retryFile = useRef<File | null>(null);
  const copyPending = useRef(false);
  const mounted = useRef(true);
  const activePreset = IMAGE_PRESETS.find(preset => preset.id === presetId) || IMAGE_PRESETS[0];
  const recentUploads = useMemo(() => (Array.isArray(history) ? history : []).filter(item => item && typeof item.link === 'string').slice(0, 25), [history]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      libraryRequest.current?.abort(); uploadRequest.current?.abort(); authRequest.current?.abort();
    };
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedQuery(libraryQuery); setVisibleCount(60); }, 200);
    return () => clearTimeout(timer);
  }, [libraryQuery]);

  const cancelLibrary = useCallback(() => {
    libraryRequest.current?.abort(); libraryRequest.current = null; setIsLibraryLoading(false);
  }, []);
  const loadLibrary = useCallback(async (forceRefresh = false) => {
    libraryRequest.current?.abort();
    const controller = new AbortController();
    libraryRequest.current = controller;
    setIsLibraryLoading(true); setLibraryError(''); setProgress({ count: 0, pages: 0 });
    try {
      const images = await listAllHostedImages({
        signal: controller.signal, forceRefresh,
        onProgress: (count, pages) => {
          if (mounted.current && !controller.signal.aborted) setProgress({ count, pages });
        },
      });
      if (!mounted.current || controller.signal.aborted || libraryRequest.current !== controller) return;
      setLibraryImages(images); setIsLibraryLoaded(true);
    } catch (error) {
      if (!mounted.current || controller.signal.aborted || libraryRequest.current !== controller) return;
      const message = errorMessage(error);
      if (message.toLowerCase().includes('access code')) { setHasAccessCode(false); setAuthError(message); }
      setLibraryError(message);
    } finally {
      if (libraryRequest.current === controller) {
        libraryRequest.current = null;
        if (mounted.current) setIsLibraryLoading(false);
      }
    }
  }, []);
  useEffect(() => {
    if (!active || !hasAccessCode || view !== 'library') return;
    const timer = window.setTimeout(() => void loadLibrary(), 200);
    return () => { clearTimeout(timer); cancelLibrary(); };
  }, [active, hasAccessCode, view, loadLibrary, cancelLibrary]);

  const libraryMatches = useMemo(() => {
    const terms = debouncedQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return libraryImages.filter(image => {
      const searchable = [image.originalName, image.label, image.key, image.url].filter(Boolean).join(' ').toLowerCase();
      return terms.every(term => searchable.includes(term));
    });
  }, [libraryImages, debouncedQuery]);

  const copyLink = async (link: string) => {
    if (copyPending.current) return;
    copyPending.current = true; setCopyingLink(link); setCopyState(null);
    try {
      await navigator.clipboard.writeText(link);
      if (mounted.current) { setCopyState({ link, error: false, message: 'Image link copied.' }); addToast('Image link copied.', 'success'); }
    } catch {
      if (mounted.current) setCopyState({ link, error: true, message: 'Clipboard access failed. Retry, or select and copy this link manually.' });
    } finally {
      copyPending.current = false;
      if (mounted.current) setCopyingLink('');
    }
  };
  const handleUpload = async (file: File) => {
    if (uploadRequest.current || !hasAccessCode) return;
    setUploadError(''); setUploadSuccess(''); setCopyState(null);
    try { validateImage(file); } catch (error) { retryFile.current = null; setUploadError(errorMessage(error)); return; }
    retryFile.current = file;
    const controller = new AbortController();
    uploadRequest.current = controller; setIsUploading(true);
    try {
      const result = await uploadImage(file, activePreset, controller.signal);
      if (!mounted.current || controller.signal.aborted || uploadRequest.current !== controller) return;
      const newItem: RecentImage = {
        id: crypto.randomUUID(), link: result.url, key: result.key, name: file.name,
        createdAt: Date.now(), groups: [], size: result.size,
      };
      setHistory(prev => [newItem, ...(Array.isArray(prev) ? prev : [])].slice(0, 25));
      setLatestLink(result.url); retryFile.current = null;
      setUploadSuccess('Uploaded successfully: ' + file.name);
      const cached = getCachedHostedImages();
      if (cached) { setLibraryImages(cached); setIsLibraryLoaded(true); }
      else if (isLibraryLoaded) setLibraryImages(prev => [{
        key: result.key, url: result.url, size: result.size,
        uploaded: new Date().toISOString(), originalName: file.name, label: '',
      }, ...prev.filter(image => image.key !== result.key)]);
      addToast('Image uploaded successfully.', 'success');
      // A clipboard denial is not an upload failure.
      await copyLink(result.url);
    } catch (error) {
      if (!mounted.current || controller.signal.aborted || uploadRequest.current !== controller) return;
      const message = errorMessage(error);
      if (message.toLowerCase().includes('access code')) { setHasAccessCode(false); setAuthError(message); }
      setUploadError(message + ' Check the library before retrying if the upload may have reached the host.');
    } finally {
      if (uploadRequest.current === controller) {
        uploadRequest.current = null;
        if (mounted.current) setIsUploading(false);
      }
    }
  };
  const cancelUpload = () => {
    uploadRequest.current?.abort(); uploadRequest.current = null; setIsUploading(false);
    setUploadError('Upload cancelled locally. An upload already received by the host may still finish; check the library before retrying.');
  };
  const handleSaveCode = async () => {
    if (!codeDraft.trim() || authRequest.current) return;
    const controller = new AbortController();
    authRequest.current = controller; setIsSavingCode(true); setAuthError('');
    try {
      if (!(await checkAccessCode(codeDraft.trim(), controller.signal))) throw new Error('Access code rejected. Check the code and retry.');
      if (!mounted.current || controller.signal.aborted) return;
      setAccessCode(codeDraft);
      if (!getAccessCode()) throw new Error('Browser storage is blocked. Allow local storage to keep the access code.');
      setHasAccessCode(true); setCodeDraft(''); setLibraryImages([]); setIsLibraryLoaded(false); setLibraryError('');
    } catch (error) {
      if (mounted.current && !controller.signal.aborted) setAuthError(errorMessage(error));
    } finally {
      if (authRequest.current === controller) { authRequest.current = null; if (mounted.current) setIsSavingCode(false); }
    }
  };

  const renderImage = (image: ImageHostLibraryItem) => {
    const name = image.originalName || image.key.split('/').pop() || 'Hosted image';
    const size = dimensions[image.url] || (image.width && image.height ? { width: image.width, height: image.height } : null);
    const extension = (image.contentType?.split('/')[1] || image.url.split('?')[0].split('.').pop() || '').toUpperCase();
    const metadata = [
      size ? size.width + ' x ' + size.height : '',
      extension.length < 10 ? extension : '',
      image.size ? image.size >= 1024 * 1024 ? (image.size / (1024 * 1024)).toFixed(1) + ' MiB' : Math.ceil(image.size / 1024) + ' KiB' : '',
      formatDate(image.uploaded),
    ].filter(Boolean).join(' | ');
    return <article key={image.key} className="flex min-w-0 items-center gap-3 border-b border-slate-200 py-3 dark:border-white/10">
      <a href={image.url} target="_blank" rel="noopener noreferrer" title={'Open ' + name}
        className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
        {brokenPreviews[image.url] ? <span className="px-1 text-center text-xs text-slate-500">Preview unavailable</span> :
          <img src={image.url} alt={name} loading="lazy" className="h-full w-full object-contain"
            onLoad={event => { const img = event.currentTarget; if (img.naturalWidth) setDimensions(prev => ({ ...prev, [image.url]: { width: img.naturalWidth, height: img.naturalHeight } })); }}
            onError={() => setBrokenPreviews(prev => ({ ...prev, [image.url]: true }))} />}
      </a>
      <div className="min-w-0 flex-1">
        <a href={image.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-semibold text-slate-900 hover:underline dark:text-white" title={name}>{name}</a>
        {image.label && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{image.label}</p>}
        <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">{metadata}</p>
        <p className="mt-1 truncate text-xs text-slate-400" title={image.url}>{image.url}</p>
      </div>
      <button className={buttonClass + ' !h-10 !w-10 !p-0'} disabled={Boolean(copyingLink)} title={'Copy image link for ' + name}
        aria-label={'Copy image link for ' + name} onClick={() => void copyLink(image.url)}>
        <i className={'fa-solid ' + (copyingLink === image.url ? 'fa-spinner fa-spin' : 'fa-copy')} aria-hidden="true" />
      </button>
    </article>;
  };
  return <section aria-label="Quick Image Links" className="min-w-0 border-b border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5 sm:p-5">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 font-outfit text-lg font-bold text-slate-900 dark:text-white"><i className="fa-solid fa-image text-[#0076d3]" aria-hidden="true" />Quick Image Links</h2>
      <a href="https://img.billlayneinsurance.com" target="_blank" rel="noopener noreferrer" className={buttonClass} title="Open image host" aria-label="Open image host"><i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></a>
    </div>
    <div role="tablist" aria-label="Image workspace" className="mb-4 flex gap-1 border-b border-slate-200 pb-2 dark:border-white/10">
      {(['library', 'upload'] as const).map(tab => <button key={tab} id={'image-tab-' + tab} role="tab" aria-selected={view === tab}
        aria-controls={'image-panel-' + tab} tabIndex={view === tab ? 0 : -1} className={view === tab ? primaryClass : buttonClass}
        onKeyDown={event => {
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const next = event.key === 'Home' ? 'library' : event.key === 'End' ? 'upload' : view === 'library' ? 'upload' : 'library';
            setView(next); document.getElementById('image-tab-' + next)?.focus();
          }
        }} onClick={() => setView(tab)}><i className={'fa-solid ' + (tab === 'library' ? 'fa-images' : 'fa-cloud-arrow-up')} aria-hidden="true" />{tab === 'library' ? 'Library' : 'Upload'}</button>)}
    </div>
    {!hasAccessCode ? <form onSubmit={event => { event.preventDefault(); void handleSaveCode(); }} className="max-w-lg">
      <label htmlFor="image-access-code" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Image host access code</label>
      <div className="flex min-w-0 gap-2">
        <input id="image-access-code" type="password" autoComplete="off" value={codeDraft} disabled={isSavingCode} onChange={event => setCodeDraft(event.target.value)} className={fieldClass + ' flex-1'} />
        <button type="submit" className={primaryClass} disabled={!codeDraft.trim() || isSavingCode}><i className={'fa-solid ' + (isSavingCode ? 'fa-spinner fa-spin' : 'fa-unlock')} aria-hidden="true" />Unlock</button>
        {isSavingCode && <button type="button" className={buttonClass} onClick={() => { authRequest.current?.abort(); authRequest.current = null; setIsSavingCode(false); }}>Cancel</button>}
      </div>
      {authError && <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">{authError}</p>}
    </form> : <>
      {view === 'library' && <div role="tabpanel" id="image-panel-library" aria-labelledby="image-tab-library" className="min-w-0">
        <label htmlFor="image-library-query" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Search image library</label>
        <div className="flex min-w-0 gap-2">
          <input id="image-library-query" type="search" value={libraryQuery} onChange={event => setLibraryQuery(event.target.value)}
            placeholder="Filename or label" className={fieldClass + ' flex-1'} />
          <button className={buttonClass} disabled={isLibraryLoading} title="Refresh hosted image library" aria-label="Refresh hosted image library" onClick={() => void loadLibrary(true)}><i className="fa-solid fa-rotate" aria-hidden="true" /></button>
        </div>
        <div className="my-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400" role="status" aria-live="polite">
          <span>{isLibraryLoading ? 'Loading inventory: ' + progress.count + ' images, ' + progress.pages + ' pages'
            : isLibraryLoaded ? libraryMatches.length + ' matches / ' + libraryImages.length + ' hosted images' : 'Library not loaded'}
            {libraryQuery !== debouncedQuery ? ' | Searching...' : ''}</span>
          {isLibraryLoading && <button className={buttonClass} onClick={() => { cancelLibrary(); setLibraryError('Library loading cancelled.'); }}><i className="fa-solid fa-stop" aria-hidden="true" />Cancel</button>}
        </div>
        {libraryError && <div role="alert" className="my-2 text-sm text-rose-700 dark:text-rose-300"><p>{libraryError}</p><button className={buttonClass + ' mt-2'} disabled={isLibraryLoading} onClick={() => void loadLibrary(true)}><i className="fa-solid fa-rotate-right" aria-hidden="true" />Retry</button></div>}
        {isLibraryLoaded && <div aria-label="Hosted image library search results" data-testid="quick-image-library-search-scroll" className="max-h-[34rem] min-w-0 overflow-y-auto overscroll-contain pr-1 custom-scrollbar">
          {libraryMatches.slice(0, visibleCount).map(renderImage)}
          {!libraryMatches.length && <p className="py-6 text-sm text-slate-500 dark:text-slate-400">No hosted images match this search.</p>}
          {libraryMatches.length > visibleCount && <button className={buttonClass + ' my-3'} onClick={() => setVisibleCount(count => count + 60)}>Show More ({libraryMatches.length - visibleCount})<i className="fa-solid fa-chevron-down" aria-hidden="true" /></button>}
        </div>}
      </div>}
      {view === 'upload' && <div role="tabpanel" id="image-panel-upload" aria-labelledby="image-tab-upload" className="min-w-0">
        <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Image format">
          {IMAGE_PRESETS.map(preset => <button key={preset.id} aria-pressed={preset.id === activePreset.id} disabled={isUploading}
            onClick={() => setPresetId(preset.id)} title={preset.hint} className={preset.id === activePreset.id ? primaryClass : buttonClass}><i className={'fa-solid ' + preset.icon} aria-hidden="true" />{preset.label}</button>)}
        </div>
        <div onDragOver={event => { event.preventDefault(); if (!isUploading) setDragActive(true); }} onDragLeave={() => setDragActive(false)}
          onDrop={event => { event.preventDefault(); setDragActive(false); const file = event.dataTransfer.files[0]; if (file && !isUploading) void handleUpload(file); }}
          className={'min-w-0 rounded-lg border-2 border-dashed p-4 ' + (dragActive ? 'border-sky-500 bg-sky-50 dark:bg-sky-500/10' : 'border-slate-200 dark:border-white/20')}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="min-w-0 flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">{isUploading ? 'Uploading image...' : 'JPG, PNG, WebP, GIF, SVG | Up to 30 MiB'}</span>
            <button className={primaryClass} disabled={isUploading} onClick={() => fileInputRef.current?.click()}><i className={'fa-solid ' + (isUploading ? 'fa-spinner fa-spin' : 'fa-plus')} aria-hidden="true" />Choose Image</button>
            {isUploading && <button className={buttonClass} onClick={cancelUpload}>Cancel</button>}
          </div>
          <input ref={fileInputRef} type="file" className="hidden" aria-label="Choose image to upload" disabled={isUploading}
            accept=".jpg,.jpeg,.png,.webp,.gif,.svg" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void handleUpload(file); }} />
        </div>
        {uploadSuccess && <p role="status" className="mt-3 break-words text-sm text-emerald-700 dark:text-emerald-300">{uploadSuccess}</p>}
        {uploadError && <div role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300"><p>{uploadError}</p>{retryFile.current && <button className={buttonClass + ' mt-2'} disabled={isUploading} onClick={() => { if (retryFile.current) void handleUpload(retryFile.current); }}><i className="fa-solid fa-rotate-right" aria-hidden="true" />Retry Upload</button>}</div>}
        {latestLink && <div className="mt-3 flex min-w-0 items-center gap-2">
          <input aria-label="Latest uploaded image link" readOnly value={latestLink} onFocus={event => event.target.select()} className={fieldClass + ' flex-1 !text-xs'} />
          <button className={buttonClass} title="Copy latest image link" aria-label="Copy latest image link" disabled={Boolean(copyingLink)} onClick={() => void copyLink(latestLink)}><i className="fa-solid fa-copy" aria-hidden="true" /></button>
        </div>}
        <h3 className="mt-5 text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Uploads <span className="font-normal text-slate-500">({recentUploads.length})</span></h3>
        <div aria-label="Recent uploaded image links" data-testid="quick-image-recent-uploads-scroll" className="max-h-[26rem] min-w-0 overflow-y-auto overscroll-contain pr-1 custom-scrollbar">
          {recentUploads.map(item => renderImage({ key: item.key || item.id, url: item.link, size: item.size || 0,
            uploaded: new Date(item.createdAt || 0).toISOString(), originalName: item.name, label: '', contentType: item.contentType }))}
          {!recentUploads.length && <p className="py-4 text-sm text-slate-500 dark:text-slate-400">No recent uploads on this browser.</p>}
        </div>
      </div>}
    </>}
    {copyState && <div className="mt-3 min-w-0 border-t border-slate-200 pt-3 dark:border-white/10">
      <p role={copyState.error ? 'alert' : 'status'} className={'text-sm ' + (copyState.error ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300')}>{copyState.message}</p>
      {copyState.error && <div className="mt-2 flex min-w-0 gap-2">
        <input readOnly aria-label="Image link to copy manually" value={copyState.link} onFocus={event => event.target.select()} className={fieldClass + ' flex-1 !text-xs'} />
        <button className={buttonClass} disabled={Boolean(copyingLink)} onClick={() => void copyLink(copyState.link)}><i className="fa-solid fa-copy" aria-hidden="true" />Retry</button>
      </div>}
    </div>}
  </section>;
};
export default QuickImageLinksCard;
