import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@ghost/protocol';
import type { PresenceInfo } from '@ghost/types';
import { db } from '../db/index.js';
import { projects } from '../db/schema.js';
import { eq } from 'drizzle-orm';

type GhostSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type GlobalOnline = Map<string, { userId: string; displayName: string; currentProjectId: string | null; currentProjectName: string | null }>;

// Track online users per project room
const roomUsers = new Map<string, Map<string, PresenceInfo>>();

function getRoomKey(projectId: string) {
  return `project:${projectId}`;
}

export function registerPresenceHandlers(io: Server, socket: GhostSocket, globalOnline: GlobalOnline, broadcastOnlineUsers: () => void) {
  socket.on('join-project', async ({ projectId }) => {
    const room = getRoomKey(projectId);
    socket.join(room);

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

    // Update global activity with project info
    let projectName: string | null = null;
    try {
      const [proj] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, projectId));
      projectName = proj?.name || null;
    } catch {}
    const entry = globalOnline.get(socket.data.userId);
    if (entry) {
      entry.currentProjectId = projectId;
      entry.currentProjectName = projectName;
      broadcastOnlineUsers();
    }

    io.to(room).emit('user-joined', {
      userId: socket.data.userId,
      displayName: socket.data.displayName,
      colour: socket.data.colour,
    });

    const users = Array.from(roomUsers.get(room)!.values());
    socket.emit('presence-update', { users });
  });

  socket.on('leave-project', ({ projectId }) => {
    leaveRoom(io, socket, projectId, globalOnline, broadcastOnlineUsers);
  });

  socket.on('disconnect', () => {
    const entry = globalOnline.get(socket.data.userId);
    if (entry) {
      entry.currentProjectId = null;
      entry.currentProjectName = null;
    }

    for (const [room, users] of roomUsers.entries()) {
      if (users.has(socket.data.userId)) {
        users.delete(socket.data.userId);
        io.to(room).emit('user-left', { userId: socket.data.userId });

        if (users.size === 0) {
          roomUsers.delete(room);
        }
      }
    }
  });
}

function leaveRoom(io: Server, socket: GhostSocket, projectId: string, globalOnline: GlobalOnline, broadcastOnlineUsers: () => void) {
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

  const entry = globalOnline.get(socket.data.userId);
  if (entry) {
    entry.currentProjectId = null;
    entry.currentProjectName = null;
    broadcastOnlineUsers();
  }
}
