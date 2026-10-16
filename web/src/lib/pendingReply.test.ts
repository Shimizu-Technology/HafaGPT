import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetPendingReply, hasSavedPendingReply, readPendingReply, rememberPendingReply } from './pendingReply';

const record = () => ({ pendingId: 'pending_fixture_a', conversationId: 'conv-a', priorQuestions: 2, createdAt: Date.now() });

describe('content-free pending tutor pointers', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it('restores only the owner and conversation without storing private content', () => {
    const pending = record();
    rememberPendingReply('owner-a', pending);
    expect(readPendingReply('owner-a', 'conv-a')).toEqual(pending);
    expect(readPendingReply('owner-b', 'conv-a')).toBeNull();
    expect(readPendingReply('owner-a', 'conv-b')).toBeNull();
    expect(Object.keys(JSON.parse(localStorage.getItem(localStorage.key(0)!)!))).toEqual(['pendingId', 'conversationId', 'priorQuestions', 'createdAt']);
  });

  it('expires old pointers and never removes a replacement on late completion', () => {
    const pending = record();
    rememberPendingReply('owner-a', { ...pending, createdAt: Date.now() - 25 * 60 * 60 * 1000 });
    expect(readPendingReply('owner-a', 'conv-a')).toBeNull();
    rememberPendingReply('owner-a', pending);
    rememberPendingReply('owner-a', { ...pending, pendingId: 'pending_fixture_b' });
    forgetPendingReply('owner-a', 'conv-a', pending.pendingId);
    expect(readPendingReply('owner-a', 'conv-a')?.pendingId).toBe('pending_fixture_b');
  });

  it('matches the exact saved request rather than another tab’s later exchange', () => {
    const pending = record();
    const other = [{ role: 'user', pending_id: 'pending_other' }, { role: 'assistant', pending_id: 'pending_other' }];
    expect(hasSavedPendingReply(other, { ...pending, priorQuestions: 0 })).toBe(false);
    expect(hasSavedPendingReply([...other, { role: 'user', pending_id: pending.pendingId }], pending)).toBe(false);
    expect(hasSavedPendingReply([...other, { role: 'user', pending_id: pending.pendingId }, { role: 'assistant', pending_id: pending.pendingId }], pending)).toBe(true);
  });

  it('keeps sending usable when browser storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('private mode'); });
    expect(rememberPendingReply('owner-a', record())).toBe(false);
  });
});
