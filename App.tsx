import React, { useCallback, useEffect, useRef, useState } from 'react';
import SearchCard from './components/SearchCard';
import CommandPalette from './components/CommandPalette';
import ProgramLauncher from './components/ProgramLauncher';
import QuickImageLinksCard from './components/QuickImageLinksCard';
import DocumentLinksCard from './components/DocumentLinksCard';
import Toast, { type ToastAction } from './components/Toast';
import Modal from './components/Modal';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { ToastMessage } from './types';

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

interface SearchLog { day: string; count: number }
type Workspace = 'search' | 'tools' | 'images' | 'docs';
type AppToast = ToastMessage & { action?: ToastAction };
const WORKSPACES: { id: Workspace; label: string; icon: string }[] = [
  { id: 'search', label: 'Search', icon: 'fa-magnifying-glass' },
  { id: 'tools', label: 'Tools', icon: 'fa-table-cells-large' },
  { id: 'images', label: 'Images', icon: 'fa-image' },
  { id: 'docs', label: 'Docs', icon: 'fa-file-pdf' },
];

export default function App() {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
  const [workspace, setWorkspace] = useState<Workspace>('search');
  const [toasts, setToasts] = useState<AppToast[]>([]);
  const [searchLog, setSearchLog] = useLocalStorage<SearchLog>('matrix-pro-search-log', { day: todayKey(), count: 0 });
  const [showPalette, setShowPalette] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const toastIdRef = useRef(0);
  const toastTimers = useRef(new Map<number, number>());

  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, [theme]);
  useEffect(() => () => { toastTimers.current.forEach((timer) => window.clearTimeout(timer)); }, []);

  const dismissToast = useCallback((id: number) => {
    window.clearTimeout(toastTimers.current.get(id));
    toastTimers.current.delete(id);
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  // The optional third argument keeps existing two-argument callers compatible.
  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'success', options?: { action?: ToastAction }) => {
    const id = ++toastIdRef.current;
    setToasts((previous) => [...previous, { id, message, type, action: options?.action }]);
    if (type !== 'danger' && type !== 'warning' && !options?.action) {
      toastTimers.current.set(id, window.setTimeout(() => dismissToast(id), 5000));
    }
  }, [dismissToast]);

  const toggleTheme = useCallback(() => setTheme((previous) => previous === 'light' ? 'dark' : 'light'), [setTheme]);
  const searchCount = searchLog.day === todayKey() ? searchLog.count : 0;
  const handleSearchIncrement = useCallback(() => {
    setSearchLog((previous) => {
      const today = todayKey();
      return previous.day === today ? { day: today, count: previous.count + 1 } : { day: today, count: 1 };
    });
  }, [setSearchLog]);

  const selectWorkspace = useCallback((next: Workspace) => {
    setWorkspace(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const focusUnifiedSearch = useCallback(() => {
    selectWorkspace('search');
    window.requestAnimationFrame(() => {
      const input = document.querySelector<HTMLInputElement>(
        '#workspace-search input[data-unified-search], #workspace-search input[type="search"], #workspace-search input[type="text"]'
      );
      input?.focus({ preventScroll: true });
      input?.select();
    });
  }, [selectWorkspace]);

  const handleQuickSearch = useCallback((query: string) => {
    const selection = /\d+/.test(query) ? 'Address' : 'Name';
    window.open(`https://agents.agencymatrix.com/#/customer/search?selection=${selection}&query=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
    handleSearchIncrement();
  }, [handleSearchIncrement]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || document.querySelector('[aria-modal="true"]')) return;
      const target = event.target as HTMLElement | null;
      const typing = target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
      const key = event.key.toLowerCase();
      if (key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        // Claim slash before any mounted section's native listener sees it.
        event.stopImmediatePropagation();
        focusUnifiedSearch();
      } else if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && (key === 'k' || key === 'm')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setShowPalette(true);
      } else if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && key === 'd' && !typing) {
        event.preventDefault();
        toggleTheme();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [focusUnifiedSearch, toggleTheme]);

  useEffect(() => {
    const handleStorageError = (event: Event) => {
      const { error, key } = (event as CustomEvent).detail ?? {};
      addToast(error?.name === 'QuotaExceededError' || error?.code === 22
        ? 'Browser storage is full. Recent changes may not be saved.'
        : `Changes to ${key || 'local data'} could not be saved in this browser.`, 'danger');
    };
    window.addEventListener('local-storage-error', handleStorageError);
    return () => window.removeEventListener('local-storage-error', handleStorageError);
  }, [addToast]);

  const navigation = (mobile: boolean) => (
    <nav className={mobile ? 'workspace-nav workspace-nav-mobile' : 'workspace-nav workspace-nav-desktop'} aria-label={mobile ? 'Mobile workspace' : 'Workspace'}>
      {WORKSPACES.map((item) => (
        <button key={item.id} type="button" aria-current={workspace === item.id ? 'page' : undefined}
          aria-controls={`workspace-${item.id}`} onClick={() => selectWorkspace(item.id)}>
          <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace-main">Skip to workspace</a>
      <header className="shell-header">
        <div className="shell-header-inner">
          <div className="shell-brand">
            <span className="shell-mark" aria-hidden="true">BL</span>
            <div>
              <h1>Agency Command Center</h1>
              <p>Bill Layne Insurance</p>
            </div>
          </div>
          {navigation(false)}
          <div className="shell-actions">
            <button type="button" className="shell-icon-button" onClick={() => setShowSettings(true)} aria-label="Settings and help" title="Settings and help">
              <i className="fa-solid fa-gear" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main id="workspace-main" className="workspace-main" tabIndex={-1} data-modal-focus-fallback>
        <section id="workspace-search" aria-label="Search workspace" hidden={workspace !== 'search'}>
          <SearchCard active={workspace === 'search'} addToast={addToast} searchCount={searchCount} onSearch={handleSearchIncrement} />
        </section>
        <section id="workspace-tools" aria-label="Tools workspace" hidden={workspace !== 'tools'}>
          <ProgramLauncher addToast={addToast} />
        </section>
        <section id="workspace-images" aria-label="Images workspace" hidden={workspace !== 'images'}>
          <QuickImageLinksCard active={workspace === 'images'} addToast={addToast} />
        </section>
        <section id="workspace-docs" aria-label="Document links workspace" hidden={workspace !== 'docs'}>
          <DocumentLinksCard active={workspace === 'docs'} addToast={addToast} />
        </section>
      </main>
      {navigation(true)}

      <CommandPalette isOpen={showPalette} onClose={() => setShowPalette(false)} onClientSearch={handleQuickSearch} addToast={addToast} />
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Settings and Help">
        <div className="settings-row">
          <label htmlFor="dark-appearance">Dark appearance</label>
          <input id="dark-appearance" type="checkbox" role="switch" checked={theme === 'dark'} onChange={toggleTheme} />
        </div>
        <button type="button" className="settings-help" onClick={() => { setShowSettings(false); setShowPalette(true); }}>
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          Command Palette
          <kbd>Ctrl + K</kbd>
        </button>
        <button type="button" className="settings-help" onClick={() => setShowHelp(true)}>
          <i className="fa-solid fa-circle-question" aria-hidden="true" />
          Keyboard Shortcuts
          <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        </button>
        <a className="settings-help" href="/logout">
          <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
          Sign out
        </a>
      </Modal>
      <Modal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Keyboard Shortcuts" maxWidthClass="max-w-lg">
        <dl className="shortcut-list">
          {[
            ['Unified Search', '/'], ['Command Palette', 'Ctrl + K / Ctrl + M'],
            ['Dark Appearance', 'Ctrl + D'], ['Close Dialog', 'Esc'],
            ['Web Search', 'Alt + W'], ['Real Estate', 'Alt + H'],
            ['People Search', 'Alt + P'], ['Client Folder', 'Alt + F'],
            ['Contact Numbers', 'Alt + C'], ['Audit Memo', 'Alt + N / Ctrl + Shift + M'],
          ].map(([label, shortcut]) => <div key={label}><dt>{label}</dt><dd><kbd>{shortcut}</kbd></dd></div>)}
        </dl>
      </Modal>
      <div className="toast-stack" aria-label="Notifications">
        {toasts.map((toast) => <Toast key={toast.id} message={toast.message} type={toast.type} action={toast.action} onDismiss={() => dismissToast(toast.id)} />)}
      </div>
    </div>
  );
}
