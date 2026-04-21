export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: string;
  user: User;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  name: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  creatorId: string;
  members: WorkspaceMember[];
  channels: Channel[];
  createdAt: string;
  updatedAt: string;
}

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  messageId?: string;
  directMessageId?: string;
  createdAt?: string;
}

export interface Message {
  id: string;
  content: string;
  authorId: string;
  channelId?: string;
  receiverId?: string;
  workspaceId?: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
  author: User;
  reactions?: Reaction[];
  _count?: {
    replies: number;
  };
}
