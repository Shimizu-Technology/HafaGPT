import { beforeEach, expect, it } from 'vitest';
import { adoptGuestDraft, captureDispatchedDraft, clearTutorDrafts, confirmDispatchedDraft, GUEST_DRAFT_SCOPE, keepTutorDraft, moveTutorDraft, readTutorDraft, tutorDraftKey } from './pendingReply';
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
