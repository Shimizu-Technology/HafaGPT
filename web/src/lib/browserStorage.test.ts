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
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is read-only', 'QuotaExceededError');
    });

    expect(browserStorage.set('storage-test-external-update', 'local-fallback')).toBe(false);
    expect(browserStorage.get('storage-test-external-update')).toBe('local-fallback');

    window.dispatchEvent(new StorageEvent('storage', {
      key: 'storage-test-external-update',
      oldValue: 'old',
      newValue: 'external-update',
      storageArea: window.localStorage,
    }));

    expect(browserStorage.get('storage-test-external-update')).toBe('external-update');

    window.dispatchEvent(new StorageEvent('storage', {
      key: 'storage-test-external-update',
      oldValue: 'external-update',
      newValue: null,
      storageArea: window.localStorage,
    }));

    expect(browserStorage.get('storage-test-external-update')).toBeNull();
  });
});
