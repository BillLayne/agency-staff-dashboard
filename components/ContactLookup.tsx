import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Modal from './Modal';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  COMPANY_CONTACTS,
  findCompanyContacts,
  normalizeCompanyName,
  type CompanyContact,
  type ContactDetail,
  type ContactDetailKind,
} from '../data/carrierContacts';

interface ContactLookupProps {
  query: string;
  onQueryChange: (query: string) => void;
  addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
}

interface ManualContactEntry {
  id: string;
  company: string;
  kind: ContactDetailKind;
  label: string;
  value: string;
  createdAt: number;
  replacesDetail?: ContactDetail;
}

interface ManualContactForm {
  company: string;
  kind: ContactDetailKind;
  label: string;
  value: string;
}

interface EditingDetail {
  entryId?: string;
  originalDetail: ContactDetail;
  currentDetail: ContactDetail;
}

const MANUAL_CONTACTS_STORAGE_KEY = 'staff-dashboard-manual-company-contacts';

const DEFAULT_LABELS: Record<ContactDetailKind, string> = {
  phone: 'Customer service',
  fax: 'Fax',
  email: 'Email',
  website: 'Website',
};

const EMPTY_MANUAL_FORM: ManualContactForm = {
  company: '',
  kind: 'phone',
  label: DEFAULT_LABELS.phone,
  value: '',
};

const isManualContactEntry = (value: unknown): value is ManualContactEntry => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<ManualContactEntry>;
  return typeof entry.id === 'string'
    && typeof entry.company === 'string'
    && ['phone', 'fax', 'email', 'website'].includes(entry.kind || '')
    && typeof entry.label === 'string'
    && typeof entry.value === 'string'
    && typeof entry.createdAt === 'number';
};

const detailHref = (detail: ContactDetail) => {
  if (detail.kind === 'phone') return `tel:${detail.value.replace(/[^\d+]/g, '')}`;
  if (detail.kind === 'email') return `mailto:${detail.value}`;
  if (detail.kind === 'website') {
    return detail.value.startsWith('http') ? detail.value : `https://${detail.value}`;
  }
  return null;
};

const detailIcon: Record<ContactDetailKind, string> = {
  phone: 'fa-phone',
  fax: 'fa-fax',
  email: 'fa-envelope',
  website: 'fa-globe',
};

const mobileDetailLabel = (label: string) =>
  label === 'Workers comp phone' ? 'WC phone' : label;

const detailsMatch = (left: ContactDetail, right: ContactDetail) =>
  left.kind === right.kind
  && left.label.toLowerCase() === right.label.toLowerCase()
  && left.value.toLowerCase() === right.value.toLowerCase();

const mergeManualContacts = (manualEntries: ManualContactEntry[]): CompanyContact[] => {
  const directory = COMPANY_CONTACTS.map((contact) => ({
    ...contact,
    aliases: [...contact.aliases],
    details: [...contact.details],
  }));

  manualEntries.forEach((entry) => {
    const normalizedCompany = normalizeCompanyName(entry.company);
    let contact = directory.find((candidate) => {
      const knownNames = [candidate.company, ...candidate.aliases].map(normalizeCompanyName);
      return knownNames.includes(normalizedCompany);
    });

    if (!contact) {
      contact = {
        id: `manual-${normalizedCompany.replace(/\s+/g, '-')}`,
        company: entry.company,
        aliases: [],
        category: 'Saved contact',
        details: [],
        source: 'Added manually in Agency Command Center',
      };
      directory.push(contact);
    }

    const savedDetail: ContactDetail = {
      label: entry.label,
      value: entry.value,
      kind: entry.kind,
    };

    if (entry.replacesDetail) {
      const replacedIndex = contact.details.findIndex((detail) =>
        detailsMatch(detail, entry.replacesDetail as ContactDetail)
      );
      if (replacedIndex >= 0) {
        contact.details[replacedIndex] = savedDetail;
        return;
      }
    }

    contact.details.push(savedDetail);
  });

  return directory;
};

