import { useEffect, useRef } from 'react';
import { useMutation, type MutateOptions } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

/** Keep token acquisition, transport and cache commits tied to one mounted owner. */
export function useAccountRequest() {
  const { getToken, isSignedIn, userId, sessionId } = useAuth();
  const ownerId = isSignedIn === true ? userId || null : null;
  const ownerRef = useRef({ ownerId, sessionId });
  if (ownerRef.current.ownerId !== ownerId || ownerRef.current.sessionId !== sessionId) {
    ownerRef.current = { ownerId, sessionId };
  }
  const owner = ownerRef.current;
  const mounted = useRef(true);
  const pending = useRef(new Set<AbortController>());

  useEffect(() => {
    mounted.current = true;
    const requests = pending.current;
    return () => {
      mounted.current = false;
      for (const controller of requests) controller.abort();
      requests.clear();
    };
  }, [owner]);

  const isCurrent = () => mounted.current && ownerRef.current === owner && !!owner.ownerId;
  const request = async <T,>(
    url: string,
    init: RequestInit = {},
    read: (response: Response) => Promise<T> = response => response.json(),
  ): Promise<T> => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    init.signal?.addEventListener('abort', abort, { once: true });
    if (init.signal?.aborted) controller.abort();
    pending.current.add(controller);
    const assertCurrent = () => {
      if (!isCurrent() || controller.signal.aborted) {
        throw new DOMException('The signed-in account changed.', 'AbortError');
      }
    };
    try {
      assertCurrent();
      const token = await getToken();
      assertCurrent();
      if (!token) throw new Error('Sign in again to continue.');
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: { ...init.headers, Authorization: `Bearer ${token}` },
      });
      assertCurrent();
      if (!response.ok) throw new Error('The request failed. Please try again.');
      const data = await read(response);
      assertCurrent();
      return data;
    } finally {
      pending.current.delete(controller);
      init.signal?.removeEventListener('abort', abort);
    }
  };
  return { ownerId, isCurrent, request };
}

type AccountOwner = ReturnType<typeof useAccountRequest>;

/** Snapshot at mutate(), before React Query's awaited callbacks can switch owners. */
export function useAccountMutation<T, V>(
  run: (value: V, owner: AccountOwner) => Promise<T>,
  commit: (data: T, value: V, owner: AccountOwner) => void,
) {
  const owner = useAccountRequest();
  type Attempt = { value: V; owner: AccountOwner };
  const mutation = useMutation<T, Error, Attempt>({
    mutationFn: attempt => run(attempt.value, attempt.owner),
    onSuccess: (data, attempt) => {
      if (attempt.owner.isCurrent()) commit(data, attempt.value, attempt.owner);
    },
  });
  const callbacks = (options?: MutateOptions<T, Error, V>): MutateOptions<T, Error, Attempt> => ({
    onSuccess: (data, attempt, result, context) => {
      if (attempt.owner.isCurrent()) options?.onSuccess?.(data, attempt.value, result, context);
    },
    onError: (error, attempt, result, context) => {
      if (attempt.owner.isCurrent()) options?.onError?.(error, attempt.value, result, context);
    },
    onSettled: (data, error, attempt, result, context) => {
      if (attempt.owner.isCurrent()) options?.onSettled?.(data, error, attempt.value, result, context);
    },
  });
  return {
    ...mutation,
    variables: mutation.variables?.value,
    mutate: (value: V, options?: MutateOptions<T, Error, V>) => mutation.mutate({ value, owner }, callbacks(options)),
    mutateAsync: (value: V, options?: MutateOptions<T, Error, V>) => mutation.mutateAsync({ value, owner }, callbacks(options)),
  };
}

