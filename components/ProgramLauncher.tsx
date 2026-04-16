import React, { useEffect, useState } from 'react';

interface ProgramLauncherProps {
  addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
}

type ProgramCategory = 'Operations' | 'Documents & Forms' | 'Property & Coverage';

interface ProgramEntry {
  id: string;
  title: string;
  category: ProgramCategory;
  description: string;
  target: string;
  hostedTarget?: string;
  icon: string;
  accent: string;
  note: string;
  targetType: 'local' | 'web';
}

const PROGRAMS: ProgramEntry[] = [
  {
    id: 'send-docs',
    title: 'Send Documents',
    category: 'Documents & Forms',
    description: 'Create and open the live Send Bill Docs agent link generator.',
    target: 'https://www.sendbilldocs.com/agent.html',
    icon: 'fa-solid fa-file-arrow-up',
    accent: 'from-sky-700 to-cyan-500',
    note: 'Live agent portal',
    targetType: 'web',
  },
  {
    id: 'auto-id-cards',
    title: 'Auto ID Card Maker',
    category: 'Documents & Forms',
    description: 'Generate 1 to 4 printable North Carolina insurance cards in the hosted staff tool.',
    target: '/auto-id-card-maker/index.html',
    hostedTarget: '/auto-id-card-maker/index.html',
    icon: 'fa-solid fa-id-card',
    accent: 'from-indigo-700 to-blue-500',
    note: 'Hosted in dashboard',
    targetType: 'web',
  },
  {
    id: 'dl123-generator',
    title: 'DL123 Generator',
    category: 'Documents & Forms',
    description: 'Create North Carolina DL-123 driver license liability insurance certifications.',
    target: '/dl123-generator/index.html',
    hostedTarget: '/dl123-generator/index.html',
    icon: 'fa-solid fa-file-lines',
    accent: 'from-emerald-700 to-cyan-500',
    note: 'Hosted in dashboard',
    targetType: 'web',
  },
  {
    id: 'poi-generator',
    title: 'POI Generator',
    category: 'Documents & Forms',
    description: 'Parse applications, screenshots, and PDFs to build polished proof-of-insurance documents.',
    target: 'C:\\Users\\bill\\OneDrive\\Documents\\Playground\\bill-layne-insurance-poi-generator\\index.html',
    hostedTarget: 'https://bill-layne-insurance-poi-generator.pages.dev',
    icon: 'fa-solid fa-file-pdf',
    accent: 'from-blue-800 to-cyan-500',
    note: 'Live cloud app',
    targetType: 'local',
  },
  {
    id: 'certificate-generator',
    title: 'Certificates',
    category: 'Documents & Forms',
    description: 'Open the live certificate platform for COIs and certificate work.',
    target: 'https://coi-certificates-cloudflare.pages.dev/',
    icon: 'fa-solid fa-certificate',
    accent: 'from-teal-700 to-emerald-500',
    note: 'Live cloud app',
    targetType: 'web',
  },
  {
    id: 'envelope-maker',
    title: 'Envelope Maker',
    category: 'Documents & Forms',
    description: 'Open the envelope addressing program for fast document mailings.',
    target: 'C:\\Users\\bill\\OneDrive\\Documents\\Envelope-Maker\\index.html',
    hostedTarget: 'https://envelope-maker-cte.pages.dev',
    icon: 'fa-solid fa-envelope',
    accent: 'from-fuchsia-700 to-rose-500',
    note: 'Hosted cloud app',
    targetType: 'local',
  },
  {
    id: 'receipt-maker',
    title: 'Receipt Maker',
    category: 'Documents & Forms',
    description: 'Create clean customer receipts for payments, confirmations, and recordkeeping.',
    target: 'https://billlayne.github.io/Receipt-Maker/index.html',
    hostedTarget: 'https://billlayne.github.io/Receipt-Maker/index.html',
    icon: 'fa-solid fa-receipt',
    accent: 'from-amber-700 to-yellow-500',
    note: 'Live hosted tool',
    targetType: 'web',
  },
  {
    id: 'cancellation-form',
    title: 'Cancellation Link Generator',
    category: 'Documents & Forms',
    description: 'Generate live cancellation form links for customers and policy changes.',
    target: 'https://thecancellationform.com/link-generator.html',
    icon: 'fa-solid fa-ban',
    accent: 'from-rose-700 to-red-500',
    note: 'Live link generator',
    targetType: 'web',
  },
  {
    id: 'no-loss',
    title: 'No Loss Form Generator',
    category: 'Documents & Forms',
    description: 'Build live no-loss statement links from the agent portal.',
    target: 'https://mynolossform.com/agent-portal.html',
    icon: 'fa-solid fa-file-signature',
    accent: 'from-slate-700 to-slate-500',
    note: 'Live agent portal',
    targetType: 'web',
  },
  {
    id: 'home-inventory',
    title: 'Home Inventory',
    category: 'Property & Coverage',
    description: 'Guide clients through room-by-room inventory capture for better coverage reviews.',
    target: 'C:\\Users\\bill\\OneDrive\\Documents\\Playground\\HOME-INVENTORY\\index.html',
    hostedTarget: 'https://billlayne.github.io/HOME-INVENTORY/',
    icon: 'fa-solid fa-box-open',
    accent: 'from-violet-700 to-indigo-500',
    note: 'Live hosted tool',
    targetType: 'local',
  },
  {
    id: 'home-rebuild',
    title: 'Home Rebuild Estimator',
    category: 'Property & Coverage',
    description: 'Open the rebuild-cost estimator for replacement-cost conversations.',
    target: 'C:\\Users\\bill\\OneDrive\\Documents\\Playground\\HOME-REBUILD-ESTIMATOR\\public\\index.html',
    hostedTarget: 'https://home-rebuild-estimator.pages.dev',
    icon: 'fa-solid fa-house-circle-exclamation',
    accent: 'from-amber-700 to-orange-500',
    note: 'Live cloud app',
    targetType: 'local',
  },
  {
    id: 'condo-coverage',
    title: 'Condo Coverage Calculator',
    category: 'Property & Coverage',
    description: 'Estimate walls-in condo coverage needs for HO-6 discussions.',
    target: 'C:\\Users\\bill\\OneDrive\\Documents\\Playground\\CONDO-COVERAGE-CALCULATOR\\public\\index.html',
    hostedTarget: 'https://condo-coverage-calculator.pages.dev',
    icon: 'fa-solid fa-building-user',
    accent: 'from-cyan-700 to-sky-500',
    note: 'Live cloud app',
    targetType: 'local',
  },
  {
    id: 'nc-tools-property',
    title: 'NC Tools Property Lookup',
    category: 'Property & Coverage',
    description: 'Open the live NC insurance tools property lookup workspace.',
    target: 'https://nc-insurance-tools-gemini.pages.dev/',
    hostedTarget: 'https://nc-insurance-tools-gemini.pages.dev/',
    icon: 'fa-solid fa-map-location-dot',
    accent: 'from-emerald-700 to-teal-500',
    note: 'Live cloud app',
    targetType: 'web',
  },
];

