import { browserStorage } from './browserStorage';

// Sensitive draft content lives only in this page's memory, never browser storage.
export interface TutorDraft { text: string; files: File[] }
const drafts = new Map<string, TutorDraft>();
const emptyDraft: TutorDraft = { text: '', files: [] };
const dispatchedDrafts = new Map<string, { scope: string; draft: TutorDraft }>();
export const tutorDraftKey = (ownerId: string, conversationId: string | null) => JSON.stringify([ownerId, conversationId]);
export function readTutorDraft(scope?: string): TutorDraft {
  return scope && drafts.get(scope) || emptyDraft;
}
export function keepTutorDraft(scope: string | undefined, draft: TutorDraft): void {
  if (!scope) return;
  if (draft.text || draft.files.length) drafts.set(scope, draft);
  else drafts.delete(scope);
}
export function clearTutorDrafts(): void { drafts.clear(); dispatchedDrafts.clear(); }
export function captureDispatchedDraft(id: string, scope: string): void {
  dispatchedDrafts.set(id, { scope, draft: readTutorDraft(scope) });
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

const preparingKey = (ownerId: string) => `preparing_tutor_sends:${encodeURIComponent(ownerId)}`;
export function preparingSends(ownerId: string): string[] {
  try {
    const ids: unknown = JSON.parse(browserStorage.get(preparingKey(ownerId)) || '[]');
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string' && /^tutor_[A-Za-z0-9_.:-]{1,190}$/.test(id)).slice(-32) : [];
  } catch { return []; }
}
export function rememberPreparingSend(ownerId: string, id: string): void {
  browserStorage.set(preparingKey(ownerId), JSON.stringify([...new Set([...preparingSends(ownerId), id])].slice(-32)));
}
export function forgetPreparingSend(ownerId: string, id: string): void {
  browserStorage.set(preparingKey(ownerId), JSON.stringify(preparingSends(ownerId).filter(item => item !== id)));
}

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
