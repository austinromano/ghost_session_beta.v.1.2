import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@ghost/protocol';

type GhostSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

// Track which sockets belong to which userId so we can route signals
const userSockets = new Map<string, GhostSocket>();

export function registerWebRTCHandlers(io: Server, socket: GhostSocket) {
  userSockets.set(socket.data.userId, socket);

  socket.on('webrtc-offer', ({ projectId, targetUserId, offer, streamType }) => {
    const target = userSockets.get(targetUserId);
    if (target) {
      target.emit('webrtc-offer', {
        fromUserId: socket.data.userId,
        offer,
        streamType,
      });
    }
  });

  socket.on('webrtc-answer', ({ projectId, targetUserId, answer, streamType }) => {
    const target = userSockets.get(targetUserId);
    if (target) {
      target.emit('webrtc-answer', {
        fromUserId: socket.data.userId,
        answer,
        streamType,
      });
    }
  });

  socket.on('webrtc-ice-candidate', ({ projectId, targetUserId, candidate, streamType }) => {
    const target = userSockets.get(targetUserId);
    if (target) {
      target.emit('webrtc-ice-candidate', {
        fromUserId: socket.data.userId,
        candidate,
        streamType,
      });
    }
  });

  socket.on('webrtc-leave', ({ projectId, streamType }) => {
    const room = `project:${projectId}`;
    socket.to(room).emit('webrtc-user-left', {
      userId: socket.data.userId,
      streamType,
    });
  });

  socket.on('disconnect', () => {
    userSockets.delete(socket.data.userId);
  });
}
