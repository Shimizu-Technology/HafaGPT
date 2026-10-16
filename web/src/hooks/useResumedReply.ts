import { useEffect, useRef, useState } from 'react';
import { forgetPendingReply, readPendingReply, type PendingReply } from '../lib/pendingReply';
import { waitForReplyOutcome, type ReplyStatus, type RecoveryPhase } from '../lib/replyRecovery';

interface Options {
  ownerId: string | null;
  conversationId: string | null;
  check: (pendingId: string, signal: AbortSignal) => Promise<ReplyStatus>;
  load: (record: PendingReply, signal: AbortSignal) => Promise<boolean>;
  cancel: (pendingId: string) => Promise<boolean>;
  isLive?: () => boolean;
}

interface State {
  scope: string;
  record: PendingReply | null;
  phase?: RecoveryPhase;
  notice?: string;
  retry?: boolean;
}

/** Resume only pointers found on entry; live sends own their existing recovery UI. */
export function useResumedReply(options: Options) {
  const { ownerId, conversationId } = options;
  const scope = JSON.stringify([ownerId, conversationId]);
  const callbacks = useRef(options);
  callbacks.current = options;
  const [attempt, setAttempt] = useState(0);
  const snapshot = (): State => ({ scope, record: ownerId && conversationId && !options.isLive?.() ? readPendingReply(ownerId, conversationId) : null });
  const [state, setState] = useState<State>(snapshot);
  const operation = useRef<{ controller: AbortController; record: PendingReply; stopping: boolean; settled: boolean } | null>(null);

  useEffect(() => {
    const record = ownerId && conversationId && !callbacks.current.isLive?.() ? readPendingReply(ownerId, conversationId) : null;
    setState({ scope, record, phase: 'checking' });
    if (!record || !ownerId || !conversationId) return;
    const current = { controller: new AbortController(), record, stopping: false, settled: false };
    operation.current = current;
    const { signal } = current.controller;
    const update = (update: Partial<State>) => {
      if (!signal.aborted && operation.current === current) setState(previous => ({ ...previous, ...update }));
    };
    void (async () => {
      try {
        const outcome = await waitForReplyOutcome({
          check: checkSignal => callbacks.current.check(record.pendingId, checkSignal), signal,
          onPhase: phase => update({ phase }),
        });
        if (signal.aborted) return;
        // Even a missing status may have a saved reply when tracking was unavailable.
        const loaded = await callbacks.current.load(record, signal);
        if (signal.aborted) return;
        if (loaded || outcome === 'failed') {
          current.settled = true;
          forgetPendingReply(ownerId, conversationId, record.pendingId);
          update({ record: null, retry: false, notice: loaded ? undefined
            : 'Your earlier reply ended without a confirmed saved copy. You can send another message.' });
        } else {
          // Unknown does not mean unsent. Keep the next send locked until we can
          // confirm an outcome; never invite a duplicate resend after a reload.
          update({ retry: true, notice: outcome === 'complete'
            ? 'Your reply finished, but its saved copy could not be loaded. Check again in a moment.'
            : 'HåfaGPT couldn’t confirm your earlier reply. Check again before sending another message.' });
        }
      } catch {
        update({ retry: true, notice: 'HåfaGPT couldn’t check your earlier reply. Check your connection and try again.' });
      }
    })();
    return () => {
      current.controller.abort();
      if (operation.current === current) operation.current = null;
    };
  // Entry and explicit retry own this operation. Callback identities change on every render.
  }, [ownerId, conversationId, scope, attempt]);

  const stop = async () => {
    const current = operation.current;
    if (!current || current.controller.signal.aborted || current.stopping || current.settled) return;
    current.stopping = true;
    let confirmed = false;
    try { confirmed = await callbacks.current.cancel(current.record.pendingId); } catch { /* Allow another Stop after reconnection. */ }
    if (operation.current !== current || current.controller.signal.aborted || current.settled) return;
    if (!confirmed) current.stopping = false;
    // Stop acknowledgement is not the terminal/persistence result. Leave the
    // pointer and polling intact until the status and saved exchange settle.
    setState(previous => ({ ...previous, notice: confirmed
      ? 'Stop requested. Checking your earlier reply…'
      : 'Couldn’t confirm Stop. Still checking your earlier reply…' }));
  };
  const active = state.scope === scope ? state : snapshot();
  return {
    pending: Boolean(active.record),
    notice: active.notice || (active.record ? active.phase === 'waiting'
      ? 'HåfaGPT is still working on your earlier reply. It will appear here.'
      : active.phase === 'offline' ? 'Waiting for a connection to check your earlier reply…' : 'Checking your earlier reply…' : undefined),
    canRetry: Boolean(active.retry),
    retry: () => setAttempt(value => value + 1),
    stop,
  };
}
