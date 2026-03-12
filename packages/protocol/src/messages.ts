import type { SessionAction, PresenceInfo } from '@ghost/types';

// ── Client → Server ──────────────────────────────────────────────────

export interface ClientToServerEvents {
  'join-project': (data: { projectId: string }) => void;
  'leave-project': (data: { projectId: string }) => void;
  'session-action': (data: {
    projectId: string;
    action: SessionAction;
  }) => void;
  'transport-sync': (data: {
    projectId: string;
    beatPosition: number;
  }) => void;
  'chat-message': (data: {
    projectId: string;
    text: string;
  }) => void;
}

// ── Server → Client ──────────────────────────────────────────────────

export interface ServerToClientEvents {
  'session-action': (data: {
    action: SessionAction;
  }) => void;
  'session-state-sync': (data: {
    projectId: string;
    state: Record<string, unknown>;
  }) => void;
  'transport-sync': (data: {
    beatPosition: number;
    serverTimestamp: number;
  }) => void;
  'presence-update': (data: {
    users: PresenceInfo[];
  }) => void;
  'chat-message': (data: {
    userId: string;
    displayName: string;
    colour: string;
    text: string;
    timestamp: number;
  }) => void;
  'user-joined': (data: {
    userId: string;
    displayName: string;
    colour: string;
  }) => void;
  'user-left': (data: {
    userId: string;
  }) => void;
  'error': (data: {
    message: string;
  }) => void;
}

// ── Socket data attached to each connection ──────────────────────────

export interface SocketData {
  userId: string;
  displayName: string;
  colour: string;
}
