/** Non-OK API response, keeping the server's user-facing detail when present. */
export class HttpStatusError extends Error {
  readonly status: number;
  readonly detail?: string;

  constructor(status: number, detail?: string) {
    super(detail || `HTTP error! status: ${status}`);
    this.name = 'HttpStatusError';
    this.status = status;
    this.detail = detail;
  }
}

/** The connection dropped after the request left; the server may still be replying. */
export class ConnectionLostError extends Error {
  readonly pendingId: string;

  constructor(pendingId: string) {
    super('Connection lost');
    this.name = 'ConnectionLostError';
    this.pendingId = pendingId;
  }
}

// Browser wording for a dropped or refused connection: Safari ("Load failed",
// "The network connection was lost."), Chrome ("Failed to fetch",
// "network error"), and Firefox ("NetworkError when attempting to fetch resource.").
const NETWORK_FAILURE = /load failed|failed to fetch|networkerror|network connection was lost|network error|internet connection appears to be offline|error in input stream/i;

export function isConnectionFailure(error: unknown): boolean {
  if (error instanceof ConnectionLostError) return true;
  if (!(error instanceof Error)) return false;
  return error.name === 'TypeError' || NETWORK_FAILURE.test(error.message);
}

export async function readErrorDetail(response: Response): Promise<string | undefined> {
  try {
    const body = await response.json();
    return typeof body?.detail === 'string' ? body.detail : undefined;
  } catch {
    return undefined;
  }
}

/** Plain-language reason for the composer banner; never a raw browser error. */
export function describeSendFailure(error: unknown): string {
  if (isConnectionFailure(error)) return 'Couldn’t reach HåfaGPT. Check your connection, then try again.';
  if (error instanceof HttpStatusError) {
    if (error.status === 413) return 'These files are too large to send. Try fewer or smaller files.';
    if (error.status === 401 || error.status === 403) return 'Your sign-in expired. Sign in again, then retry.';
    if (error.status === 429) return 'Too many messages at once. Wait a moment, then retry.';
    if (error.status >= 500) return 'HåfaGPT had a problem answering. Please try again.';
    if (error.detail) return error.detail;
    return 'HåfaGPT couldn’t accept this message. Please try again.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Your message wasn’t sent. Please try again.';
}
