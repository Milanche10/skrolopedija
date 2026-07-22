import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, getToken, setUnauthorizedHandler } from './api.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const GUEST_KEY = 'skrol_guest';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [guest, setGuest] = useState(() => localStorage.getItem(GUEST_KEY) === '1');
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setGuest(false);
    localStorage.removeItem(GUEST_KEY);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => logout());
  }, [logout]);

  // pri startu: ako ima token → povuci profil
  useEffect(() => {
    (async () => {
      if (getToken()) {
        try {
          const { user } = await api.me();
          setUser(user);
        } catch {
          setToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (identifier, password) => {
    const { token, user } = await api.login({ identifier, password });
    setToken(token);
    setUser(user);
    setGuest(false);
    localStorage.removeItem(GUEST_KEY);
    return user;
  }, []);

  const register = useCallback(async (body) => {
    const { token, user } = await api.register(body);
    setToken(token);
    setUser(user);
    setGuest(false);
    localStorage.removeItem(GUEST_KEY);
    return user;
  }, []);

  const enterAsGuest = useCallback(() => {
    setGuest(true);
    localStorage.setItem(GUEST_KEY, '1');
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { user } = await api.me();
      setUser(user);
    } catch {
      /* nebitno */
    }
  }, []);

  const RANK = { guest: 0, user: 1, premium: 2, moderator: 3, admin: 4, superadmin: 5 };
  const rank = RANK[user?.role] ?? (user ? 1 : 0);
  const value = {
    user,
    guest,
    loading,
    isAuthed: Boolean(user),
    isAdmin: rank >= RANK.admin, // admin ili superadmin
    isModerator: rank >= RANK.moderator,
    isSuperAdmin: rank >= RANK.superadmin,
    isPremium: Boolean(user && (user.paid || rank >= RANK.premium)),
    login,
    register,
    logout,
    enterAsGuest,
    refreshUser,
    setUser,
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
