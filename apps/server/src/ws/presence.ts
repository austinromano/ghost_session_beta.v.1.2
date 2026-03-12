import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@ghost/protocol';
import type { PresenceInfo } from '@ghost/types';

type GhostSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

// Track online users per project room
const roomUsers = new Map<string, Map<string, PresenceInfo>>();

function getRoomKey(projectId: string) {
  return `project:${projectId}`;
}

export function registerPresenceHandlers(io: Server, socket: GhostSocket) {
  socket.on('join-project', ({ projectId }) => {
    const room = getRoomKey(projectId);
    socket.join(room);

    // Add user to room tracking
    if (!roomUsers.has(room)) {
      roomUsers.set(room, new Map());
    }

    const userInfo: PresenceInfo = {
      userId: socket.data.userId,
      displayName: socket.data.displayName,
      colour: socket.data.colour,
      isOnline: true,
      lastSeen: new Date().toISOString(),
    };

    roomUsers.get(room)!.set(socket.data.userId, userInfo);

    // Notify everyone in room
    io.to(room).emit('user-joined', {
      userId: socket.data.userId,
      displayName: socket.data.displayName,
      colour: socket.data.colour,
    });

    // Send full presence list to the joiner
    const users = Array.from(roomUsers.get(room)!.values());
    socket.emit('presence-update', { users });
  });

  socket.on('leave-project', ({ projectId }) => {
    leaveRoom(io, socket, projectId);
  });

  socket.on('disconnect', () => {
    // Remove from all rooms
    for (const [room, users] of roomUsers.entries()) {
      if (users.has(socket.data.userId)) {
        users.delete(socket.data.userId);
        const projectId = room.replace('project:', '');
        io.to(room).emit('user-left', { userId: socket.data.userId });

        if (users.size === 0) {
          roomUsers.delete(room);
        }
      }
    }
  });
}

function leaveRoom(io: Server, socket: GhostSocket, projectId: string) {
  const room = getRoomKey(projectId);
  socket.leave(room);

  const users = roomUsers.get(room);
  if (users) {
    users.delete(socket.data.userId);
    io.to(room).emit('user-left', { userId: socket.data.userId });

    if (users.size === 0) {
      roomUsers.delete(room);
    }
  }
}