const ContactLookup: React.FC<ContactLookupProps> = ({ query, onQueryChange, addToast }) => {
  const [manualEntries, setManualEntries] = useLocalStorage<ManualContactEntry[]>(MANUAL_CONTACTS_STORAGE_KEY, []);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState<ManualContactForm>(EMPTY_MANUAL_FORM);
  const [managedCompany, setManagedCompany] = useState<string | null>(null);
  const [editingDetail, setEditingDetail] = useState<EditingDetail | null>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const directory = useMemo(() => mergeManualContacts(manualEntries), [manualEntries]);
  const matches = useMemo(() => findCompanyContacts(query, directory), [query, directory]);
  const managedContact = useMemo(() => {
    if (!managedCompany) return null;
    const normalizedCompany = normalizeCompanyName(managedCompany);
    return directory.find((contact) =>
      [contact.company, ...contact.aliases]
        .map(normalizeCompanyName)
        .includes(normalizedCompany)
    ) || null;
  }, [directory, managedCompany]);
  const visibleSavedEntries = useMemo(() => {
    if (!managedCompany) return manualEntries;
    const normalizedCompany = normalizeCompanyName(managedCompany);
    return manualEntries.filter((entry) =>
      normalizeCompanyName(entry.company) === normalizedCompany
    );
  }, [managedCompany, manualEntries]);
  const hasQuery = query.trim().length > 0;

  const copyValue = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      addToast(`${label} copied`, 'success');
    } catch {
      addToast(`Could not copy ${label.toLowerCase()}`, 'danger');
    }
  };

  const downloadBackup = () => {
    const backup = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      entries: manualEntries,
    }, null, 2);
    const url = URL.createObjectURL(new Blob([backup], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `staff-contact-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('Staff contact backup downloaded.', 'success');
  };

  const restoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const entries = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && 'entries' in parsed
          ? (parsed as { entries?: unknown }).entries
          : null;

      if (!Array.isArray(entries) || !entries.every(isManualContactEntry)) {
        throw new Error('Invalid staff contact backup');
      }

      setManualEntries((current) => {
        const restoredIds = new Set(entries.map((entry) => entry.id));
        return [...entries, ...current.filter((entry) => !restoredIds.has(entry.id))];
      });
      addToast(`${entries.length} saved contact changes restored.`, 'success');
    } catch {
      addToast('That file is not a valid staff contact backup.', 'danger');
    }
  };

  const openAddModal = (companyName?: string) => {
    const suggestedCompany = companyName || (matches.length === 1 ? matches[0].company : '');
    setManagedCompany(companyName || null);
    setEditingDetail(null);
    setManualForm({
      company: suggestedCompany,
      kind: 'phone',
      label: DEFAULT_LABELS.phone,
      value: '',
    });
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setManagedCompany(null);
    setEditingDetail(null);
  };

  const resetDetailForm = (company: string) => {
    setEditingDetail(null);
    setManualForm({
      company,
      kind: 'phone',
      label: DEFAULT_LABELS.phone,
      value: '',
    });
  };

  const beginEditDetail = (company: string, detail: ContactDetail) => {
    const normalizedCompany = normalizeCompanyName(company);
    const savedEntry = manualEntries.find((entry) =>
      normalizeCompanyName(entry.company) === normalizedCompany
      && entry.kind === detail.kind
      && entry.label.toLowerCase() === detail.label.toLowerCase()
      && entry.value.toLowerCase() === detail.value.toLowerCase()
    );

    setEditingDetail({
      entryId: savedEntry?.id,
      originalDetail: savedEntry?.replacesDetail || detail,
      currentDetail: detail,
    });
    setManualForm({
      company,
      kind: detail.kind,
      label: detail.label,
      value: detail.value,
    });
  };

  const handleKindChange = (kind: ContactDetailKind) => {
    setManualForm((current) => ({
      ...current,
      kind,
      label: DEFAULT_LABELS[kind],
    }));
  };

  const handleManualContactSave = (event: React.FormEvent) => {
    event.preventDefault();
    const company = manualForm.company.trim();
    const label = manualForm.label.trim();
    const value = manualForm.value.trim();

    if (!company || !label || !value) {
      addToast('Company, label, and contact detail are required.', 'warning');
      return;
    }

    if (manualForm.kind === 'email' && !value.includes('@')) {
      addToast('Please enter a valid email address.', 'warning');
      return;
    }

    const companyContact = directory.find((contact) =>
      [contact.company, ...contact.aliases]
        .map(normalizeCompanyName)
        .includes(normalizeCompanyName(company))
    );
    const savedDetail: ContactDetail = { kind: manualForm.kind, label, value };
    const duplicate = companyContact?.details.some((detail) =>
      detailsMatch(detail, savedDetail)
      && (!editingDetail || !detailsMatch(detail, editingDetail.currentDetail))
    );

    if (duplicate) {
      addToast('That contact detail is already saved.', 'warning');
      return;
    }

    if (editingDetail) {
      if (editingDetail.entryId) {
        setManualEntries((current) => current.map((entry) =>
          entry.id === editingDetail.entryId
            ? { ...entry, company, kind: manualForm.kind, label, value }
            : entry
        ));
      } else {
        setManualEntries((current) => [{
          id: globalThis.crypto?.randomUUID?.() || `contact-${Date.now()}`,
          company,
          kind: manualForm.kind,
          label,
          value,
          createdAt: Date.now(),
          replacesDetail: editingDetail.originalDetail,
        }, ...current]);
      }
      onQueryChange(company);
      resetDetailForm(company);
      addToast(`${label} updated for ${company}.`, 'success');
      return;
    }

    const newEntry: ManualContactEntry = {
      id: globalThis.crypto?.randomUUID?.() || `contact-${Date.now()}`,
      company,
      kind: manualForm.kind,
      label,
      value,
      createdAt: Date.now(),
    };

    setManualEntries((current) => [newEntry, ...current]);
    onQueryChange(company);
    resetDetailForm(company);
    addToast(`${label} added to ${company}.`, 'success');
  };

  const removeManualEntry = (entryId: string) => {
    const entry = manualEntries.find((candidate) => candidate.id === entryId);
    setManualEntries((current) => current.filter((candidate) => candidate.id !== entryId));
    if (editingDetail?.entryId === entryId) {
      resetDetailForm(managedCompany || entry?.company || '');
    }
    if (!entry) {
      addToast('Contact detail removed.', 'info');
      return;
    }
    addToast(
      entry.replacesDetail
        ? `${entry.label} restored to the original value for ${entry.company}.`
        : `${entry.label} removed from ${entry.company}.`,
      'info',
    );
  };

  const categoryLabel = (category: CompanyContact['category']) => {
    if (category === 'Workers compensation') return 'Workers comp';
    if (category === 'Saved contact') return 'Added';
    return 'Carrier';
  };

  return (
    <>
      <section
        aria-label="Company contact search results"
        aria-live="polite"
        className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2.5 dark:border-white/10 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#003f87] text-white">
              <i className="fa-solid fa-address-book text-xs"></i>
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">Company Contacts</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{directory.length} companies saved</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <input
              ref={backupInputRef}
              type="file"
              accept="application/json,.json"
              onChange={restoreBackup}
              className="hidden"
            />
            <button
              type="button"
              onClick={downloadBackup}
              title="Download a backup of staff-added contact changes"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-[#0076d3]/50 hover:text-[#003f87] dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            >
              <i className="fa-solid fa-download"></i>
              <span className="hidden sm:inline">Backup</span>
            </button>
            <button
              type="button"
              onClick={() => backupInputRef.current?.click()}
              title="Restore staff-added contacts from a backup"
              aria-label="Restore staff contact backup"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[#0076d3]/50 hover:text-[#003f87] dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            >
              <i className="fa-solid fa-upload text-xs"></i>
            </button>
            <button
              type="button"
              onClick={() => openAddModal()}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#003f87] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0076d3] hover:shadow-md"
            >
              <i className="fa-solid fa-plus"></i>
              Add Contact
            </button>
          </div>
        </div>

        {!hasQuery ? (
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-slate-800 dark:text-white">Start typing a company name</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Phone, fax, email, and website details will appear as you type.</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
            <i className="fa-solid fa-circle-info text-slate-400"></i>
            No saved contact matches "{query.trim()}". Use Add Contact to create it.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-white/10">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {matches.length} {matches.length === 1 ? 'company' : 'companies'} found
              </p>
              <span className="text-xs text-slate-400">Scroll for more details</span>
            </div>
            <div
              tabIndex={0}
              aria-label="Scrollable company contact details"
              className="grid max-h-96 min-h-0 gap-2 overflow-y-auto overscroll-contain p-2 outline-none [scrollbar-gutter:stable] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0076d3]/50 lg:grid-cols-2"
            >
              {matches.map((contact) => (
                <article
                  key={contact.id}
                  className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-900/60"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{contact.company}</h3>
                      {contact.address && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{contact.address}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#003f87] dark:bg-blue-500/10 dark:text-blue-200">
                        {categoryLabel(contact.category)}
                      </span>
                      <button
                        type="button"
                        onClick={() => openAddModal(contact.company)}
                        title={`Add or edit contact details for ${contact.company}`}
                        aria-label={`Add or edit contact details for ${contact.company}`}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-[#003f87] shadow-sm transition hover:border-[#0076d3]/50 hover:bg-blue-50 hover:text-[#0076d3] dark:border-white/10 dark:bg-white/5 dark:text-blue-200 dark:hover:bg-white/10"
                      >
                        <i className="fa-solid fa-plus text-[10px]"></i>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {contact.details.map((detail, detailIndex) => {
                      const href = detailHref(detail);
                      return (
                        <div
                          key={`${detail.label}-${detail.value}-${detailIndex}`}
                          className="flex min-h-9 min-w-0 items-center gap-2 rounded-md bg-slate-50 px-2.5 py-1.5 dark:bg-white/5"
                        >
                          <i className={`fa-solid ${detailIcon[detail.kind]} w-4 shrink-0 text-center text-xs text-slate-400`}></i>
                          <span className="w-16 shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400 sm:w-28">
                            <span className="sm:hidden">{mobileDetailLabel(detail.label)}</span>
                            <span className="hidden sm:inline">{detail.label}</span>
                          </span>
                          {href ? (
                            <a
                              href={href}
                              target={detail.kind === 'website' ? '_blank' : undefined}
                              rel={detail.kind === 'website' ? 'noreferrer' : undefined}
                              title={detail.value}
                              className="min-w-0 flex-1 truncate text-xs font-semibold text-[#005eb8] hover:underline dark:text-blue-300 sm:text-sm"
                            >
                              {detail.value}
                            </a>
                          ) : (
                            <span title={detail.value} className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800 dark:text-slate-200 sm:text-sm">{detail.value}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => copyValue(detail.label, detail.value)}
                            title={`Copy ${detail.label.toLowerCase()}`}
                            aria-label={`Copy ${detail.label.toLowerCase()} for ${contact.company}`}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-white hover:text-[#003f87] dark:hover:bg-white/10 dark:hover:text-white"
                          >
                            <i className="fa-regular fa-copy text-xs"></i>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-2 break-words text-[10px] text-slate-400">{contact.source}</p>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {createPortal(
        <Modal
          isOpen={isAddModalOpen}
          onClose={closeAddModal}
          title={managedContact ? `Manage ${managedContact.company}` : 'Add Company Contact'}
          maxWidthClass="max-w-lg"
        >
          <div className="max-h-[calc(100vh-9rem)] overflow-y-auto pr-1 [scrollbar-gutter:stable]">
          <form onSubmit={handleManualContactSave} className="space-y-4">
            <div>
              <label htmlFor="manual-contact-company" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Company name
              </label>
              <input
                id="manual-contact-company"
                type="text"
                value={manualForm.company}
                onChange={(event) => setManualForm((current) => ({ ...current, company: event.target.value }))}
                readOnly={Boolean(managedCompany)}
                placeholder="Example: Nationwide"
                className={`w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0076d3] dark:border-white/10 dark:text-white ${
                  managedCompany ? 'cursor-default bg-slate-100 dark:bg-white/10' : 'bg-white dark:bg-white/5'
                }`}
              />
            </div>

            {managedContact && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Current Details</h4>
                  <span className="text-xs text-slate-400">{managedContact.details.length} saved</span>
                </div>
                <div className="max-h-44 space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">
                  {managedContact.details.map((detail, detailIndex) => (
                    <div
                      key={`${detail.kind}-${detail.label}-${detail.value}-${detailIndex}`}
                      className={`flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-2 ${
                        editingDetail && detailsMatch(detail, editingDetail.currentDetail)
                          ? 'border-[#0076d3] bg-blue-50 dark:border-blue-400/60 dark:bg-blue-500/10'
                          : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/5'
                      }`}
                    >
                      <i className={`fa-solid ${detailIcon[detail.kind]} w-4 shrink-0 text-center text-xs text-slate-400`}></i>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{detail.label}</p>
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{detail.value}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => beginEditDetail(managedContact.company, detail)}
                        title={`Edit ${detail.label.toLowerCase()}`}
                        aria-label={`Edit ${detail.label.toLowerCase()} for ${managedContact.company}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-blue-50 hover:text-[#003f87] dark:hover:bg-white/10 dark:hover:text-blue-200"
                      >
                        <i className="fa-solid fa-pen text-xs"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editingDetail && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-400/30 dark:bg-blue-500/10">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#003f87] dark:text-blue-200">Editing Detail</p>
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{editingDetail.currentDetail.label}</p>
                </div>
                <button
                  type="button"
                  onClick={() => resetDetailForm(manualForm.company)}
                  className="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold text-[#003f87] transition hover:bg-white dark:text-blue-200 dark:hover:bg-white/10"
                >
                  Cancel Edit
                </button>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="manual-contact-kind" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Contact type
                </label>
                <select
                  id="manual-contact-kind"
                  value={manualForm.kind}
                  onChange={(event) => handleKindChange(event.target.value as ContactDetailKind)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0076d3] dark:border-white/10 dark:bg-slate-900 dark:text-white"
                >
                  <option value="phone">Phone</option>
                  <option value="fax">Fax</option>
                  <option value="email">Email</option>
                  <option value="website">Website</option>
                </select>
              </div>

              <div>
                <label htmlFor="manual-contact-label" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Label
                </label>
                <input
                  id="manual-contact-label"
                  type="text"
                  value={manualForm.label}
                  onChange={(event) => setManualForm((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Claims, billing, underwriting..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0076d3] dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="manual-contact-value" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Contact detail
              </label>
              <input
                id="manual-contact-value"
                type={manualForm.kind === 'email' ? 'email' : 'text'}
                inputMode={manualForm.kind === 'phone' || manualForm.kind === 'fax' ? 'tel' : 'text'}
                value={manualForm.value}
                onChange={(event) => setManualForm((current) => ({ ...current, value: event.target.value }))}
                placeholder={manualForm.kind === 'phone' || manualForm.kind === 'fax' ? '1-800-555-0123' : manualForm.kind === 'email' ? 'service@company.com' : 'www.company.com'}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0076d3] dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeAddModal}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Close
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-[#003f87] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0076d3]"
              >
                <i className={`fa-solid ${editingDetail ? 'fa-check' : 'fa-plus'}`}></i>
                {editingDetail ? 'Update Detail' : 'Save Detail'}
              </button>
            </div>
          </form>

          {visibleSavedEntries.length > 0 && (
            <div className="mt-5 border-t border-slate-200 pt-4 dark:border-white/10">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Saved Changes</h4>
                <span className="text-xs text-slate-400">{visibleSavedEntries.length} saved</span>
              </div>
              <div className="max-h-44 space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">
                {visibleSavedEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-white/10 dark:bg-white/5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-[#003f87] shadow-sm dark:bg-white/10 dark:text-blue-200">
                      <i className={`fa-solid ${detailIcon[entry.kind]} text-xs`}></i>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{entry.company}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {entry.replacesDetail ? 'Edited' : entry.label}: {entry.value}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeManualEntry(entry.id)}
                      title={entry.replacesDetail ? `Restore the original ${entry.label.toLowerCase()}` : `Remove ${entry.label.toLowerCase()} from ${entry.company}`}
                      aria-label={entry.replacesDetail ? `Restore the original ${entry.label.toLowerCase()} for ${entry.company}` : `Remove ${entry.label.toLowerCase()} from ${entry.company}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                    >
                      <i className={`fa-solid ${entry.replacesDetail ? 'fa-rotate-left' : 'fa-trash-can'} text-xs`}></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-400">
            Added and edited contacts save automatically in this staff browser. Use Backup above to download a restorable copy.
          </p>
          </div>
        </Modal>,
        document.body,
      )}
    </>
  );
};

export default ContactLookup;
