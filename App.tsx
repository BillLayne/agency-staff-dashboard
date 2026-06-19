import React, { useCallback, useState } from 'react';
import ProgramLauncher from './components/ProgramLauncher';
import SearchCard from './components/SearchCard';
import Toast from './components/Toast';
import type { ToastMessage } from './types';

const ACCESS_CODE = '1993';

type WorkspaceMode = 'search' | 'tools';

const quickActions = [
  {
    label: 'Matrix Home',
    description: 'Open the main Agency Matrix portal.',
    href: 'https://agents.agencymatrix.com/#/',
    icon: 'fa-solid fa-house-chimney-window',
  },
  {
    label: 'Send Docs',
    description: 'Open the document link sender.',
    href: 'https://www.sendbilldocs.com/agent.html',
    icon: 'fa-solid fa-file-arrow-up',
  },
  {
    label: 'SMS Center',
    description: 'Open the staff texting workspace.',
    href: 'https://agency-sms-command-center.bill-7e3.workers.dev/',
    icon: 'fa-solid fa-comments',
  },
  {
    label: 'Auto ID Cards',
    description: 'Generate customer insurance cards.',
    href: 'https://insurance-card-generator-2026-color-edition.pages.dev/',
    icon: 'fa-solid fa-id-card',
  },
  {
    label: 'DL123',
    description: 'Open the DL123 certificate maker.',
    href: '/dl123-generator/index.html',
    icon: 'fa-solid fa-file-shield',
  },
  {
    label: 'POI Generator',
    description: 'Build proof-of-insurance documents.',
    href: 'https://bill-layne-insurance-poi-generator.pages.dev',
    icon: 'fa-solid fa-file-pdf',
  },
  {
    label: 'No Loss Forms',
    description: 'Open the no-loss form agent portal.',
    href: 'https://mynolossform.com/agent-portal.html',
    icon: 'fa-solid fa-file-signature',
  },
];

