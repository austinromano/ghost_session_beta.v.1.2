import { Server as SocketServer } from 'socket.io';
import type { Server as HTTPServer } from 'node:http';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@ghost/protocol';
import { validateSession } from '../services/auth.js';
import { registerSessionHandlers } from './session.js';
import { registerPresenceHandlers } from './presence.js';
import { registerChatHandlers } from './chat.js';
import { registerWebRTCHandlers } from './webrtc.js';

// Collaborator colour palette
const COLLAB_COLOURS = [
  '#1ABC9C', '#2ECC71', '#3498DB', '#9B59B6',
  '#E91E63', '#F1C40F', '#E67E22', '#E74C3C',
  '#00BCD4', '#FF6B6B', '#A29BFE', '#FD79A8',
  '#00CEC9', '#6C5CE7', '#FDCB6E', '#55EFC4',
];

/** Deterministic colour based on user ID */
export function userColour(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return COLLAB_COLOURS[Math.abs(hash) % COLLAB_COLOURS.length];
}

export function setupWebSocket(httpServer: HTTPServer) {
  const io = new SocketServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // Auth middleware for Socket.IO
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token as string;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const user = validateSession(token);
    if (!user) {
      return next(new Error('Invalid token'));
    }

    socket.data.userId = user.id;
    socket.data.displayName = user.displayName;
    socket.data.colour = userColour(user.id);
    next();
  });

  // Track globally online users
  const globalOnline = new Map<string, { userId: string; displayName: string }>();

  function broadcastOnlineUsers() {
    const list = Array.from(globalOnline.values());
    io.emit('global:online-users' as any, list);
  }

  io.on('connection', (socket) => {
    console.log(`[WS] ${socket.data.displayName} connected`);

    globalOnline.set(socket.data.userId, { userId: socket.data.userId, displayName: socket.data.displayName });
    broadcastOnlineUsers();

    registerSessionHandlers(io, socket);
    registerPresenceHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerWebRTCHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`[WS] ${socket.data.displayName} disconnected`);
      globalOnline.delete(socket.data.userId);
      broadcastOnlineUsers();
    });
  });

  ioInstance = io;
  return io;
}

let ioInstance: SocketServer | null = null;

export function getIO() {
  return ioInstance;
}
