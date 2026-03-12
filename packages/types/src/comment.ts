export interface Comment {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  text: string;
  positionBeats: number | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}
