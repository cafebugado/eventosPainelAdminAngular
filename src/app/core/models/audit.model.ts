export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

export type AuditEntity =
  | 'eventos'
  | 'tags'
  | 'contribuintes'
  | 'comunidades'
  | 'galeria_albuns'
  | 'galeria_fotos'
  | 'user_roles'
  | 'user_profiles';

export interface AuditLogRead {
  id: string;
  user_id?: string | null;
  action: AuditAction;
  entity: string;
  entity_id?: string | null;
  changes?: Record<string, { before?: unknown; after?: unknown }> | Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogPage {
  items: AuditLogRead[];
  total: number;
  page: number;
  page_size: number;
}

export interface AuditUser {
  user_id: string;
  email?: string | null;
  nome?: string | null;
  sobrenome?: string | null;
}

export interface AuditLogFilters {
  user_id?: string;
  action?: AuditAction;
  entity?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}