export default function App() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [searchCount, setSearchCount] = useState(0);
  const [activeMode, setActiveMode] = useState<WorkspaceMode>('search');

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  const handleUnlock = () => {
    if (password === ACCESS_CODE) {
      setIsUnlocked(true);
      addToast('Staff dashboard unlocked.', 'success');
      return;
    }

    addToast('Incorrect access code.', 'danger');
  };

  const handleSearch = useCallback(() => {
    setSearchCount((current) => current + 1);
  }, []);

  const openExternalLink = useCallback(
    (label: string, href: string) => {
      window.open(href, '_blank', 'noopener,noreferrer');
      addToast(`Opening ${label}...`, 'info');
    },
    [addToast],
  );

  const toastStack = (
    <div className="fixed bottom-6 right-6 z-[110] flex flex-col gap-3">
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} type={toast.type} />
      ))}
    </div>
  );

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#eef4fb] text-slate-900">
        <div className="relative flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md rounded-[1.35rem] border border-slate-200 bg-white p-6 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.65)]">
            <div className="mb-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1rem] bg-slate-950 text-white shadow-lg shadow-blue-900/15">
                <i className="fa-solid fa-shield-halved text-lg"></i>
              </div>
              <p className="mt-4 text-[11px] font-black uppercase tracking-[0.35em] text-[#0076d3]">
                Bill Layne Insurance
              </p>
              <h1 className="mt-2 font-outfit text-3xl font-black tracking-tight text-slate-950">
                Agency Staff Dashboard
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Enter the staff access code to open search, operations, documents, forms, and property tools.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Access Code
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUnlock();
                    }
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-[#0076d3] focus:bg-white focus:ring-4 focus:ring-blue-100"
                  placeholder="Enter code"
                />
              </div>

              <button
                type="button"
                onClick={handleUnlock}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#003f87]"
              >
                <i className="fa-solid fa-unlock-keyhole"></i>
                Unlock Dashboard
              </button>
            </div>
          </div>

          {toastStack}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef4fb] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1460px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-slate-950 text-white shadow-lg shadow-blue-900/15">
              <i className="fa-solid fa-briefcase text-base"></i>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-black uppercase tracking-[0.35em] text-[#0076d3]">
                Bill Layne Insurance
              </p>
              <h1 className="truncate font-outfit text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                Agency Staff Command Center
              </h1>
              <p className="hidden truncate text-sm text-slate-500 md:block">
                Staff search first, daily tools one click away.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden rounded-[1rem] border border-slate-200 bg-slate-100 p-1 sm:flex">
              {(['search', 'tools'] as WorkspaceMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setActiveMode(mode)}
                  className={`inline-flex items-center gap-2 rounded-[0.8rem] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition focus:outline-none focus:ring-2 focus:ring-[#0076d3]/30 ${
                    activeMode === mode
                      ? 'bg-white text-[#003f87] shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <i className={`fa-solid ${mode === 'search' ? 'fa-magnifying-glass' : 'fa-table-cells-large'} text-[11px]`}></i>
                  {mode}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setActiveMode('search')}
              className="inline-flex items-center gap-2 rounded-[1rem] border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-600 shadow-sm transition hover:border-[#0076d3]/50 hover:text-[#003f87] focus:outline-none focus:ring-2 focus:ring-[#0076d3]/30"
            >
              <i className="fa-solid fa-bolt text-[11px]"></i>
              Quick Search
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1460px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <section className="mb-4 grid gap-3 rounded-[1.35rem] border border-slate-200 bg-white p-2 shadow-[0_24px_70px_-58px_rgba(15,23,42,0.75)] md:grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveMode('search')}
            className={`flex min-h-[74px] items-center gap-4 rounded-[1.1rem] px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#0076d3]/30 ${
              activeMode === 'search'
                ? 'bg-slate-950 text-white shadow-lg shadow-slate-900/15'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[0.95rem] ${activeMode === 'search' ? 'bg-[#0076d3]' : 'bg-white text-slate-400'}`}>
              <i className="fa-solid fa-magnifying-glass"></i>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black uppercase tracking-[0.18em]">Unified Search</span>
              <span className={`mt-1 block text-sm font-semibold ${activeMode === 'search' ? 'text-slate-300' : 'text-slate-400'}`}>
                Matrix lookup and customer search
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('tools')}
            className={`flex min-h-[74px] items-center gap-4 rounded-[1.1rem] px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#0076d3]/30 ${
              activeMode === 'tools'
                ? 'bg-slate-950 text-white shadow-lg shadow-slate-900/15'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[0.95rem] ${activeMode === 'tools' ? 'bg-[#0076d3]' : 'bg-white text-slate-400'}`}>
              <i className="fa-solid fa-table-cells-large"></i>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black uppercase tracking-[0.18em]">Tools</span>
              <span className={`mt-1 block text-sm font-semibold ${activeMode === 'tools' ? 'text-slate-300' : 'text-slate-400'}`}>
                Launchers, forms, property utilities
              </span>
            </span>
          </button>
        </section>

        {activeMode === 'search' ? (
          <div className="space-y-4">
            <SearchCard addToast={addToast} searchCount={searchCount} onSearch={handleSearch} />

            <section className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_-60px_rgba(15,23,42,0.8)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Staff Quick Actions</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Most common next steps after search.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveMode('tools')}
                  className="hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 transition hover:border-[#0076d3]/50 hover:text-[#003f87] sm:inline-flex"
                >
                  View All Tools
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => openExternalLink(action.label, action.href)}
                    title={action.description}
                    className="group flex min-h-[76px] items-center gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-[#0076d3]/40 hover:bg-white hover:shadow-sm"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] bg-white text-[#003f87] shadow-sm transition group-hover:bg-[#003f87] group-hover:text-white">
                      <i className={`${action.icon} text-sm`}></i>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-black uppercase tracking-[0.16em] text-slate-700">
                        {action.label}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs font-semibold leading-4 text-slate-400">
                        {action.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <section className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_-60px_rgba(15,23,42,0.8)] sm:p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Staff Tool Launcher</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Operations, documents, forms, and property utilities grouped by workflow.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMode('search')}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 transition hover:border-[#0076d3]/50 hover:text-[#003f87]"
              >
                Back To Search
              </button>
            </div>
            <ProgramLauncher addToast={addToast} />
          </section>
        )}
      </main>

      {toastStack}
    </div>
  );
}
