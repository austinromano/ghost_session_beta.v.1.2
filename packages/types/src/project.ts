import type { Track } from './track';

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  tempo: number;
  key: string;
  timeSignature: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: string;
}

export interface ProjectDetail extends Project {
  members: ProjectMember[];
  tracks: Track[];
}
