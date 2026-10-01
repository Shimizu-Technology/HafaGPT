// Test server alias only. This module is never imported by the production app.
const getToken = async () => null;
export const useAuth = () => ({ getToken });
export const useUser = () => ({ user: null });
