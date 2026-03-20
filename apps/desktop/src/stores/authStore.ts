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
  deleteAccount: () => Promise<void>;
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
    // Clear all stores so the next user doesn't see old data
    const { useProjectStore } = await import('./projectStore');
    useProjectStore.setState({ projects: [], currentProject: null, versions: [], loading: false });
    const { useSessionStore } = await import('./sessionStore');
    useSessionStore.setState({ chatMessages: [], onlineUsers: [], currentProjectId: null });
    set({ token: null, user: null, isAuthenticated: false });
  },

  deleteAccount: async () => {
    await api.deleteAccount();
    disconnectSocket();
    setToken(null);
    localStorage.removeItem('ghost_token');
    localStorage.removeItem('ghost_user');
    set({ token: null, user: null, isAuthenticated: false });
  },

  restore: () => {
    // Check for token passed via URL (from JUCE plugin WebView)
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      setToken(urlToken);
      connectSocket(urlToken);
      localStorage.setItem('ghost_token', urlToken);
      // Fetch user info with the token
      api.me().then((user) => {
        localStorage.setItem('ghost_user', JSON.stringify(user));
        useAuthStore.setState({ token: urlToken, user, isAuthenticated: true });
      }).catch(() => {
        // Token invalid, fall through to normal restore
        localStorage.removeItem('ghost_token');
      });
      set({ token: urlToken, isAuthenticated: true, loading: true });
      return;
    }

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
