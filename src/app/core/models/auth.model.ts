import { Role } from './user.model';

export interface AuthSession {
  access_token: string;
  refresh_token?: string | null;
  token_type?: string;
  expires_in?: number | null;
  user: AuthUser;
}

export interface AuthUser {
  id: string;
  email?: string | null;
  role: Role;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdatePasswordRequest {
  password: string;
}
