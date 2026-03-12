import { create } from 'zustand';
import type { User } from '@ghost/types';
import { api, setToken } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  error: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  error: null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const data = await api.login({ email, password });
      setToken(data.token);
      connectSocket(data.token);
      localStorage.setItem('ghost_token', data.token);
      localStorage.setItem('ghost_user', JSON.stringify(data.user));
      set({ token: data.token, user: data.user, isAuthenticated: true, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  register: async (email, password, displayName) => {
    set({ loading: true, error: null });
    try {
      const data = await api.register({ email, password, displayName });
      setToken(data.token);
      connectSocket(data.token);
      localStorage.setItem('ghost_token', data.token);
      localStorage.setItem('ghost_user', JSON.stringify(data.user));
      set({ token: data.token, user: data.user, isAuthenticated: true, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  logout: async () => {
    try { await api.logout(); } catch {}
    disconnectSocket();
    setToken(null);
    localStorage.removeItem('ghost_token');
    localStorage.removeItem('ghost_user');
    set({ token: null, user: null, isAuthenticated: false });
  },

  restore: () => {
    const token = localStorage.getItem('ghost_token');
    const userStr = localStorage.getItem('ghost_user');
    if (token && userStr) {
      const user = JSON.parse(userStr);
      setToken(token);
      connectSocket(token);
      set({ token, user, isAuthenticated: true });
    }
  },
}));

// Auto-restore on load
useAuthStore.getState().restore();
