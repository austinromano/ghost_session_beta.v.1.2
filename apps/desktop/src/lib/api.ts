import type {
  ApiResponse, AuthResponse, LoginRequest, RegisterRequest,
  CreateProjectRequest, AddTrackRequest, CreateVersionRequest, AddCommentRequest,
  Project, ProjectDetail, Track, Version, Comment, User,
} from '@ghost/types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

let authToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json.data;
}

export const api = {
  // Auth
  login: (data: LoginRequest) => request<AuthResponse>('POST', '/auth/login', data),
  register: (data: RegisterRequest) => request<AuthResponse>('POST', '/auth/register', data),
  logout: () => request<void>('POST', '/auth/logout'),
  me: () => request<User>('GET', '/auth/me'),

  // Projects
  listProjects: () => request<Project[]>('GET', '/projects'),
  createProject: (data: CreateProjectRequest) => request<Project>('POST', '/projects', data),
  getProject: (id: string) => request<ProjectDetail>('GET', `/projects/${id}`),
  updateProject: (id: string, data: Partial<CreateProjectRequest>) =>
    request<Project>('PATCH', `/projects/${id}`, data),
  deleteProject: (id: string) => request<void>('DELETE', `/projects/${id}`),
  inviteMember: (id: string, email: string, role = 'editor') =>
    request<void>('POST', `/projects/${id}/members`, { email, role }),
  removeMember: (id: string, userId: string) =>
    request<void>('DELETE', `/projects/${id}/members/${userId}`),

  // Tracks
  listTracks: (projectId: string) => request<Track[]>('GET', `/projects/${projectId}/tracks`),
  addTrack: (projectId: string, data: AddTrackRequest) =>
    request<Track>('POST', `/projects/${projectId}/tracks`, data),
  updateTrack: (projectId: string, trackId: string, data: Partial<Track>) =>
    request<Track>('PATCH', `/projects/${projectId}/tracks/${trackId}`, data),
  deleteTrack: (projectId: string, trackId: string) =>
    request<void>('DELETE', `/projects/${projectId}/tracks/${trackId}`),

  // Versions
  listVersions: (projectId: string) => request<Version[]>('GET', `/projects/${projectId}/versions`),
  createVersion: (projectId: string, data: CreateVersionRequest) =>
    request<Version>('POST', `/projects/${projectId}/versions`, data),

  // Comments
  listComments: (projectId: string) => request<Comment[]>('GET', `/projects/${projectId}/comments`),
  addComment: (projectId: string, data: AddCommentRequest) =>
    request<Comment>('POST', `/projects/${projectId}/comments`, data),
  updateComment: (projectId: string, commentId: string, text: string) =>
    request<Comment>('PATCH', `/projects/${projectId}/comments/${commentId}`, { text }),
  deleteComment: (projectId: string, commentId: string) =>
    request<void>('DELETE', `/projects/${projectId}/comments/${commentId}`),

  // Users
  listUsers: () => request<{ id: string; displayName: string; email: string; avatarUrl: string | null }[]>('GET', '/users'),

  // Likes
  toggleLike: (trackId: string) => request<{ liked: boolean; count: number }>('POST', `/tracks/${trackId}/like`),
  getLike: (trackId: string) => request<{ liked: boolean; count: number }>('GET', `/tracks/${trackId}/like`),

  // Files
  getUploadUrl: (projectId: string, fileName: string, fileSize: number, mimeType: string) =>
    request<{ fileId: string; uploadUrl: string }>('POST', `/projects/${projectId}/files/upload-url`, {
      fileName, fileSize, mimeType,
    }),
  getDownloadUrl: (projectId: string, fileId: string) =>
    request<{ downloadUrl: string }>('GET', `/projects/${projectId}/files/${fileId}/download-url`),

  // Direct file upload (local storage)
  uploadFile: async (projectId: string, file: File): Promise<{ fileId: string; fileName: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`${BASE_URL}/projects/${projectId}/files/upload`, {
      method: 'POST', headers, body: formData,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Upload failed');
    return json.data;
  },

  // Direct file download URL (local storage) — includes token for drag-to-desktop
  getDirectDownloadUrl: (projectId: string, fileId: string) =>
    `${BASE_URL}/projects/${projectId}/files/${fileId}/download${authToken ? `?token=${authToken}` : ''}`,
};
