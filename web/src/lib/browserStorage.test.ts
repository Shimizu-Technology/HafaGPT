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

  it('fails safely when the browser rejects storage access', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });

    expect(browserStorage.set('storage-test-unavailable', 'not-persisted')).toBe(false);
    expect(browserStorage.get('storage-test-unavailable')).toBeNull();
  });

  it('does not shadow durable state when a write fails', () => {
    window.localStorage.setItem('storage-test-failed-write', 'durable-value');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is read-only', 'QuotaExceededError');
    });

    expect(browserStorage.set('storage-test-failed-write', 'failed-value')).toBe(false);
    expect(browserStorage.get('storage-test-failed-write')).toBe('durable-value');
  });

  it('does not hide durable state when a removal fails', () => {
    window.localStorage.setItem('storage-test-failed-remove', 'durable-value');
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });

    expect(browserStorage.remove('storage-test-failed-remove')).toBe(false);
    expect(browserStorage.get('storage-test-failed-remove')).toBe('durable-value');
  });
});
