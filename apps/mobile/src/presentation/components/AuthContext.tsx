import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@sakiyomi/shared';
import { getToken, clearToken } from '../../infrastructure/apiClient';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  setAuth: (token: string, user: User) => void;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken_] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getToken().then((t) => {
      setToken_(t);
      setIsLoading(false);
    });
  }, []);

  function setAuth(t: string, u: User) {
    setToken_(t);
    setUser(u);
  }

  async function signOut() {
    await clearToken();
    setToken_(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, setAuth, signOut, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
