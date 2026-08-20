// A null value is a deletion tombstone. Overrides exist only when a persistent
// write/remove failed, so a successful storage event from another tab can still
// be observed normally.
const memoryOverrides = new Map<string, string | null>();

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    let localStorage: Storage;
    try {
      localStorage = window.localStorage;
    } catch {
      return;
    }

    if (event.storageArea !== localStorage) {
      return;
    }

    if (event.key === null) {
      memoryOverrides.clear();
      return;
    }

    if (memoryOverrides.has(event.key)) {
      memoryOverrides.set(event.key, event.newValue);
    }
  });
}

/**
 * Browser storage is optional. Safari and Chrome profiles can temporarily
 * reject access (privacy settings, a damaged profile, or quota failures), so
 * learner-facing flows must keep working without it.
 */
export const browserStorage = {
  get(key: string): string | null {
    if (memoryOverrides.has(key)) {
      return memoryOverrides.get(key) ?? null;
    }

    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set(key: string, value: string): boolean {
    try {
      window.localStorage.setItem(key, value);
      memoryOverrides.delete(key);
      return true;
    } catch {
      memoryOverrides.set(key, value);
      return false;
    }
  },

  remove(key: string): boolean {
    try {
      window.localStorage.removeItem(key);
      memoryOverrides.delete(key);
      return true;
    } catch {
      memoryOverrides.set(key, null);
      return false;
    }
  },
};
