// A null value is a deletion tombstone. Overrides exist only when a persistent
// write/remove failed, so a successful storage event from another tab can still
// be observed normally.
const memoryOverrides = new Map<string, string | null>();

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
