import { browserStorage } from './browserStorage';

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
