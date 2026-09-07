import { COMPANY_CONTACTS, normalizeCompanyName, type CompanyContact, type ContactDetail, type ContactDetailKind } from '../data/carrierContacts';

export interface ManualContactEntry extends ContactDetail {
  id: string;
  company: string;
  createdAt: number;
  replacesDetail?: ContactDetail;
}

export interface ContactDocument { entries: ManualContactEntry[]; revision: number }
export interface PendingContactOperation {
  opId: string;
  entryId: string;
  base: ManualContactEntry | null;
  value: ManualContactEntry | null;
  createdAt: number;
}
export interface ContactConflict {
  operationIds: string[];
  entryId: string;
  base: ManualContactEntry | null;
  local: ManualContactEntry | null;
  remote: ManualContactEntry | null;
  competingEntries: ManualContactEntry[];
  reason: string;
}
export type ContactSyncStatus = 'loading' | 'syncing' | 'saved' | 'unsynced' | 'conflict' | 'error';
export interface ContactSnapshot {
  entries: ManualContactEntry[];
  directory: CompanyContact[];
  revision: number | null;
  status: ContactSyncStatus;
  pendingCount: number;
  conflicts: ContactConflict[];
  error: string | null;
}

export const MANUAL_CONTACTS_STORAGE_KEY = 'staff-dashboard-manual-company-contacts';
export const CONTACT_STORAGE_PREFIX = MANUAL_CONTACTS_STORAGE_KEY + ':shared-v1';
export const CONTACT_API_URL = '/api/contacts';
export const CONTACT_LIMITS = { entries: 5000, id: 200, company: 200, label: 160, value: 1000, bodyChars: 2_000_000 } as const;
const CACHE_KEY = CONTACT_STORAGE_PREFIX + ':cache';
const MIGRATION_KEY = CONTACT_STORAGE_PREFIX + ':migration';
const OP_PREFIX = CONTACT_STORAGE_PREFIX + ':op:';
const MAX_BACKUP_BYTES = 5_000_000;
const kinds: ContactDetailKind[] = ['phone', 'fax', 'email', 'website'];
const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const hasKeys = (value: Record<string, unknown>, allowed: string[]) =>
  Object.keys(value).every((key) => allowed.includes(key));
const isText = (value: unknown, limit = Number.POSITIVE_INFINITY): value is string => typeof value === 'string' && !!value.trim() && value.length <= limit;
const isStoredDetail = (value: unknown): value is ContactDetail =>
  isObject(value) && hasKeys(value, ['kind', 'label', 'value']) &&
  kinds.includes(value.kind as ContactDetailKind) && isText(value.label) && isText(value.value);
export const isContactDetail = (value: unknown): value is ContactDetail =>
  isStoredDetail(value) && isText(value.label, CONTACT_LIMITS.label) && isText(value.value, CONTACT_LIMITS.value);
const isStoredEntry = (value: unknown): value is ManualContactEntry =>
  isObject(value) && hasKeys(value, ['id', 'company', 'kind', 'label', 'value', 'createdAt', 'replacesDetail']) &&
  isText(value.id) && isText(value.company) && kinds.includes(value.kind as ContactDetailKind) &&
  isText(value.label) && isText(value.value) && typeof value.createdAt === 'number' &&
  Number.isFinite(value.createdAt) && value.createdAt >= 0 &&
  (value.replacesDetail === undefined || isStoredDetail(value.replacesDetail));
export const isManualContactEntry = (value: unknown): value is ManualContactEntry =>
  isStoredEntry(value) && isText(value.id, CONTACT_LIMITS.id) && isText(value.company, CONTACT_LIMITS.company) &&
  isText(value.label, CONTACT_LIMITS.label) && isText(value.value, CONTACT_LIMITS.value) &&
  (value.replacesDetail === undefined || isContactDetail(value.replacesDetail)) &&
  (value.kind !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.value)) &&
  (value.kind !== 'website' || detailHref(value) !== null);

