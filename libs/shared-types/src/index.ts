export * from './lib/shared-types';

export interface RegisterUserDto {
  email: string;
  name: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
}

export interface CreateWorkspaceDto {
  name: string;
}

export interface WorkspaceResponse {
  id: string;
  name: string;
  slug: string;
}

export interface CreateChannelDto {
  name: string;
  workspaceId: string;
}

export interface ChannelResponse {
  id: string;
  name: string;
  workspaceId: string;
}