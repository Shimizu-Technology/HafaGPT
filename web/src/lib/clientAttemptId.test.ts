import { describe, expect, it } from 'vitest';
import { createClientAttemptId } from './clientAttemptId';

describe('createClientAttemptId', () => {
  it('creates distinct UUIDs suitable for idempotency keys', () => {
    const first = createClientAttemptId();
    const second = createClientAttemptId();
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    expect(first).toMatch(uuidPattern);
    expect(second).toMatch(uuidPattern);
    expect(first).not.toBe(second);
  });
});
