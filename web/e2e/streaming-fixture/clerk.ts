// Test server alias only. This module is never imported by the production app.
const getToken = async () => 'synthetic-fixture-token';
export const useAuth = () => ({ getToken, isSignedIn: true, userId: 'synthetic-fixture-user', sessionId: 'synthetic-fixture-session' });
export const useUser = () => ({ user: { id: 'synthetic-fixture-user' }, isLoaded: true });
