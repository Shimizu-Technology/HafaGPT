import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClientAttemptId } from './clientAttemptId';

describe('createClientAttemptId', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates distinct UUIDs suitable for idempotency keys', () => {
    const first = createClientAttemptId();
    const second = createClientAttemptId();
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    expect(first).toMatch(uuidPattern);
    expect(second).toMatch(uuidPattern);
    expect(first).not.toBe(second);
  });

  it('creates a valid v4 UUID when randomUUID is unavailable', () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.set(Array.from({ length: 16 }, (_value, index) => index));
      return bytes;
    });
    vi.stubGlobal('crypto', { getRandomValues });

    expect(createClientAttemptId()).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
    expect(getRandomValues).toHaveBeenCalledOnce();
  });

  it('creates distinct compatibility UUIDs when Web Crypto is unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    vi.spyOn(Date, 'now').mockReturnValue(1_234_567_890);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const first = createClientAttemptId();
    const second = createClientAttemptId();

    expect(first).toMatch(uuidPattern);
    expect(second).toMatch(uuidPattern);
    expect(second).not.toBe(first);
  });
});
