export const ACTION_TYPES = {
  SET_TEMPO: 'set-tempo',
  SET_KEY: 'set-key',
  SET_TIME_SIGNATURE: 'set-time-signature',
  PLAY: 'play',
  STOP: 'stop',
  SEEK: 'seek',
  ADD_TRACK: 'add-track',
  REMOVE_TRACK: 'remove-track',
  MUTE_TRACK: 'mute-track',
  SOLO_TRACK: 'solo-track',
  SET_TRACK_VOLUME: 'set-track-volume',
} as const;

export type ActionType = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES];

export interface SetTempoPayload {
  bpm: number;
}

export interface SetKeyPayload {
  key: string;
}

export interface SetTimeSignaturePayload {
  numerator: number;
  denominator: number;
}

export interface SeekPayload {
  positionBeats: number;
}

export interface AddTrackPayload {
  trackId: string;
  name: string;
  type: 'audio' | 'midi' | 'drum' | 'loop';
  fileId?: string;
  fileName?: string;
  bpm?: number;
  key?: string;
}

export interface RemoveTrackPayload {
  trackId: string;
}

export interface MuteTrackPayload {
  trackId: string;
  muted: boolean;
}

export interface SoloTrackPayload {
  trackId: string;
  soloed: boolean;
}

export interface SetTrackVolumePayload {
  trackId: string;
  volume: number;
}

export type ActionPayloadMap = {
  [ACTION_TYPES.SET_TEMPO]: SetTempoPayload;
  [ACTION_TYPES.SET_KEY]: SetKeyPayload;
  [ACTION_TYPES.SET_TIME_SIGNATURE]: SetTimeSignaturePayload;
  [ACTION_TYPES.PLAY]: Record<string, never>;
  [ACTION_TYPES.STOP]: Record<string, never>;
  [ACTION_TYPES.SEEK]: SeekPayload;
  [ACTION_TYPES.ADD_TRACK]: AddTrackPayload;
  [ACTION_TYPES.REMOVE_TRACK]: RemoveTrackPayload;
  [ACTION_TYPES.MUTE_TRACK]: MuteTrackPayload;
  [ACTION_TYPES.SOLO_TRACK]: SoloTrackPayload;
  [ACTION_TYPES.SET_TRACK_VOLUME]: SetTrackVolumePayload;
};
