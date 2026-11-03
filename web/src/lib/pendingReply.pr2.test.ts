import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adoptGuestDraft, captureDispatchedDraft, clearTutorDrafts, confirmDispatchedDraft, GUEST_DRAFT_SCOPE, keepTutorDraft, moveTutorDraft, readTutorDraft, reconcileDraftAccount, tutorDraftKey } from './pendingReply';
beforeEach(clearTutorDrafts);
it('transfers newer typing from a new chat scope without clearing it for an earlier reply', () => {
  const from = tutorDraftKey('learner', null), to = tutorDraftKey('learner', 'created-chat');
  keepTutorDraft(from, { text: 'First note', files: [] });
  captureDispatchedDraft('send-1', from, readTutorDraft(from));
  keepTutorDraft(from, { text: 'Second unsent note', files: [] });
  moveTutorDraft(from, to);
  expect(confirmDispatchedDraft('send-1')).toBeUndefined();
  expect(readTutorDraft(to).text).toBe('Second unsent note');
  expect(readTutorDraft(from).text).toBe('');
});
it('clears only the exact accepted draft after background completion and scope migration', () => {
  const from = tutorDraftKey('learner', null), to = tutorDraftKey('learner', 'created-chat');
  keepTutorDraft(from, { text: 'First note', files: [] });
  captureDispatchedDraft('send-1', from, readTutorDraft(from));
  moveTutorDraft(from, to);
  expect(confirmDispatchedDraft('send-1')?.text).toBe('First note');
  expect(readTutorDraft(to).text).toBe('');
});

it('hands a guest draft to the account that signs in, once, and never across sign-out', () => {
  window.sessionStorage.clear();
  keepTutorDraft(GUEST_DRAFT_SCOPE, { text: 'Guest question', files: [] });
  expect(readTutorDraft(GUEST_DRAFT_SCOPE).text).toBe('Guest question');
  expect(adoptGuestDraft('learner')).toBe(true);
  expect(readTutorDraft(tutorDraftKey('learner', null)).text).toBe('Guest question');
  expect(readTutorDraft(GUEST_DRAFT_SCOPE).text).toBe('');
  keepTutorDraft(GUEST_DRAFT_SCOPE, { text: 'Left behind', files: [] });
  clearTutorDrafts();
  expect(readTutorDraft(GUEST_DRAFT_SCOPE).text).toBe('');
});

it('lets a stale guest draft expire', () => {
  window.sessionStorage.setItem('tutor_guest_draft', JSON.stringify({ text: 'Old', at: Date.now() - 31 * 60 * 1000 }));
  expect(readTutorDraft(GUEST_DRAFT_SCOPE).text).toBe('');
  expect(adoptGuestDraft('learner')).toBe(false);
});

it('answers a repeated adoption the same way while the draft waits', () => {
  keepTutorDraft(GUEST_DRAFT_SCOPE, { text: 'Guest question', files: [] });
  expect(adoptGuestDraft('learner')).toBe(true);
  expect(adoptGuestDraft('learner')).toBe(true);
  keepTutorDraft(tutorDraftKey('learner', null), { text: '', files: [] });
  expect(adoptGuestDraft('learner')).toBe(false);
});

