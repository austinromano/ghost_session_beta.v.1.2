export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface ProducerProfile {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  colour: string;
  isOnline: boolean;
  isHost: boolean;
}
