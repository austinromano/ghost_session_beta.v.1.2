import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@ghost/protocol';

type GhostSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function registerChatHandlers(io: Server, socket: GhostSocket) {
  socket.on('chat-message', ({ projectId, text }) => {
    const room = `project:${projectId}`;

    // Broadcast to everyone in room including sender
    io.to(room).emit('chat-message', {
      userId: socket.data.userId,
      displayName: socket.data.displayName,
      colour: socket.data.colour,
      text,
      timestamp: Date.now(),
    });
  });
}
