import { browserStorage } from './browserStorage';

// Sensitive draft content lives only in this page's memory, never browser storage.
export interface TutorDraft { text: string; files: File[] }
const drafts = new Map<string, TutorDraft>();
const emptyDraft: TutorDraft = { text: '', files: [] };
const dispatchedDrafts = new Map<string, { scope: string; draft: TutorDraft }>();
export const tutorDraftKey = (ownerId: string, conversationId: string | null) => JSON.stringify([ownerId, conversationId]);

// The one exception: a signed-out learner's typed text must survive signing in,
// and Clerk finishes sign-in with a full page load. Keep only that text, only in
// this tab, briefly, and hand it to the account that signs in.
export const GUEST_DRAFT_SCOPE = 'guest';
const guestDraftKey = 'tutor_guest_draft';
const guestDraftLifetimeMs = 30 * 60 * 1000;
const guestClockSkewMs = 5_000;
// A longer draft is not worth carrying through sign-in; it stays on screen only.
const guestDraftMaxChars = 4000;
interface GuestRecord { text: string; at: number; owner?: string }
function removeGuestRecord(): void {
  try { window.sessionStorage.removeItem(guestDraftKey); } catch { /* Storage can be unavailable. */ }
}
function readGuestRecord(): GuestRecord | null {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(guestDraftKey) || 'null') as Partial<GuestRecord> | null;
    if (saved && typeof saved.text === 'string' && typeof saved.at === 'number'
      && saved.at - Date.now() <= guestClockSkewMs && Date.now() - saved.at < guestDraftLifetimeMs) {
      return { text: saved.text, at: saved.at, ...(typeof saved.owner === 'string' && { owner: saved.owner }) };
    }
    removeGuestRecord();
  } catch { /* Storage can be unavailable; the draft then lives only on screen. */ }
  return null;
}
function readGuestText(): string { return readGuestRecord()?.text ?? ''; }
function writeGuestRecord(record: GuestRecord | null): void {
  if (!record || !record.text.trim() || record.text.length > guestDraftMaxChars) return removeGuestRecord();
  // A failed write must not leave an older, obsolete draft to be adopted later.
  try { window.sessionStorage.setItem(guestDraftKey, JSON.stringify(record)); } catch { removeGuestRecord(); }
}
function writeGuestText(text: string): void {
  const previous = readGuestRecord();
  // Restoring unchanged text (a remount) must not extend the 30 minutes; only an edit does.
  writeGuestRecord(previous?.text === text ? previous : { text, at: Date.now() });
}
const adoptedScopes = new Set<string>();
/** Move a signed-out draft into this account's new-chat composer. Returns whether that
 *  draft is still waiting there, so a repeated call (React StrictMode) gives the same answer. */
export function adoptGuestDraft(ownerId: string): boolean {
  const scope = tutorDraftKey(ownerId, null);
  const record = readGuestRecord();
  if (record && record.owner && record.owner !== ownerId) removeGuestRecord();
  else if (record) {
    removeGuestRecord();
    if (!drafts.get(scope)?.text) {
      drafts.set(scope, { text: record.text, files: [] });
      adoptedScopes.add(scope);
    }
  }
  return adoptedScopes.has(scope) && Boolean(drafts.get(scope)?.text);
}

let knownAccount: string | null | undefined;
/** Called from the application shell on every route. A guest's draft belongs to the first
 *  account that signs in after it; any other account change or sign-out discards it,
 *  whether or not the tutor was ever opened in between. */
export function reconcileDraftAccount(userId: string | null): void {
  if (knownAccount && knownAccount !== userId) clearTutorDrafts();
  knownAccount = userId;
  const record = readGuestRecord();
  if (!record) return;
  if (!userId) {
    if (record.owner) removeGuestRecord();
  } else if (!record.owner) writeGuestRecord({ ...record, owner: userId });
  else if (record.owner !== userId) removeGuestRecord();
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
export function clearTutorDrafts(): void { drafts.clear(); dispatchedDrafts.clear(); adoptedScopes.clear(); knownAccount = undefined; removeGuestRecord(); }
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