const CATEGORY_ORDER: ProgramCategory[] = ['Operations', 'Documents & Forms', 'Property & Coverage'];
const CATEGORY_ICONS: Record<ProgramCategory, string> = {
  Operations: 'fa-solid fa-bolt',
  'Documents & Forms': 'fa-solid fa-folder-open',
  'Property & Coverage': 'fa-solid fa-house-circle-check',
};

const toFileUrl = (windowsPath: string) => encodeURI(`file:///${windowsPath.replace(/\\/g, '/')}`);

const displayPath = (windowsPath: string) =>
  windowsPath
    .replace('C:\\Users\\bill\\OneDrive\\Documents\\Playground\\', '')
    .replace('C:\\Users\\bill\\OneDrive\\Documents\\', '');

const groupedPrograms = CATEGORY_ORDER.map((category) => ({
  category,
  items: PROGRAMS.filter((program) => program.category === category),
})).filter((group) => group.items.length > 0);

const ProgramLauncher: React.FC<ProgramLauncherProps> = ({ addToast }) => {
  const isHostedDashboard =
    window.location.protocol.startsWith('http') &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';
  const [isMobileView, setIsMobileView] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<ProgramCategory, boolean>>({
    Operations: true,
    'Documents & Forms': true,
    'Property & Coverage': true,
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateMobileState = (event?: MediaQueryListEvent) => {
      const matches = event?.matches ?? mediaQuery.matches;
      setIsMobileView(matches);
    };

    updateMobileState();
    mediaQuery.addEventListener('change', updateMobileState);
    return () => mediaQuery.removeEventListener('change', updateMobileState);
  }, []);

  const toggleCategory = (category: ProgramCategory) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const openProgram = (program: ProgramEntry) => {
    if (isHostedDashboard && program.targetType === 'local' && !program.hostedTarget) {
      addToast(`${program.title} is a local-only tool. Open it from the office desktop dashboard.`, 'warning');
      return;
    }

    const destination = isHostedDashboard && program.hostedTarget
      ? program.hostedTarget
      : program.targetType === 'web'
        ? program.target
        : toFileUrl(program.target);

    const newWindow = window.open(destination, '_blank', 'noopener,noreferrer');
    if (newWindow) {
      addToast(`Opening ${program.title}...`, 'info');
      return;
    }

    addToast(`Popup blocked while opening ${program.title}. Please allow popups for this dashboard.`, 'warning');
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {groupedPrograms.map((group) => (
        <section key={group.category}>
          <div className="mb-3">
            {isMobileView ? (
              <button
                type="button"
                onClick={() => toggleCategory(group.category)}
                className="flex w-full items-center gap-3 rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-4 text-left"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-slate-900 text-white">
                  <i className={`${CATEGORY_ICONS[group.category]} text-base`}></i>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-black uppercase tracking-[0.22em] text-slate-700">
                    {group.category}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {group.items.length} tools ready to open
                  </p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500">
                  <i className={`fa-solid ${expandedCategories[group.category] ? 'fa-chevron-up' : 'fa-chevron-down'} text-sm`}></i>
                </div>
              </button>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
                  {group.category}
                </h3>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {group.items.length} tools
                </span>
              </div>
            )}
          </div>

          {(!isMobileView || expandedCategories[group.category]) && (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((program) => (
                <article
                  key={program.id}
                  className="overflow-hidden rounded-[1.2rem] border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.8)] transition hover:-translate-y-1 hover:border-[#0076d3]/40 hover:shadow-xl sm:rounded-[1.35rem]"
                >
                  <div className={`h-2 bg-gradient-to-r ${program.accent}`}></div>
                  <div className="p-4">
                    <div className="mb-4 flex items-start gap-3 sm:justify-between">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-gradient-to-br ${program.accent} text-white shadow-lg`}>
                        <i className={`${program.icon} text-base`}></i>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                        {program.note}
                      </span>
                    </div>

                    <h4 className="font-outfit text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                      {program.title}
                    </h4>
                    <p className="mt-2 text-[13px] leading-5 text-slate-500 sm:text-sm">{program.description}</p>

                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        {program.targetType === 'web' ? 'Live link' : 'Local entry'}
                      </p>
                      <p className="mt-2 break-all text-xs leading-5 text-slate-500">
                        {isHostedDashboard && program.hostedTarget
                          ? program.hostedTarget
                          : program.targetType === 'web'
                            ? program.target
                            : displayPath(program.target)}
                      </p>
                    </div>

                    <button
                      onClick={() => openProgram(program)}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#003f87]"
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square"></i>
                      Open Tool
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
};

export default ProgramLauncher;
