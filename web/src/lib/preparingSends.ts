import { browserStorage } from './browserStorage';

// Split from pendingReply so subscription checks on every page don't load the tutor's draft store.
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
