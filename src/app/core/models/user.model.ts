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

export type Genero = 'Masculino' | 'Feminino' | 'Outro' | 'Prefiro não informar';
export type NivelExperiencia = 'Estagiário' | 'Júnior' | 'Pleno' | 'Sênior' | 'Especialista/Staff';

export const GENERO_OPCOES: Genero[] = ['Masculino', 'Feminino', 'Outro', 'Prefiro não informar'];
export const NIVEL_EXPERIENCIA_OPCOES: NivelExperiencia[] = [
  'Estagiário',
  'Júnior',
  'Pleno',
  'Sênior',
  'Especialista/Staff',
];

export interface UserProfileRead {
  user_id: string;
  nome?: string | null;
  sobrenome?: string | null;
  github_username?: string | null;
  linkedin_url?: string | null;
  avatar_url?: string | null;
  data_nascimento?: string | null;
  genero?: Genero | null;
  whatsapp?: string | null;
  provider?: string | null;
  cargo_atual?: string | null;
  empresa?: string | null;
  area_atuacao?: string | null;
  nivel_experiencia?: NivelExperiencia | null;
  portfolio_url?: string | null;
  bio?: string | null;
  updated_at: string;
}

export interface UserProfileUpsert {
  nome?: string | null;
  sobrenome?: string | null;
  github_username?: string | null;
  linkedin_url?: string | null;
  avatar_url?: string | null;
  data_nascimento?: string | null;
  genero?: Genero | null;
  whatsapp?: string | null;
  cargo_atual?: string | null;
  empresa?: string | null;
  area_atuacao?: string | null;
  nivel_experiencia?: NivelExperiencia | null;
  portfolio_url?: string | null;
  bio?: string | null;
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
