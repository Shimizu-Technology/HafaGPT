import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';

/** Clerk can resolve a pending token from its newly active session. Reject stale work. */
export function useLearnerAuth() {
  const auth = useAuth();
  const activeOwner = useRef(auth.userId);
  activeOwner.current = auth.userId;
  useEffect(() => {
    activeOwner.current = auth.userId;
    return () => { activeOwner.current = null; };
  }, [auth.userId]);
  const getToken = async () => {
    const owner = auth.userId;
    if (!owner) throw new Error('Authentication required');
    const token = await auth.getToken();
    if (!token) throw new Error('Authentication required');
    if (activeOwner.current !== owner) throw new Error('Learning account changed');
    return token;
  };
  return { ...auth, getToken };
}
