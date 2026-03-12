import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@ghost/protocol';

type GhostSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function registerSessionHandlers(io: Server, socket: GhostSocket) {
  socket.on('session-action', ({ projectId, action }) => {
    // Broadcast to everyone in the room except sender
    socket.to(`project:${projectId}`).emit('session-action', { action });
  });

  socket.on('transport-sync', ({ projectId, beatPosition }) => {
    socket.to(`project:${projectId}`).emit('transport-sync', {
      beatPosition,
      serverTimestamp: Date.now(),
    });
  });
}