function validateStoredEntries(value: unknown): ManualContactEntry[] {
  if (!Array.isArray(value) || !value.every(isStoredEntry) ||
      new Set(value.map((entry) => entry.id)).size !== value.length) throw new Error('Invalid stored contacts.');
  return value;
}
export function validateContactUpload(entries: ManualContactEntry[], revision: number) {
  if (entries.length > CONTACT_LIMITS.entries) throw new Error('The shared directory allows at most 5,000 added details and corrections.');
  if (JSON.stringify({ entries, revision }).length > CONTACT_LIMITS.bodyChars) {
    throw new Error('The combined directory exceeds the 2 MB update limit. Nothing was imported or uploaded.');
  }
}

export function validateContactEntries(value: unknown): ManualContactEntry[] {
  if (!Array.isArray(value) || value.length > CONTACT_LIMITS.entries || !value.every(isManualContactEntry) ||
      new Set(value.map((entry) => entry.id)).size !== value.length) {
    throw new Error('Invalid contacts: maximum 5,000 entries, ID/company 200 characters, label 160, value 1,000. Check email/website, unique IDs, timestamps, and original details.');
  }
  return value;
}
export function validateContactDocument(value: unknown): ContactDocument {
  if (!isObject(value) || !hasKeys(value, ['entries', 'revision']) ||
      !Number.isSafeInteger(value.revision) || (value.revision as number) < 0) {
    throw new Error('The shared directory returned an invalid document.');
  }
  return { entries: validateContactEntries(value.entries), revision: value.revision as number };
}
export function parseContactBackup(text: string): ManualContactEntry[] {
  if (new Blob([text]).size > MAX_BACKUP_BYTES) throw new Error('Backup exceeds 5 MB.');
  const value: unknown = JSON.parse(text);
  // Accept the original staff v1 envelope and legacy raw-array exports.
  if (Array.isArray(value)) {
    const entries = validateContactEntries(value);
    validateContactUpload(entries, Number.MAX_SAFE_INTEGER);
    return entries;
  }
  if (!isObject(value) || !hasKeys(value, ['version', 'exportedAt', 'entries']) ||
      value.version !== 1 || typeof value.exportedAt !== 'string' ||
      !Number.isFinite(Date.parse(value.exportedAt))) throw new Error('Invalid contact backup format.');
  const entries = validateContactEntries(value.entries);
  validateContactUpload(entries, Number.MAX_SAFE_INTEGER);
  return entries;
}
export const createContactBackup = (entries: ManualContactEntry[]) =>
  JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), entries: validateStoredEntries(entries) }, null, 2);
export const detailsMatch = (a: ContactDetail, b: ContactDetail) =>
  a.kind === b.kind && a.label.toLowerCase() === b.label.toLowerCase() && a.value.toLowerCase() === b.value.toLowerCase();
const detailEqual = (a?: ContactDetail, b?: ContactDetail) =>
  a === undefined ? b === undefined : !!b && a.kind === b.kind && a.label === b.label && a.value === b.value;
export const entriesEqual = (a: ManualContactEntry | null, b: ManualContactEntry | null) =>
  a === null ? b === null : b !== null && a.id === b.id && a.company === b.company &&
    a.createdAt === b.createdAt && detailEqual(a, b) && detailEqual(a.replacesDetail, b.replacesDetail);
export const companyKey = (company: string) => {
  const key = normalizeCompanyName(company);
  return COMPANY_CONTACTS.find((contact) =>
    [contact.company, ...contact.aliases].some((name) => normalizeCompanyName(name) === key))?.id || key;
};
const correctionKey = (entry: ManualContactEntry | null) => entry?.replacesDetail
  ? JSON.stringify([companyKey(entry.company), entry.replacesDetail.kind,
    entry.replacesDetail.label.toLowerCase(), entry.replacesDetail.value.toLowerCase()])
  : null;

