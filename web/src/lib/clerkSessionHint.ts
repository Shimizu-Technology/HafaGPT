// A returning account's Clerk can be slow on a phone; wait before calling it stuck.
export const RETURNING_ACCOUNT_TIMEOUT_MS = 8_000;

/**
 * Clerk keeps __client_uat on the app's domain: 0 or absent when signed out, a
 * timestamp once signed in. It proves nothing about a session; it only says
 * whether one may exist before Clerk has loaded. If the cookie is ever renamed,
 * a returning account briefly sees guest Home until Clerk resolves.
 */
export function mayHaveClerkSession(): boolean {
  try {
    return /(?:^|;\s*)__client_uat(?:_[^=]*)?=(?!0(?:;|$))[^;]+/.test(document.cookie);
  } catch {
    return false;
  }
}
