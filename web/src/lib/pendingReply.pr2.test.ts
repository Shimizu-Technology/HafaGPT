import { beforeEach, expect, it } from 'vitest';
import { captureDispatchedDraft, clearTutorDrafts, confirmDispatchedDraft, keepTutorDraft, moveTutorDraft, readTutorDraft, tutorDraftKey } from './pendingReply';
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
