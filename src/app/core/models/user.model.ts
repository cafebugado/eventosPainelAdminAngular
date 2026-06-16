export type Role = 'super_admin' | 'admin' | 'moderador' | 'participante';

export const ROLE_LABELS: Record<Role | 'none', string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  moderador: 'Moderador',
  participante: 'Participante',
  none: 'Sem Role',
};

export interface CurrentUserRole {
  role: Role | null;
}

export interface UserRoleRead {
  user_id: string;
  role: Role;
  created_at: string;
  updated_at: string;
  email?: string | null;
  nome?: string | null;
  sobrenome?: string | null;
  avatar_url?: string | null;
}

export interface AssignRoleRequest {
  role: Role;
}

export interface UserProfileRead {
  user_id: string;
  nome?: string | null;
  sobrenome?: string | null;
  github_username?: string | null;
  avatar_url?: string | null;
  updated_at: string;
}

export interface UserProfileUpsert {
  nome?: string | null;
  sobrenome?: string | null;
  github_username?: string | null;
  avatar_url?: string | null;
}

export interface Permissions {
  canCreateEvents: boolean;
  canEditEvents: boolean;
  canDeleteEvents: boolean;
  canPublishEvents: boolean;
  canManageTags: boolean;
  canDeleteTags: boolean;
  canManageContributors: boolean;
  canManageUsers: boolean;
  canUploadImages: boolean;
  canSaveSettings: boolean;
}

export const NO_PERMISSIONS: Permissions = {
  canCreateEvents: false,
  canEditEvents: false,
  canDeleteEvents: false,
  canPublishEvents: false,
  canManageTags: false,
  canDeleteTags: false,
  canManageContributors: false,
  canManageUsers: false,
  canUploadImages: false,
  canSaveSettings: false,
};

const FULL_PERMISSIONS: Permissions = {
  canCreateEvents: true,
  canEditEvents: true,
  canDeleteEvents: true,
  canPublishEvents: true,
  canManageTags: true,
  canDeleteTags: true,
  canManageContributors: true,
  canManageUsers: true,
  canUploadImages: true,
  canSaveSettings: true,
};

const MODERADOR_PERMISSIONS: Permissions = {
  canCreateEvents: true,
  canEditEvents: true,
  canDeleteEvents: true,
  canPublishEvents: true,
  canManageTags: true,
  canDeleteTags: true,
  canManageContributors: false,
  canManageUsers: false,
  canUploadImages: true,
  canSaveSettings: true,
};

const PARTICIPANTE_PERMISSIONS: Permissions = {
  canCreateEvents: true,
  canEditEvents: false,
  canDeleteEvents: false,
  canPublishEvents: false,
  canManageTags: false,
  canDeleteTags: false,
  canManageContributors: false,
  canManageUsers: false,
  canUploadImages: true,
  canSaveSettings: false,
};

export const PERMISSIONS: Record<Role | 'none', Permissions> = {
  super_admin: FULL_PERMISSIONS,
  admin: FULL_PERMISSIONS,
  moderador: MODERADOR_PERMISSIONS,
  participante: PARTICIPANTE_PERMISSIONS,
  none: NO_PERMISSIONS,
};
