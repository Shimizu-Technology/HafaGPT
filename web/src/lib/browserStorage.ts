const UNKNOWN_PERSISTED_VALUE = Symbol('unknown-persisted-value');

type PersistedValue = string | null | typeof UNKNOWN_PERSISTED_VALUE;

interface MemoryOverride {
  value: string | null;
  persistedValueAtAttempt: PersistedValue;
  operationVersion: string;
}

const VERSION_KEY_PREFIX = '__hafagpt_storage_version__:';
const VERSION_TIME_WIDTH = 16;
const VERSION_SEQUENCE_WIDTH = 8;
const tabId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? crypto.randomUUID()
  : Math.random().toString(36).slice(2);
let lastVersionTime = 0;
let versionSequence = 0;

const getVersionKey = (key: string) => `${VERSION_KEY_PREFIX}${key}`;

const nextOperationVersion = (): string => {
  const currentTime = Math.max(Date.now(), lastVersionTime);
  if (currentTime === lastVersionTime) {
    versionSequence += 1;
  } else {
    lastVersionTime = currentTime;
    versionSequence = 0;
  }

  return [
    currentTime.toString().padStart(VERSION_TIME_WIDTH, '0'),
    versionSequence.toString().padStart(VERSION_SEQUENCE_WIDTH, '0'),
    tabId,
  ].join(':');
};

// A null override value is a deletion tombstone. The persisted snapshot lets
// storage events distinguish a newer cross-tab change from an older event that
// was merely delivered after the failed local operation. The snapshot is taken
// at the operation boundary so concurrent changes after the attempt starts win.
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
      : [event.key.startsWith(VERSION_KEY_PREFIX)
        ? event.key.slice(VERSION_KEY_PREFIX.length)
        : event.key];

    affectedKeys.forEach((key) => {
      const override = memoryOverrides.get(key);
      if (!override) {
        return;
      }

      try {
        const persistedVersion = localStorage.getItem(getVersionKey(key));
        if (persistedVersion && persistedVersion > override.operationVersion) {
          memoryOverrides.delete(key);
          return;
        }

        const persistedValue = localStorage.getItem(key);
        if (
          override.persistedValueAtAttempt !== UNKNOWN_PERSISTED_VALUE
          && persistedValue !== override.persistedValueAtAttempt
        ) {
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
    const operationVersion = nextOperationVersion();
    const persistedValueAtAttempt = readPersistedValue(key);
    try {
      window.localStorage.setItem(key, value);
      window.localStorage.setItem(getVersionKey(key), operationVersion);
      memoryOverrides.delete(key);
      return true;
    } catch {
      memoryOverrides.set(key, {
        value,
        persistedValueAtAttempt,
        operationVersion,
      });
      return false;
    }
  },

  remove(key: string): boolean {
    const operationVersion = nextOperationVersion();
    const persistedValueAtAttempt = readPersistedValue(key);
    try {
      window.localStorage.removeItem(key);
      window.localStorage.setItem(getVersionKey(key), operationVersion);
      memoryOverrides.delete(key);
      return true;
    } catch {
      memoryOverrides.set(key, {
        value: null,
        persistedValueAtAttempt,
        operationVersion,
      });
      return false;
    }
  },
};
