import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserStorage } from './browserStorage';

describe('browserStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('uses persistent local storage when it is available', () => {
    expect(browserStorage.set('storage-test-persistent', 'saved')).toBe(true);
    expect(browserStorage.get('storage-test-persistent')).toBe('saved');
    expect(window.localStorage.getItem('storage-test-persistent')).toBe('saved');
  });

  it('falls back to in-memory state when the browser rejects storage access', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });

    expect(browserStorage.set('storage-test-fallback', 'kept')).toBe(false);
    expect(browserStorage.get('storage-test-fallback')).toBe('kept');
  });

  it('keeps a failed write newer than a stale readable persistent value', () => {
    window.localStorage.setItem('storage-test-stale-write', 'old');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is read-only', 'QuotaExceededError');
    });

    expect(browserStorage.set('storage-test-stale-write', 'new')).toBe(false);
    expect(window.localStorage.getItem('storage-test-stale-write')).toBe('old');
    expect(browserStorage.get('storage-test-stale-write')).toBe('new');
  });

  it('removes fallback state even when persistent storage is unavailable', () => {
    window.localStorage.setItem('storage-test-remove', 'temporary');
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });

    expect(browserStorage.remove('storage-test-remove')).toBe(false);
    expect(window.localStorage.getItem('storage-test-remove')).toBe('temporary');
    expect(browserStorage.get('storage-test-remove')).toBeNull();
  });

  it('reconciles a failed operation with a successful update from another tab', () => {
    window.localStorage.setItem('storage-test-external-update', 'old');
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is read-only', 'QuotaExceededError');
    });

    expect(browserStorage.set('storage-test-external-update', 'local-fallback')).toBe(false);
    expect(browserStorage.get('storage-test-external-update')).toBe('local-fallback');

    setItem.mockRestore();
    window.localStorage.setItem('storage-test-external-update', 'external-update');

    window.dispatchEvent(new StorageEvent('storage', {
      key: 'storage-test-external-update',
      oldValue: 'old',
      newValue: 'external-update',
      storageArea: window.localStorage,
    }));

    expect(browserStorage.get('storage-test-external-update')).toBe('external-update');

    window.localStorage.removeItem('storage-test-external-update');
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'storage-test-external-update',
      oldValue: 'external-update',
      newValue: null,
      storageArea: window.localStorage,
    }));

    expect(browserStorage.get('storage-test-external-update')).toBeNull();
  });

  it('does not let a delayed older event overwrite a newer failed operation', () => {
    window.localStorage.setItem('storage-test-delayed-event', 'external-before-failure');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is read-only', 'QuotaExceededError');
    });

    expect(browserStorage.set('storage-test-delayed-event', 'newer-local-fallback')).toBe(false);

    window.dispatchEvent(new StorageEvent('storage', {
      key: 'storage-test-delayed-event',
      oldValue: 'older-value',
      newValue: 'external-before-failure',
      storageArea: window.localStorage,
    }));

    expect(browserStorage.get('storage-test-delayed-event')).toBe('newer-local-fallback');
  });

  it('observes an external update concurrent with a failed local operation', () => {
    let persistedValue = 'before-attempt';
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => persistedValue);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      persistedValue = 'concurrent-external-update';
      throw new DOMException('Storage is read-only', 'QuotaExceededError');
    });

    expect(browserStorage.set('storage-test-concurrent-update', 'failed-local-value')).toBe(false);
    expect(browserStorage.get('storage-test-concurrent-update')).toBe('failed-local-value');

    window.dispatchEvent(new StorageEvent('storage', {
      key: 'storage-test-concurrent-update',
      oldValue: 'before-attempt',
      newValue: 'concurrent-external-update',
      storageArea: window.localStorage,
    }));

    expect(browserStorage.get('storage-test-concurrent-update')).toBe('concurrent-external-update');
  });

  it('reconciles an unreadable baseline after persistent storage recovers', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });

    expect(browserStorage.set('storage-test-recovered-baseline', 'temporary-fallback')).toBe(false);
    expect(browserStorage.get('storage-test-recovered-baseline')).toBe('temporary-fallback');

    getItem.mockRestore();
    setItem.mockRestore();
    window.localStorage.setItem('storage-test-recovered-baseline', 'durable-external-value');
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'storage-test-recovered-baseline',
      oldValue: null,
      newValue: 'durable-external-value',
      storageArea: window.localStorage,
    }));

    expect(browserStorage.get('storage-test-recovered-baseline')).toBe('durable-external-value');
  });
});