describe('guest draft ownership across accounts', () => {
  const guestAt = () => JSON.parse(window.sessionStorage.getItem('tutor_guest_draft')!).at as number;
  afterEach(() => vi.useRealTimers());

  it('gives a draft to the first account that signs in, and to no later account', () => {
    keepTutorDraft(GUEST_DRAFT_SCOPE, { text: 'Guest question', files: [] });
    reconcileDraftAccount(null);
    expect(readTutorDraft(GUEST_DRAFT_SCOPE).text).toBe('Guest question');
    reconcileDraftAccount('account-a');
    reconcileDraftAccount(null); // signed out without ever opening the tutor
    expect(window.sessionStorage.getItem('tutor_guest_draft')).toBeNull();
    reconcileDraftAccount('account-b');
    expect(adoptGuestDraft('account-b')).toBe(false);
  });

  it('refuses to adopt a draft that another account already owns', () => {
    keepTutorDraft(GUEST_DRAFT_SCOPE, { text: 'Guest question', files: [] });
    reconcileDraftAccount('account-a');
    expect(adoptGuestDraft('account-b')).toBe(false);
    expect(window.sessionStorage.getItem('tutor_guest_draft')).toBeNull();
  });

  it('removes an owned draft when a reloaded page finds nobody signed in', () => {
    window.sessionStorage.setItem('tutor_guest_draft', JSON.stringify({ text: 'Owned', at: Date.now(), owner: 'account-a' }));
    reconcileDraftAccount(null);
    expect(window.sessionStorage.getItem('tutor_guest_draft')).toBeNull();
  });

  it('keeps the first account adopting its own draft later', () => {
    keepTutorDraft(GUEST_DRAFT_SCOPE, { text: 'Guest question', files: [] });
    reconcileDraftAccount('account-a');
    expect(adoptGuestDraft('account-a')).toBe(true);
  });

  it('does not renew the 30 minutes when unchanged text is restored', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-03T10:00:00Z'));
    keepTutorDraft(GUEST_DRAFT_SCOPE, { text: 'Guest question', files: [] });
    const first = guestAt();
    vi.advanceTimersByTime(29 * 60 * 1000);
    keepTutorDraft(GUEST_DRAFT_SCOPE, { text: 'Guest question', files: [] }); // a remount re-saves the same text
    expect(guestAt()).toBe(first);
    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(readTutorDraft(GUEST_DRAFT_SCOPE).text).toBe('');
  });

  it('renews the 30 minutes on an actual edit', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-03T10:00:00Z'));
    keepTutorDraft(GUEST_DRAFT_SCOPE, { text: 'Guest question', files: [] });
    vi.advanceTimersByTime(29 * 60 * 1000);
    keepTutorDraft(GUEST_DRAFT_SCOPE, { text: 'Guest question, edited', files: [] });
    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(readTutorDraft(GUEST_DRAFT_SCOPE).text).toBe('Guest question, edited');
  });

  it('rejects a draft stamped in the future', () => {
    window.sessionStorage.setItem('tutor_guest_draft', JSON.stringify({ text: 'Odd', at: Date.now() + 60 * 60 * 1000 }));
    expect(readTutorDraft(GUEST_DRAFT_SCOPE).text).toBe('');
    expect(window.sessionStorage.getItem('tutor_guest_draft')).toBeNull();
    window.sessionStorage.setItem('tutor_guest_draft', JSON.stringify({ text: 'Skewed', at: Date.now() + 1000 }));
    expect(readTutorDraft(GUEST_DRAFT_SCOPE).text).toBe('Skewed');
  });

  it('drops an obsolete stored draft when a newer write fails', () => {
    keepTutorDraft(GUEST_DRAFT_SCOPE, { text: 'Older draft', files: [] });
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
    keepTutorDraft(GUEST_DRAFT_SCOPE, { text: 'Newer draft', files: [] });
    write.mockRestore();
    expect(window.sessionStorage.getItem('tutor_guest_draft')).toBeNull();
    expect(adoptGuestDraft('learner')).toBe(false);
  });

  it('does not carry an oversized draft through sign-in or leave an older one behind', () => {
    keepTutorDraft(GUEST_DRAFT_SCOPE, { text: 'Older draft', files: [] });
    keepTutorDraft(GUEST_DRAFT_SCOPE, { text: 'x'.repeat(4001), files: [] });
    expect(window.sessionStorage.getItem('tutor_guest_draft')).toBeNull();
    keepTutorDraft(GUEST_DRAFT_SCOPE, { text: 'x'.repeat(4000), files: [] });
    expect(readTutorDraft(GUEST_DRAFT_SCOPE).text).toHaveLength(4000);
  });
});
