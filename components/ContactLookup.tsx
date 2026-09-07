import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCompanyContacts } from '../hooks/useCompanyContacts';
import { CONTACT_LIMITS, companyKey, detailHref, detailsMatch, type ManualContactEntry } from '../services/contactDirectory';
import { findCompanyContacts, type ContactDetail, type ContactDetailKind } from '../data/carrierContacts';

interface ContactLookupProps {
  query: string;
  onQueryChange: (query: string) => void;
  addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
}
interface ContactForm { company: string; kind: ContactDetailKind; label: string; value: string }
interface EditingDetail { entry: ManualContactEntry | null; original: ContactDetail }
const labels: Record<ContactDetailKind, string> = { phone: 'Customer service', fax: 'Fax', email: 'Email', website: 'Website' };
const icons: Record<ContactDetailKind, string> = { phone: 'fa-phone', fax: 'fa-fax', email: 'fa-envelope', website: 'fa-globe' };
const emptyForm = (company = ''): ContactForm => ({ company, kind: 'phone', label: labels.phone, value: '' });
const button = 'inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-white/20 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10';
const primary = button + ' !border-transparent !bg-[#003f87] !text-white hover:!bg-[#0076d3]';
const field = 'min-h-[44px] w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-white/20 dark:bg-slate-900 dark:text-white';
const readable = 'min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]';
const statusLabels = { loading: 'Checking shared contacts', syncing: 'Syncing', saved: 'Saved to shared directory',
  unsynced: 'Unsynced changes', conflict: 'Review conflicting changes', error: 'Not synced' };
const Icon = ({ name }: { name: string }) => <i aria-hidden="true" className={'fa-solid ' + name} />;

