/**
 * Browser storage is optional. Safari and Chrome profiles can temporarily
 * reject access (privacy settings, a damaged profile, or quota failures), so
 * learner-facing flows must keep working without it.
 *
 * Failed mutations deliberately do not create shadow state. Native storage
 * events do not carry enough ordering information to reconcile an in-memory
 * value safely across cached app versions or multiple tabs. Callers keep their
 * immediate UI state in React and can use the boolean result when persistence
 * status matters.
 */
export const browserStorage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set(key: string, value: string): boolean {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  remove(key: string): boolean {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
};
