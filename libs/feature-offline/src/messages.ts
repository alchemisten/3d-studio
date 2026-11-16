import type { OfflineLocale } from './config';

export interface OfflineMessages {
  save: string;
  saving: string;
  saved: string;
  update: string;
  stale: string;
  remove: string;
  retry: string;
  error: string;
  offline: string;
  online: string;
  notSaved: string;
  unavailable: string;
}

export const offlineMessages: Record<OfflineLocale, OfflineMessages> = {
  en: {
    save: 'Make available offline',
    saving: 'Saving for offline use',
    saved: 'Available offline',
    update: 'Update offline copy',
    stale: 'Offline copy is outdated',
    remove: 'Remove offline copy',
    retry: 'Retry saving for offline use',
    error: 'Saving for offline use failed',
    offline: 'Offline',
    online: 'Online',
    notSaved: 'Not saved for offline use',
    unavailable: 'Offline use is not available',
  },
  de: {
    save: 'Offline verfügbar machen',
    saving: 'Wird offline gespeichert',
    saved: 'Offline verfügbar',
    update: 'Offline-Kopie aktualisieren',
    stale: 'Offline-Kopie ist veraltet',
    remove: 'Offline-Kopie entfernen',
    retry: 'Offline-Speichern wiederholen',
    error: 'Offline-Speichern fehlgeschlagen',
    offline: 'Offline',
    online: 'Online',
    notSaved: 'Nicht offline gespeichert',
    unavailable: 'Offline-Nutzung ist nicht verfügbar',
  },
};
