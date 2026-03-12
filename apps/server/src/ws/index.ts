import { Server as SocketServer } from 'socket.io';
import type { Server as HTTPServer } from 'node:http';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@ghost/protocol';
import { validateSession } from '../services/auth.js';
import { registerSessionHandlers } from './session.js';
import { registerPresenceHandlers } from './presence.js';
import { registerChatHandlers } from './chat.js';

// Collaborator colour palette
const COLLAB_COLOURS = [
  '#00FFC8', '#8B5CF6', '#FF6B6B', '#4ECDC4',
  '#FFD93D', '#FF8A5C', '#6C5CE7', '#E056C1',
];
let colourIndex = 0;

function nextColour(): string {
  const c = COLLAB_COLOURS[colourIndex % COLLAB_COLOURS.length];
  colourIndex++;
  return c;
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
    socket.data.colour = nextColour();
    next();
  });

  io.on('connection', (socket) => {
    console.log(`[WS] ${socket.data.displayName} connected`);

    registerSessionHandlers(io, socket);
    registerPresenceHandlers(io, socket);
    registerChatHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`[WS] ${socket.data.displayName} disconnected`);
    });
  });

  return io;
}