const ContactLookup: React.FC<ContactLookupProps> = ({ query, onQueryChange, addToast }) => {
  const contacts = useCompanyContacts();
  const { entries, directory } = contacts;
  const [open, setOpen] = useState(false);
  const [managedCompany, setManagedCompany] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>(emptyForm());
  const [editing, setEditing] = useState<EditingDetail | null>(null);
  const [formError, setFormError] = useState('');
  const [removeId, setRemoveId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backupInput = useRef<HTMLInputElement>(null);
  const companyInput = useRef<HTMLInputElement>(null);
  const labelInput = useRef<HTMLInputElement>(null);
  const removalPrompt = useRef<HTMLDivElement>(null);
  const id = useId();
  const matches = useMemo(() => query.trim() ? findCompanyContacts(query, directory) : directory, [query, directory]);
  const managed = directory.find((contact) => managedCompany && companyKey(contact.company) === companyKey(managedCompany));
  const saved = managedCompany ? entries.filter((entry) => companyKey(entry.company) === companyKey(managedCompany)) : entries;
  const pendingRemoval = entries.find((entry) => entry.id === removeId);

  useEffect(() => {
    if (removeId) {
      removalPrompt.current?.focus();
      removalPrompt.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [removeId]);

  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    companyInput.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open]);

  function openManager(company?: string) {
    setManagedCompany(company || null);
    setForm(emptyForm(company || (matches.length === 1 ? matches[0].company : '')));
    setEditing(null);
    setRemoveId(null);
    setFormError('');
    setOpen(true);
  }
  function beginEdit(company: string, detail: ContactDetail) {
    const entry = entries.find((item) => companyKey(item.company) === companyKey(company) && detailsMatch(item, detail)) || null;
    setEditing({ entry, original: entry?.replacesDetail || detail });
    setForm({ company, kind: detail.kind, label: detail.label, value: detail.value });
    setFormError('');
    labelInput.current?.focus();
  }
  async function copyValue(detail: ContactDetail) {
    try { await navigator.clipboard.writeText(detail.value); addToast(detail.label + ' copied.', 'success'); }
    catch { addToast('Clipboard unavailable. Select and copy the displayed value.', 'warning'); }
  }
  function downloadBackup() {
    try {
      const url = URL.createObjectURL(new Blob([contacts.exportBackup()], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'agency-contact-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { addToast('The backup could not be created. Keep this browser open.', 'danger'); }
  }
  async function restoreBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error('Backup exceeds 5 MB.');
      const count = contacts.importBackup(await file.text());
      addToast(count ? count + ' changes queued. Review any conflicts before syncing.' : 'The backup contains no new changes.', 'info');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Invalid backup. Nothing was imported.', 'danger');
    }
  }
  function save(event: React.FormEvent) {
    event.preventDefault();
    const value = form.value.trim();
    const company = form.company.trim();
    const label = form.label.trim();
    if (!company || !label || !value) { setFormError('Company, label, and contact detail are required.'); return; }
    if (form.kind === 'email' && !detailHref({ ...form, value })) { setFormError('Enter a complete email address.'); return; }
    if (form.kind === 'website' && !detailHref({ ...form, value })) { setFormError('Enter an HTTP or HTTPS website address.'); return; }
    const found = directory.find((contact) => companyKey(contact.company) === companyKey(company));
    if (found?.details.some((detail) => detailsMatch(detail, { ...form, label, value }) &&
        (!editing || !detailsMatch(detail, editing.entry || editing.original)))) {
      setFormError('That contact detail already exists.');
      return;
    }
    const entry: ManualContactEntry = {
      ...(editing?.entry || { id: crypto.randomUUID(), createdAt: Date.now() }),
      company: found?.company || company, kind: form.kind, label, value,
      ...(editing && !editing.entry ? { replacesDetail: editing.original } : {}),
    };
    try {
      contacts.upsertEntry(entry, editing?.entry || null);
      onQueryChange(entry.company);
      setForm(emptyForm(entry.company));
      setEditing(null);
      setFormError('');
      addToast('Contact change queued for sync.', 'info');
    } catch (error) { setFormError(error instanceof Error ? error.message : 'Could not retain this change.'); }
  }
  function confirmRemoval() {
    if (!pendingRemoval) return;
    try {
      contacts.removeEntry(pendingRemoval.id);
      if (editing?.entry?.id === pendingRemoval.id) { setEditing(null); setForm(emptyForm(managedCompany || '')); }
      setRemoveId(null);
      addToast('Removal queued for sync.', 'info');
    } catch (error) { setFormError(error instanceof Error ? error.message : 'Could not retain this removal.'); }
  }
  function resolve(operationIds: string[], choice: 'remote' | 'local') {
    try { contacts.resolveConflict(operationIds, choice); }
    catch (error) { addToast(error instanceof Error ? error.message : 'Conflict changed. Reload and review.', 'warning'); }
  }
  function syncPanel() {
    return <div className="space-y-3 border-b border-slate-200 py-3 dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="status" className={'text-sm font-semibold ' + (contacts.status === 'saved' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200')}>
          <Icon name={contacts.status === 'saved' ? 'fa-circle-check' : 'fa-cloud-arrow-up'} />{' '}
          {statusLabels[contacts.status]}{contacts.pendingCount > 0 && ' (' + contacts.pendingCount + ')'}
        </p>
        <button type="button" className={button} onClick={() => void contacts.refresh()} disabled={contacts.status === 'syncing'}
          title="Reload shared contacts and retry pending changes" aria-label="Reload shared contacts"><Icon name="fa-rotate" /></button>
      </div>
      {contacts.error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{contacts.error}</p>}
      {contacts.conflicts.map((conflict) => <div key={conflict.entryId} className="border-l-4 border-amber-500 pl-3">
        <p className={'text-sm font-bold ' + readable}>{(conflict.local || conflict.remote || conflict.base)?.company}: {conflict.reason}</p>
        <dl className={'my-2 space-y-1 text-sm ' + readable}>
          <div><dt className="inline font-semibold">Pending: </dt><dd className="inline">{conflict.local ? conflict.local.label + ': ' + conflict.local.value : 'Remove detail'}</dd></div>
          <div><dt className="inline font-semibold">Shared: </dt><dd className="inline">{conflict.remote ? conflict.remote.label + ': ' + conflict.remote.value : 'No entry (removed or not yet added)'}</dd></div>
          {conflict.competingEntries.map((entry) => <div key={entry.id}><dt className="inline font-semibold">Other correction: </dt><dd className="inline">{entry.label}: {entry.value}</dd></div>)}
        </dl>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} onClick={() => resolve(conflict.operationIds, 'remote')}>Use shared</button>
          <button type="button" className={button} onClick={() => {
            if (window.confirm('Replace the displayed shared version with your pending change?')) resolve(conflict.operationIds, 'local');
          }}>Keep my change</button>
        </div>
      </div>)}
    </div>;
  }
  function detailValue(detail: ContactDetail) {
    const href = detailHref(detail);
    return href ? <a href={href} target={detail.kind === 'website' ? '_blank' : undefined}
      rel={detail.kind === 'website' ? 'noopener noreferrer' : undefined}
      className={readable + ' block text-sm font-semibold text-[#005eb8] hover:underline dark:text-blue-300'}>{detail.value}</a>
      : <span className={readable + ' block text-sm font-semibold'}>{detail.value}</span>;
  }

  return <>
    <section aria-label="Company contact search results" className="mt-3 min-w-0 text-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 py-3 dark:border-white/10">
        <div><h3 className="text-base font-bold"><Icon name="fa-address-book" /> Company Contacts</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{directory.length} companies</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} onClick={downloadBackup} title="Download contact backup"><Icon name="fa-download" /> Backup</button>
          <button type="button" className={button} onClick={() => backupInput.current?.click()} title="Merge contact backup" aria-label="Restore contact backup"><Icon name="fa-upload" /></button>
          <button type="button" className={primary} onClick={() => openManager()}><Icon name="fa-plus" /> Add Contact</button>
        </div>
      </div>
      <input ref={backupInput} type="file" accept="application/json,.json" onChange={restoreBackup} className="hidden" aria-label="Contact backup file" />
      {syncPanel()}
      {matches.length === 0 ? <p className="py-5 text-sm">No companies match "{query.trim()}".</p> :
        <div aria-label="Company contacts" tabIndex={0} className="grid max-h-[32rem] min-w-0 gap-3 overflow-y-auto overscroll-contain py-3 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 lg:grid-cols-2">
          {matches.map((contact) => <article key={contact.id} className="min-w-0 rounded-lg border border-slate-200 p-3 dark:border-white/15">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className={readable}><h4 className="text-sm font-bold">{contact.company}</h4>
                {contact.address && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{contact.address}</p>}</div>
              <button type="button" className={button} onClick={() => openManager(contact.company)}
                title={'Manage ' + contact.company} aria-label={'Manage ' + contact.company}><Icon name="fa-pen" /></button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-white/10">
              {contact.details.map((detail, index) => <div key={index} className="flex min-w-0 items-center gap-2 py-2">
                <div className={readable + ' flex-1'}>
                  <p className="mb-1 text-xs text-slate-500 dark:text-slate-400"><Icon name={icons[detail.kind]} /> {detail.label}</p>
                  {detailValue(detail)}
                </div>
                <button type="button" className={button} onClick={() => void copyValue(detail)}
                  title={'Copy ' + detail.label} aria-label={'Copy ' + detail.label + ' for ' + contact.company}><Icon name="fa-copy" /></button>
              </div>)}
            </div>
          </article>)}
        </div>}
    </section>
    {open && createPortal(<dialog ref={dialogRef} aria-modal="true" aria-labelledby={id + '-title'} onCancel={() => setOpen(false)}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-xl overflow-y-auto overscroll-contain rounded-lg border border-slate-300 bg-white p-4 text-slate-900 shadow-2xl backdrop:bg-black/60 dark:border-white/20 dark:bg-slate-900 dark:text-white sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 id={id + '-title'} className={readable + ' text-lg font-bold'}>{managed ? 'Manage ' + managed.company : 'Add Company Contact'}</h2>
        <button type="button" className={button} onClick={() => setOpen(false)} title="Close contact manager" aria-label="Close contact manager"><Icon name="fa-xmark" /></button>
      </div>
      {syncPanel()}
      <form onSubmit={save} className="space-y-4 py-4">
        <div><label htmlFor={id + '-company'} className="mb-1 block text-sm font-semibold">Company name</label>
          <input ref={companyInput} id={id + '-company'} className={field} required maxLength={CONTACT_LIMITS.company} readOnly={!!managedCompany}
            value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} /></div>
        {editing && <div className="flex flex-wrap items-center justify-between gap-2 border-l-4 border-blue-500 pl-3">
          <p className="text-sm font-semibold">Editing detail</p>
          <button type="button" className={button} onClick={() => { setEditing(null); setForm(emptyForm(form.company)); setFormError(''); }}>Cancel edit</button>
        </div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label htmlFor={id + '-kind'} className="mb-1 block text-sm font-semibold">Contact type</label>
            <select id={id + '-kind'} className={field} value={form.kind} onChange={(event) => {
              const kind = event.target.value as ContactDetailKind;
              setForm({ ...form, kind, label: labels[kind] });
            }}><option value="phone">Phone</option><option value="fax">Fax</option><option value="email">Email</option><option value="website">Website</option></select></div>
          <div><label htmlFor={id + '-label'} className="mb-1 block text-sm font-semibold">Label</label>
            <input ref={labelInput} id={id + '-label'} className={field} required maxLength={CONTACT_LIMITS.label} value={form.label}
              onChange={(event) => setForm({ ...form, label: event.target.value })} /></div>
        </div>
        <div><label htmlFor={id + '-value'} className="mb-1 block text-sm font-semibold">Contact detail</label>
          <input id={id + '-value'} className={field} required maxLength={CONTACT_LIMITS.value} type={form.kind === 'email' ? 'email' : 'text'}
            inputMode={form.kind === 'phone' || form.kind === 'fax' ? 'tel' : form.kind === 'email' ? 'email' : 'text'}
            value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })}
            aria-invalid={!!formError} aria-describedby={formError ? id + '-error' : undefined} /></div>
        {formError && <p id={id + '-error'} role="alert" className="text-sm text-rose-700 dark:text-rose-300">{formError}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={button} onClick={downloadBackup} title="Download contact backup"><Icon name="fa-download" /> Backup</button>
          <button type="submit" className={primary}><Icon name={editing ? 'fa-check' : 'fa-plus'} />{editing ? 'Update Detail' : 'Save Detail'}</button>
        </div>
      </form>
      {managed && <div className="border-t border-slate-200 py-4 dark:border-white/10">
        <h3 className="mb-2 text-sm font-bold">Current Details</h3>
        <div className="divide-y divide-slate-100 dark:divide-white/10">{managed.details.map((detail, index) => <div key={index} className="flex min-w-0 items-center gap-2 py-2">
          <div className={readable + ' flex-1'}><p className="text-xs text-slate-500 dark:text-slate-400">{detail.label}</p>{detailValue(detail)}</div>
          <button type="button" className={button} onClick={() => beginEdit(managed.company, detail)} title={'Edit ' + detail.label} aria-label={'Edit ' + detail.label}><Icon name="fa-pen" /></button>
        </div>)}</div>
      </div>}
      <div className="border-t border-slate-200 py-4 dark:border-white/10">
        <h3 className="mb-2 text-sm font-bold">Added Details and Corrections</h3>
        {!saved.length && <p className="text-sm text-slate-500 dark:text-slate-400">No added details or corrections.</p>}
        {pendingRemoval && <div ref={removalPrompt} tabIndex={-1} role="alert" className="my-3 border-l-4 border-rose-500 pl-3">
          <p className={readable + ' text-sm'}>{pendingRemoval.replacesDetail ? 'Restore the original detail' : 'Remove this detail'} for {pendingRemoval.company}: {pendingRemoval.value}?</p>
          <div className="mt-2 flex flex-wrap gap-2"><button type="button" className={button} onClick={() => setRemoveId(null)}>Cancel</button>
            <button type="button" className={button + ' !text-rose-700'} onClick={confirmRemoval}>{pendingRemoval.replacesDetail ? 'Restore original' : 'Remove detail'}</button></div>
        </div>}
        <div className="divide-y divide-slate-100 dark:divide-white/10">{saved.map((entry) => <div key={entry.id} className="flex min-w-0 items-center gap-2 py-2">
          <div className={readable + ' flex-1'}><p className="text-sm font-semibold">{entry.company}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{entry.label}{entry.replacesDetail ? ' (correction)' : ''}</p>{detailValue(entry)}</div>
          <button type="button" className={button} onClick={() => beginEdit(entry.company, entry)} title={'Edit ' + entry.label} aria-label={'Edit added ' + entry.label}><Icon name="fa-pen" /></button>
          <button type="button" className={button} onClick={() => setRemoveId(entry.id)} title={entry.replacesDetail ? 'Restore original detail' : 'Remove detail'}
            aria-label={(entry.replacesDetail ? 'Restore original ' : 'Remove ') + entry.label + ' for ' + entry.company}><Icon name={entry.replacesDetail ? 'fa-rotate-left' : 'fa-trash-can'} /></button>
        </div>)}</div>
      </div>
    </dialog>, document.body)}
  </>;
};
export default ContactLookup;
