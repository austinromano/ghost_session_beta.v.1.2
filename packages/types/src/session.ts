export type SessionActionType =
  | 'set-tempo'
  | 'set-key'
  | 'set-time-signature'
  | 'play'
  | 'stop'
  | 'seek'
  | 'add-track'
  | 'remove-track'
  | 'mute-track'
  | 'solo-track'
  | 'set-track-volume';

export interface SessionAction {
  type: SessionActionType;
  payload: Record<string, unknown>;
  userId: string;
  timestamp: number;
}

export interface PresenceInfo {
  userId: string;
  displayName: string;
  colour: string;
  isOnline: boolean;
  lastSeen: string;
}
