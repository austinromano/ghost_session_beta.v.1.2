import { create } from 'zustand';
import type { Project, ProjectDetail, Track, Version, Comment } from '@ghost/types';
import { api } from '../lib/api';

interface ProjectState {
  projects: Project[];
  currentProject: ProjectDetail | null;
  versions: Version[];
  comments: Comment[];
  loading: boolean;

  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (data: { name: string; description?: string; tempo?: number; key?: string; timeSignature?: string }) => Promise<Project>;

  updateProject: (projectId: string, data: { name?: string; tempo?: number; key?: string; genre?: string }) => Promise<void>;
  addTrack: (projectId: string, data: { name: string; type: string }) => Promise<void>;
  updateTrack: (projectId: string, trackId: string, data: Partial<Track>) => Promise<void>;
  deleteTrack: (projectId: string, trackId: string) => Promise<void>;

  fetchVersions: (projectId: string) => Promise<void>;
  createVersion: (projectId: string, data: { name: string; description?: string }) => Promise<void>;

  fetchComments: (projectId: string) => Promise<void>;
  addComment: (projectId: string, data: { text: string; positionBeats?: number; parentId?: string }) => Promise<void>;
  deleteComment: (projectId: string, commentId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  versions: [],
  comments: [],
  loading: false,

  fetchProjects: async () => {
    set({ loading: true });
    const projects = await api.listProjects();
    set({ projects, loading: false });
  },

  fetchProject: async (id) => {
    set({ loading: true });
    const project = await api.getProject(id);
    set({ currentProject: project, loading: false });
  },

  createProject: async (data) => {
    const project = await api.createProject(data);
    set((s) => ({ projects: [project, ...s.projects] }));
    return project;
  },

  updateProject: async (projectId, data) => {
    await api.updateProject(projectId, data);
    await get().fetchProject(projectId);
    // Also update the project in the projects list
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, ...data } : p
      ),
    }));
  },

  addTrack: async (projectId, data) => {
    await api.addTrack(projectId, data as any);
    await get().fetchProject(projectId);
  },

  updateTrack: async (projectId, trackId, data) => {
    await api.updateTrack(projectId, trackId, data);
    await get().fetchProject(projectId);
  },

  deleteTrack: async (projectId, trackId) => {
    await api.deleteTrack(projectId, trackId);
    await get().fetchProject(projectId);
  },

  fetchVersions: async (projectId) => {
    const versions = await api.listVersions(projectId);
    set({ versions });
  },

  createVersion: async (projectId, data) => {
    await api.createVersion(projectId, data);
    await get().fetchVersions(projectId);
  },

  fetchComments: async (projectId) => {
    const comments = await api.listComments(projectId);
    set({ comments });
  },

  addComment: async (projectId, data) => {
    await api.addComment(projectId, data);
    await get().fetchComments(projectId);
  },

  deleteComment: async (projectId, commentId) => {
    await api.deleteComment(projectId, commentId);
    await get().fetchComments(projectId);
  },
}));
