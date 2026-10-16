import { describe, expect, it } from 'vitest';
import { ConnectionLostError, HttpStatusError, describeSendFailure, isConnectionFailure } from './sendErrors';

describe('send failure wording', () => {
  it.each(['Load failed', 'Failed to fetch', 'NetworkError when attempting to fetch resource.', 'The network connection was lost.'])(
    'treats the browser message "%s" as a connection failure', message => {
      expect(isConnectionFailure(new TypeError(message))).toBe(true);
      expect(describeSendFailure(new TypeError(message))).toBe('Couldn’t reach HåfaGPT. Check your connection, then try again.');
    },
  );

  it('never shows raw browser or HTTP wording', () => {
    expect(describeSendFailure(new ConnectionLostError('pending_abcdefgh'))).not.toMatch(/load failed/i);
    expect(describeSendFailure(new HttpStatusError(502))).toBe('HåfaGPT had a problem answering. Please try again.');
    expect(describeSendFailure(new HttpStatusError(413))).toMatch(/too large/);
    expect(describeSendFailure(new HttpStatusError(401))).toMatch(/sign-in expired/);
    expect(describeSendFailure(new HttpStatusError(429))).toMatch(/Wait a moment/);
  });

  it('keeps specific validation guidance from the API', () => {
    expect(describeSendFailure(new HttpStatusError(400, 'Maximum 10 files allowed'))).toBe('Maximum 10 files allowed');
    expect(describeSendFailure(new HttpStatusError(400))).not.toMatch(/HTTP/);
  });

  it('keeps already-friendly application errors', () => {
    expect(isConnectionFailure(new Error('This conversation changed. Reopen it before editing.'))).toBe(false);
    expect(describeSendFailure(new Error('This conversation changed. Reopen it before editing.')))
      .toBe('This conversation changed. Reopen it before editing.');
  });
});
