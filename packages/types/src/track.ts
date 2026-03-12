export type TrackType = 'audio' | 'midi' | 'drum' | 'loop';

export interface Track {
  id: string;
  projectId: string;
  name: string;
  type: TrackType;
  ownerId: string;
  ownerName: string;
  fileId: string | null;
  fileName: string | null;
  volume: number;
  pan: number;
  muted: boolean;
  soloed: boolean;
  bpm: number | null;
  key: string | null;
  position: number;
  createdAt: string;
}
