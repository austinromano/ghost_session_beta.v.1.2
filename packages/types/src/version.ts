export interface Version {
  id: string;
  projectId: string;
  versionNumber: number;
  name: string;
  description: string;
  createdBy: string;
  createdByName: string;
  fileManifest: FileManifestEntry[];
  createdAt: string;
}

export interface FileManifestEntry {
  fileId: string;
  fileName: string;
  trackId: string | null;
  trackName: string | null;
  fileSize: number;
}