export function mergeManualContacts(entries: ManualContactEntry[]): CompanyContact[] {
  const directory = COMPANY_CONTACTS.map((contact) => ({ ...contact, aliases: [...contact.aliases], details: [...contact.details] }));
  for (const entry of entries) {
    let contact = directory.find((item) => companyKey(item.company) === companyKey(entry.company));
    if (!contact) {
      contact = { id: 'manual-' + companyKey(entry.company), company: entry.company, aliases: [],
        category: 'Saved contact', details: [], source: 'Agency contact directory' };
      directory.push(contact);
    }
    const detail: ContactDetail = { kind: entry.kind, label: entry.label, value: entry.value };
    const index = entry.replacesDetail ? contact.details.findIndex((item) => detailsMatch(item, entry.replacesDetail!)) : -1;
    if (index >= 0) contact.details[index] = detail;
    else if (!contact.details.some((item) => detailsMatch(item, detail))) contact.details.push(detail);
  }
  return directory;
}

export function detailHref(detail: ContactDetail): string | null {
  if (detail.kind === 'phone') {
    const match = detail.value.trim().match(/^(\+?[\d\s().-]+?)(?:\s*(?:ext(?:ension)?\.?|x|#|;ext=)\s*(\d+))?$/i);
    if (!match) return null;
    const number = match[1].replace(/[^\d+]/g, '');
    if (number.replace(/\D/g, '').length < 7) return null;
    return 'tel:' + number + (match[2] ? ';ext=' + match[2] : '');
  }
  if (detail.kind === 'email') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(detail.value) ? 'mailto:' + encodeURIComponent(detail.value).replace('%40', '@') : null;
  }
  if (detail.kind === 'website') {
    try {
      const value = detail.value.trim();
      const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : 'https://' + value);
      return ['https:', 'http:'].includes(url.protocol) && url.hostname.includes('.') &&
        !/\s/.test(value) && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }
  return null;
}

export function projectContactOperations(entries: ManualContactEntry[], operations: PendingContactOperation[]) {
  const result = new Map(entries.map((entry) => [entry.id, entry]));
  for (const operation of operations) {
    if (operation.value) result.set(operation.entryId, operation.value);
    else result.delete(operation.entryId);
  }
  return [...result.values()];
}

export function rebaseContactOperations(document: ContactDocument, operations: PendingContactOperation[]) {
  const groups = new Map<string, PendingContactOperation[]>();
  for (const operation of operations) groups.set(operation.entryId, [...(groups.get(operation.entryId) || []), operation]);
  const conflicts: ContactConflict[] = [];
  for (const [entryId, group] of groups) {
    const base = group[0].base;
    const local = group[group.length - 1].value;
    const remote = document.entries.find((entry) => entry.id === entryId) || null;
    const divergent = group.some((operation, index) => index > 0 && !entriesEqual(operation.base, group[index - 1].value));
    const slot = correctionKey(local);
    const competingEntries = slot ? document.entries.filter((entry) =>
      entry.id !== entryId && correctionKey(entry) === slot &&
      !operations.some((operation) => operation.entryId === entry.id && operation.value === null && entriesEqual(operation.base, entry))
    ) : [];
    // Different IDs can still correct the same built-in detail.
    const competingPending = slot ? [...groups.entries()].some(([id, peers]) =>
      id !== entryId && correctionKey(peers[peers.length - 1].value) === slot) : false;
    if (divergent || (!entriesEqual(remote, base) && !entriesEqual(remote, local)) ||
        competingEntries.length > 0 || competingPending) {
      conflicts.push({ operationIds: group.map((operation) => operation.opId), entryId, base, local, remote, competingEntries,
        reason: divergent || competingPending ? 'Another browser tab changed this detail.' :
          competingEntries.length ? 'Another edit corrects the same original detail.' : 'This detail changed in the shared directory.' });
    }
  }
  return { entries: projectContactOperations(document.entries, operations), conflicts };
}

function validateOperation(value: unknown): PendingContactOperation {
  if (!isObject(value) || !hasKeys(value, ['opId', 'entryId', 'base', 'value', 'createdAt']) ||
      !isText(value.opId) || !isText(value.entryId) || !Number.isSafeInteger(value.createdAt) ||
      (value.base !== null && !isStoredEntry(value.base)) ||
      (value.value !== null && !isStoredEntry(value.value)) ||
      (isStoredEntry(value.base) && value.base.id !== value.entryId) ||
      (isStoredEntry(value.value) && value.value.id !== value.entryId)) throw new Error('Invalid pending contact change. Original browser data has been retained.');
  return value as unknown as PendingContactOperation;
}

/** One store per document; per-operation storage keys prevent cross-tab queue replacement. */
export function createContactDirectoryStore() {
  let remote: ContactDocument | null = null;
  let operations: PendingContactOperation[] = [];
  let legacy: ManualContactEntry[] = [];
  let migration: 'queued' | 'complete' | null = null;
  let initialized = false;
  let storageError: string | null = null;
  let networkError: string | null = null;
  let verified = false;
  let busy = false;
  let active: AbortController | null = null;
  let stopped = true;
  let restartAfterAbort = false;
  let interval: ReturnType<typeof setInterval> | undefined;
  const listeners = new Set<() => void>();
  let snapshot: ContactSnapshot = { entries: [], directory: mergeManualContacts([]), revision: null,
    status: 'loading', pendingCount: 0, conflicts: [], error: null };

  function publish() {
    const base = remote || { entries: legacy, revision: 0 };
    const rebased = rebaseContactOperations(base, operations);
    const error = storageError || networkError;
    const status: ContactSyncStatus = storageError ? 'error' : rebased.conflicts.length ? 'conflict' :
      busy ? 'syncing' : operations.length || migration !== 'complete' ? (initialized ? 'unsynced' : 'loading') :
      error ? 'error' : verified ? 'saved' : 'loading';
    snapshot = { entries: rebased.entries, directory: mergeManualContacts(rebased.entries), revision: remote?.revision ?? null,
      status, pendingCount: operations.length, conflicts: rebased.conflicts, error };
    listeners.forEach((listener) => listener());
  }
  function readStorage() {
    try {
      const rawCache = localStorage.getItem(CACHE_KEY);
      if (rawCache) {
        const cached = validateContactDocument(JSON.parse(rawCache));
        if (!remote || cached.revision >= remote.revision) remote = cached;
      }
      const rawMigration = localStorage.getItem(MIGRATION_KEY);
      if (rawMigration !== null && !['queued', 'complete'].includes(rawMigration)) throw new Error('Invalid migration marker.');
      migration = rawMigration as typeof migration;
      if (!migration) {
        const rawLegacy = localStorage.getItem(MANUAL_CONTACTS_STORAGE_KEY);
        legacy = rawLegacy ? validateStoredEntries(JSON.parse(rawLegacy)) : [];
      }
      const pending: PendingContactOperation[] = [];
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (!key?.startsWith(OP_PREFIX)) continue;
        const operation = validateOperation(JSON.parse(localStorage.getItem(key)!));
        if (key !== OP_PREFIX + operation.opId) throw new Error('Invalid pending contact key.');
        pending.push(operation);
      }
      operations = pending.sort((a, b) => a.createdAt - b.createdAt || a.opId.localeCompare(b.opId));
      storageError = null;
    } catch {
      storageError = 'Browser contact storage is unavailable or invalid. No shared changes will be sent. Keep this browser data and download a backup.';
    }
    initialized = true;
  }
  function persistOperation(entryId: string, base: ManualContactEntry | null, value: ManualContactEntry | null, opId: string = crypto.randomUUID()) {
    const operation: PendingContactOperation = { opId, entryId, base, value,
      createdAt: Math.max(Date.now(), ...operations.map((item) => item.createdAt + 1)) };
    localStorage.setItem(OP_PREFIX + opId, JSON.stringify(operation));
    operations.push(operation);
  }
  function ensureMigration() {
    if (migration) return;
    // Deterministic migration keys make repeat initialization idempotent, even after a crash.
    for (const entry of legacy) {
      const opId = 'migration-' + encodeURIComponent(entry.id);
      if (!localStorage.getItem(OP_PREFIX + opId)) persistOperation(entry.id, null, entry, opId);
    }
    localStorage.setItem(MIGRATION_KEY, 'queued');
    migration = 'queued';
  }
  function prepare() {
    readStorage();
    if (storageError) throw new Error(storageError);
    try { ensureMigration(); } catch {
      storageError = 'The browser could not retain pending contacts. No shared changes were sent.';
      publish();
      throw new Error(storageError);
    }
  }
  function mutate(action: () => void) {
    prepare();
    try { action(); } catch (error) {
      if (error instanceof Error && ['QuotaExceededError', 'SecurityError'].includes(error.name)) {
        storageError = 'The browser could not retain the change. Download a backup before leaving.';
      }
      publish();
      throw error;
    }
    publish();
    void refresh();
  }
  async function request(method: 'GET' | 'PUT', signal: AbortSignal, document?: ContactDocument) {
    const response = await fetch(CONTACT_API_URL, { method, signal, credentials: 'same-origin', cache: 'no-store',
      headers: { Accept: 'application/json', ...(document ? { 'Content-Type': 'application/json' } : {}) },
      ...(document ? { body: JSON.stringify(document) } : {}) });
    if (response.status === 401 || response.status === 403) throw new Error('Sign in again to sync contacts. Pending changes are retained.');
    if (!response.ok && response.status !== 409) throw new Error('Shared contacts are unavailable. Pending changes and the last local copy are retained.');
    const payload: unknown = await response.json();
    const result = validateContactDocument(response.status === 409 && isObject(payload)
      ? { entries: payload.entries, revision: payload.revision } : payload);
    return { document: result, conflict: response.status === 409 };
  }
  function acceptDocument(document: ContactDocument) {
    if (remote && document.revision < remote.revision) throw new Error('An older shared revision was returned. Pending changes are retained.');
    localStorage.setItem(CACHE_KEY, JSON.stringify(document));
    remote = document;
  }
  async function refresh() {
    if (busy) return;
    busy = true;
    const controller = new AbortController();
    active = controller;
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      prepare();
      publish();
      let fetched = await request('GET', controller.signal);
      if (controller.signal.aborted) return;
      acceptDocument(fetched.document);
      verified = true;
      networkError = null;
      // Bounded retries only rebase unrelated entries; same-entry conflicts always stop.
      for (let attempt = 0; attempt < 4; attempt++) {
        readStorage();
        if (storageError) throw new Error(storageError);
        const rebased = rebaseContactOperations(remote!, operations);
        if (rebased.conflicts.length) break;
        if (!operations.length && migration === 'complete') break;
        const sent = [...operations];
        const expectedRevision = remote!.revision;
        validateContactEntries(rebased.entries);
        validateContactUpload(rebased.entries, expectedRevision);
        const result = await request('PUT', controller.signal, { entries: rebased.entries, revision: expectedRevision });
        if (controller.signal.aborted) return;
        if (!result.conflict && (result.document.revision <= expectedRevision ||
            result.document.entries.length !== rebased.entries.length ||
            !rebased.entries.every((entry) => entriesEqual(entry, result.document.entries.find((item) => item.id === entry.id) || null)))) {
          throw new Error('The server did not confirm the exact saved contacts. Pending changes are retained.');
        }
        acceptDocument(result.document);
        if (result.conflict) {
          if (attempt === 3) networkError = 'The directory is changing quickly. Pending changes are retained; retry shortly.';
          continue;
        }
        // Complete migration only after PUT confirmation, before acknowledging its operations.
        localStorage.setItem(MIGRATION_KEY, 'complete');
        migration = 'complete';
        sent.forEach((operation) => localStorage.removeItem(OP_PREFIX + operation.opId));
      }
    } catch (error) {
      if (!controller.signal.aborted || !stopped) {
        networkError = error instanceof Error && error.name !== 'SyntaxError' && error.name !== 'AbortError'
          ? error.message : 'Contact sync did not complete. Pending changes and the last local copy are retained.';
      }
    } finally {
      clearTimeout(timeout);
      if (active === controller) active = null;
      busy = false;
      readStorage();
      publish();
      if (restartAfterAbort && listeners.size) {
        restartAfterAbort = false;
        void refresh();
      }
    }
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(CONTACT_STORAGE_PREFIX) || event.key === MANUAL_CONTACTS_STORAGE_KEY) {
      readStorage();
      publish();
      if (document.visibilityState === 'visible') void refresh();
    }
  };
  const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
  function subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1) {
      stopped = false;
      if (active?.signal.aborted) restartAfterAbort = true;
      readStorage();
      publish();
      window.addEventListener('storage', onStorage);
      window.addEventListener('online', onVisible);
      document.addEventListener('visibilitychange', onVisible);
      interval = setInterval(onVisible, 60000);
      void refresh();
    }
    return () => {
      listeners.delete(listener);
      if (!listeners.size) {
        stopped = true;
        active?.abort();
        clearInterval(interval);
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('online', onVisible);
        document.removeEventListener('visibilitychange', onVisible);
      }
    };
  }
  return {
    subscribe,
    getSnapshot: () => snapshot,
    refresh,
    upsertEntry(entry: ManualContactEntry, expectedBase?: ManualContactEntry | null) {
      validateContactEntries([entry]);
      mutate(() => {
        const current = projectContactOperations(remote?.entries || legacy, operations).find((item) => item.id === entry.id) || null;
        if (entriesEqual(current, entry)) return;
        const projected = projectContactOperations(remote?.entries || legacy, operations);
        validateContactUpload([...projected.filter((item) => item.id !== entry.id), entry], Number.MAX_SAFE_INTEGER);
        persistOperation(entry.id, expectedBase === undefined ? current : expectedBase, entry);
      });
    },
    removeEntry(id: string) {
      mutate(() => {
        const current = projectContactOperations(remote?.entries || legacy, operations).find((item) => item.id === id);
        if (current) persistOperation(id, current, null);
      });
    },
    resolveConflict(operationIds: string[], choice: 'remote' | 'local') {
      mutate(() => {
        const conflict = rebaseContactOperations(remote || { entries: legacy, revision: 0 }, operations).conflicts
          .find((item) => item.operationIds.length === operationIds.length && item.operationIds.every((id) => operationIds.includes(id)));
        if (!conflict) throw new Error('The conflict changed. Review the latest values before choosing.');
        if (choice === 'local') {
          conflict.competingEntries.forEach((entry) => persistOperation(entry.id, entry, null));
          persistOperation(conflict.entryId, conflict.remote, conflict.local);
        }
        operationIds.forEach((id) => localStorage.removeItem(OP_PREFIX + id));
        readStorage();
      });
    },
    importBackup(text: string) {
      const imported = parseContactBackup(text);
      let added = 0;
      mutate(() => {
        const current = projectContactOperations(remote?.entries || legacy, operations);
        const merged = new Map(current.map((entry) => [entry.id, entry]));
        imported.forEach((entry) => merged.set(entry.id, entry));
        validateContactUpload([...merged.values()], Number.MAX_SAFE_INTEGER);
        for (const entry of imported) {
          if (current.some((item) => entriesEqual(item, entry))) continue;
          // Imports never implicitly replace a different entry with the same ID.
          persistOperation(entry.id, null, entry);
          added++;
        }
      });
      return added;
    },
    exportBackup: () => createContactBackup(snapshot.entries),
  };
}

export const contactDirectoryStore = createContactDirectoryStore();
