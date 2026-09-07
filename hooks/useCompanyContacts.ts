import { useSyncExternalStore } from 'react';
import { contactDirectoryStore } from '../services/contactDirectory';

export type { ManualContactEntry, ContactConflict, ContactSyncStatus } from '../services/contactDirectory';

// The palette and contact manager share one snapshot, queue, and refresh lifecycle.
export function useCompanyContacts() {
  const snapshot = useSyncExternalStore(contactDirectoryStore.subscribe, contactDirectoryStore.getSnapshot, contactDirectoryStore.getSnapshot);
  return {
    ...snapshot,
    upsertEntry: contactDirectoryStore.upsertEntry,
    removeEntry: contactDirectoryStore.removeEntry,
    refresh: contactDirectoryStore.refresh,
    resolveConflict: contactDirectoryStore.resolveConflict,
    importBackup: contactDirectoryStore.importBackup,
    exportBackup: contactDirectoryStore.exportBackup,
  };
}

