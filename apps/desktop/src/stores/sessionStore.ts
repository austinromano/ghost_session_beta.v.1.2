import { create } from 'zustand';
import type { PresenceInfo } from '@ghost/types';
import { getSocket, joinProject, leaveProject, sendChat, sendSessionAction } from '../lib/socket';

interface ChatMessage {
  userId: string;
  displayName: string;
  colour: string;
  text: string;
  timestamp: number;
}

interface SessionState {
  isConnected: boolean;
  onlineUsers: PresenceInfo[];
  chatMessages: ChatMessage[];
  currentProjectId: string | null;

  join: (projectId: string) => void;
  leave: () => void;
  sendAction: (action: any) => void;
  sendMessage: (text: string) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  isConnected: false,
  onlineUsers: [],
  chatMessages: [],
  currentProjectId: null,

  join: (projectId) => {
    const socket = getSocket();
    if (!socket) return;

    joinProject(projectId);
    set({ currentProjectId: projectId, isConnected: true });

    socket.on('presence-update', ({ users }) => {
      set({ onlineUsers: users });
    });

    socket.on('user-joined', ({ userId, displayName, colour }) => {
      set((s) => ({
        onlineUsers: [...s.onlineUsers.filter((u) => u.userId !== userId), {
          userId, displayName, colour, isOnline: true, lastSeen: new Date().toISOString(),
        }],
      }));
    });

    socket.on('user-left', ({ userId }) => {
      set((s) => ({ onlineUsers: s.onlineUsers.filter((u) => u.userId !== userId) }));
    });

    socket.on('chat-message', (msg) => {
      set((s) => ({ chatMessages: [...s.chatMessages, msg] }));
    });
  },

  leave: () => {
    const { currentProjectId } = get();
    if (currentProjectId) leaveProject(currentProjectId);

    const socket = getSocket();
    socket?.off('presence-update');
    socket?.off('user-joined');
    socket?.off('user-left');
    socket?.off('chat-message');

    set({ currentProjectId: null, isConnected: false, onlineUsers: [], chatMessages: [] });
  },

  sendAction: (action) => {
    const { currentProjectId } = get();
    if (currentProjectId) sendSessionAction(currentProjectId, action);
  },

  sendMessage: (text) => {
    const { currentProjectId } = get();
    if (currentProjectId) sendChat(currentProjectId, text);
  },
}));
