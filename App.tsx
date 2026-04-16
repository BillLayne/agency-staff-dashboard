import React, { useCallback, useState } from 'react';
import ProgramLauncher from './components/ProgramLauncher';
import SearchCard from './components/SearchCard';
import Toast from './components/Toast';
import type { ToastMessage } from './types';

const ACCESS_CODE = '1993';

export default function App() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [searchCount, setSearchCount] = useState(0);

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

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#f3f7fb] text-slate-900">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(circle_at_top,rgba(0,118,211,0.14),transparent_58%)]"></div>
          <div className="absolute -left-24 top-32 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl"></div>
          <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-blue-700/10 blur-3xl"></div>
        </div>

        <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-6 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.45)] backdrop-blur-xl">
            <div className="mb-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-gradient-to-br from-slate-950 via-[#003f87] to-[#0076d3] text-white shadow-xl shadow-blue-900/20">
                <i className="fa-solid fa-shield-halved text-lg"></i>
              </div>
              <p className="mt-4 text-[11px] font-black uppercase tracking-[0.35em] text-[#0076d3]">
                Bill Layne Insurance
              </p>
              <h1 className="mt-2 font-outfit text-3xl font-black tracking-tight text-slate-900">
                Agency Staff Dashboard
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Enter the staff access code to open operations, forms, and property coverage tools.
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#003f87]"
              >
                <i className="fa-solid fa-unlock-keyhole"></i>
                Unlock Dashboard
              </button>
            </div>
          </div>

          <div className="fixed bottom-6 right-6 z-[110] flex flex-col gap-3">
            {toasts.map((toast) => (
              <Toast key={toast.id} message={toast.message} type={toast.type} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f7fb] text-slate-900">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(circle_at_top,rgba(0,118,211,0.14),transparent_58%)]"></div>
        <div className="absolute -left-24 top-32 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl"></div>
        <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-blue-700/10 blur-3xl"></div>
      </div>

      <div className="relative z-10">
        <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.1rem] bg-gradient-to-br from-slate-950 via-[#003f87] to-[#0076d3] text-white shadow-xl shadow-blue-900/20">
              <i className="fa-solid fa-briefcase text-base"></i>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-black uppercase tracking-[0.35em] text-[#0076d3]">
                Bill Layne Insurance
              </p>
              <h1 className="truncate font-outfit text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                Agency Staff Dashboard
              </h1>
              <p className="hidden text-sm text-slate-500 sm:block">
                Staff-only launcher for operations, documents, forms, and property coverage tools.
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6 lg:px-8">
          <section className="mb-5 sm:mb-7">
            <SearchCard addToast={addToast} searchCount={searchCount} onSearch={handleSearch} />
          </section>

          <section>
            <ProgramLauncher addToast={addToast} />
          </section>
        </main>

        <div className="fixed bottom-6 right-6 z-[110] flex flex-col gap-3">
          {toasts.map((toast) => (
            <Toast key={toast.id} message={toast.message} type={toast.type} />
          ))}
        </div>
      </div>
    </div>
  );
}
