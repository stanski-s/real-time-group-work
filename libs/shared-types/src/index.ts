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