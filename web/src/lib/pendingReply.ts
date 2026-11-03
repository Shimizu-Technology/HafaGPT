import { browserStorage } from './browserStorage';
import { GUEST_DRAFT_SCOPE, onDraftAccountChange, readGuestText, resetGuestDraft, takeGuestDraftFor, writeGuestText } from './guestDraft';

// Sensitive draft content lives only in this page's memory, never browser storage.
export interface TutorDraft { text: string; files: File[] }
const drafts = new Map<string, TutorDraft>();
const emptyDraft: TutorDraft = { text: '', files: [] };
const dispatchedDrafts = new Map<string, { scope: string; draft: TutorDraft }>();
export const tutorDraftKey = (ownerId: string, conversationId: string | null) => JSON.stringify([ownerId, conversationId]);

export { GUEST_DRAFT_SCOPE, reconcileDraftAccount } from './guestDraft';

const adoptedScopes = new Set<string>();
// The account changed: drafts typed for the previous account must not follow the next one.
onDraftAccountChange(() => { drafts.clear(); dispatchedDrafts.clear(); adoptedScopes.clear(); });

/** Move a signed-out draft into this account's new-chat composer. Returns whether that
 *  draft is still waiting there, so a repeated call (React StrictMode) gives the same answer. */
export function adoptGuestDraft(ownerId: string): boolean {
  const scope = tutorDraftKey(ownerId, null);
  const text = takeGuestDraftFor(ownerId);
  if (text && !drafts.get(scope)?.text) {
    drafts.set(scope, { text, files: [] });
    adoptedScopes.add(scope);
  }
  return adoptedScopes.has(scope) && Boolean(drafts.get(scope)?.text);
}

export function readTutorDraft(scope?: string): TutorDraft {
  if (scope === GUEST_DRAFT_SCOPE) return { text: readGuestText(), files: [] };
  return scope && drafts.get(scope) || emptyDraft;
}
export function keepTutorDraft(scope: string | undefined, draft: TutorDraft): void {
  if (!scope) return;
  if (scope === GUEST_DRAFT_SCOPE) return writeGuestText(draft.text);
  const previous = drafts.get(scope);
  // A remount keeps the revision; only actual content changes replace it.
  if (previous && previous.text === draft.text && previous.files.length === draft.files.length
    && previous.files.every((file, index) => file === draft.files[index])) return;
  if (draft.text || draft.files.length) drafts.set(scope, draft);
  else drafts.delete(scope);
}
export function clearTutorDrafts(): void { drafts.clear(); dispatchedDrafts.clear(); adoptedScopes.clear(); resetGuestDraft(); }
export function captureDispatchedDraft(id: string, scope: string, draft: TutorDraft): void {
  dispatchedDrafts.set(id, { scope, draft });
}
export function confirmDispatchedDraft(id: string): TutorDraft | undefined {
  const record = dispatchedDrafts.get(id);
  dispatchedDrafts.delete(id);
  if (!record || drafts.get(record.scope) !== record.draft) return;
  drafts.delete(record.scope);
  return record.draft;
}
export function moveTutorDraft(from: string, to: string): void {
  const draft = drafts.get(from);
  if (draft) drafts.set(to, draft);
  drafts.delete(from);
  for (const record of dispatchedDrafts.values()) if (record.scope === from) record.scope = to;
}

export { forgetPreparingSend, preparingSends, rememberPreparingSend } from './preparingSends';

/** Content-free recovery pointer. Never persist prompts, replies, files, or tokens. */
export interface PendingReply {
  pendingId: string;
  conversationId: string;
  priorQuestions: number;
  createdAt: number;
}

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const key = (ownerId: string, conversationId: string) =>
  `pending_tutor_reply:${encodeURIComponent(ownerId)}:${encodeURIComponent(conversationId)}`;

export function readPendingReply(ownerId: string, conversationId: string): PendingReply | null {
  const storageKey = key(ownerId, conversationId);
  const value = browserStorage.get(storageKey);
  if (!value) return null;
  try {
    const record = JSON.parse(value) as PendingReply;
    if (record.conversationId === conversationId && typeof record.pendingId === 'string'
      && /^[A-Za-z0-9_.:-]{8,200}$/.test(record.pendingId)
      && Number.isInteger(record.priorQuestions) && record.priorQuestions >= 0
      && Number.isFinite(record.createdAt) && record.createdAt <= Date.now()
      && Date.now() - record.createdAt < MAX_AGE_MS) return record;
  } catch { /* An old or damaged pointer must not lock the composer. */ }
  browserStorage.remove(storageKey);
  return null;
}

export function rememberPendingReply(ownerId: string, record: PendingReply): boolean {
  return browserStorage.set(key(ownerId, record.conversationId), JSON.stringify(record));
}

/** A late completion must never remove a newer request's recovery pointer. */
export function forgetPendingReply(ownerId: string, conversationId: string, pendingId: string): void {
  if (readPendingReply(ownerId, conversationId)?.pendingId === pendingId) {
    browserStorage.remove(key(ownerId, conversationId));
  }
}

export function hasSavedPendingReply(
  messages: { role: string; pending_id?: string | null }[], record: PendingReply,
): boolean {
  if (messages.some(message => 'pending_id' in message)) {
    const matching = messages.filter(message => message.pending_id === record.pendingId);
    return matching.some(message => message.role === 'user') && matching.some(message => message.role === 'assistant');
  }
  // Compatibility while the web deploy and API deploy roll out independently.
  let questions = 0;
  return messages.some((message, index) => message.role === 'user'
    && ++questions > record.priorQuestions
    && messages.slice(index + 1).some(reply => reply.role === 'assistant'));
}
