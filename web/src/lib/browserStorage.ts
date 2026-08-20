const UNKNOWN_PERSISTED_VALUE = Symbol('unknown-persisted-value');

type PersistedValue = string | null | typeof UNKNOWN_PERSISTED_VALUE;

interface MemoryOverride {
  value: string | null;
  persistedValueAtFailure: PersistedValue;
}

// A null override value is a deletion tombstone. The persisted snapshot lets
// storage events distinguish a newer cross-tab change from an older event that
// was merely delivered after the failed local operation.
const memoryOverrides = new Map<string, MemoryOverride>();

const readPersistedValue = (key: string): PersistedValue => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return UNKNOWN_PERSISTED_VALUE;
  }
};

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

    const affectedKeys = event.key === null
      ? Array.from(memoryOverrides.keys())
      : [event.key];

    affectedKeys.forEach((key) => {
      const override = memoryOverrides.get(key);
      if (!override || override.persistedValueAtFailure === UNKNOWN_PERSISTED_VALUE) {
        return;
      }

      try {
        if (localStorage.getItem(key) !== override.persistedValueAtFailure) {
          memoryOverrides.delete(key);
        }
      } catch {
        // Keep the newer in-memory operation while persistent storage is unreadable.
      }
    });
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
      return memoryOverrides.get(key)?.value ?? null;
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
      memoryOverrides.set(key, {
        value,
        persistedValueAtFailure: readPersistedValue(key),
      });
      return false;
    }
  },

  remove(key: string): boolean {
    try {
      window.localStorage.removeItem(key);
      memoryOverrides.delete(key);
      return true;
    } catch {
      memoryOverrides.set(key, {
        value: null,
        persistedValueAtFailure: readPersistedValue(key),
      });
      return false;
    }
  },
};
