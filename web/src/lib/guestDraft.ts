// The one exception to memory-only drafts: a signed-out learner's typed text must
// survive signing in, and Clerk finishes sign-in with a full page load. Keep only that
// text, only in this tab, briefly, and hand it to the account that signs in.
//
// This module is small and loaded on every page so account changes are recorded
// synchronously, even when the tutor and its draft store are never loaded.
export const GUEST_DRAFT_SCOPE = 'guest';
const guestDraftKey = 'tutor_guest_draft';
const guestDraftLifetimeMs = 30 * 60 * 1000;
const guestClockSkewMs = 5_000;
// Room for a long pasted school notice; anything longer stays on screen only.
const guestDraftMaxChars = 20_000;
export interface GuestRecord { text: string; at: number; owner?: string }

export function removeGuestRecord(): void {
  try { window.sessionStorage.removeItem(guestDraftKey); } catch { /* Storage can be unavailable. */ }
}
export function readGuestRecord(): GuestRecord | null {
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
function writeGuestRecord(record: GuestRecord | null): void {
  if (!record || !record.text.trim() || record.text.length > guestDraftMaxChars) return removeGuestRecord();
  // A failed write must not leave an older, obsolete draft to be adopted later.
  try { window.sessionStorage.setItem(guestDraftKey, JSON.stringify(record)); } catch { removeGuestRecord(); }
}

// A draft already bound to an account is never shown in the guest composer: a later
// guest could otherwise edit it into a fresh, unowned draft for someone else.
export function readGuestText(): string {
  const record = readGuestRecord();
  return record && !record.owner ? record.text : '';
}
export function writeGuestText(text: string): void {
  const previous = readGuestRecord();
  // The guest composer opens empty over a bound draft while sign-in is loading; that
  // empty restore must not delete the draft waiting for its account.
  if (previous?.owner && !text.trim()) return;
  // Restoring unchanged text (a remount) must not extend the 30 minutes; only an edit does.
  writeGuestRecord(previous && !previous.owner && previous.text === text ? previous : { text, at: Date.now() });
}

let knownAccount: string | null | undefined;
const accountChangeListeners = new Set<() => void>();
/** Lets the tutor's in-memory draft store clear itself when the account changes. */
export function onDraftAccountChange(listener: () => void): void { accountChangeListeners.add(listener); }

/** Called synchronously on every route and before any adoption. A guest's draft belongs
 *  to the first account that signs in after it; any other account change or sign-out
 *  discards it, whether or not the tutor was ever opened in between. */
export function reconcileDraftAccount(userId: string | null): void {
  if (knownAccount && knownAccount !== userId) {
    accountChangeListeners.forEach(listener => listener());
    removeGuestRecord();
  }
  knownAccount = userId;
  const record = readGuestRecord();
  if (!record) return;
  if (!userId) {
    if (record.owner) removeGuestRecord();
  } else if (!record.owner) writeGuestRecord({ ...record, owner: userId });
  else if (record.owner !== userId) removeGuestRecord();
}

/** Takes the draft for this account, if it is theirs. */
export function takeGuestDraftFor(ownerId: string): string | null {
  reconcileDraftAccount(ownerId);
  const record = readGuestRecord();
  if (!record) return null;
  removeGuestRecord();
  return record.owner === ownerId ? record.text : null;
}

export function resetGuestDraft(): void { knownAccount = undefined; removeGuestRecord(); }
