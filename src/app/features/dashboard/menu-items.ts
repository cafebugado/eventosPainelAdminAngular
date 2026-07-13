import { Permissions } from '../../core/models/user.model';

export interface MenuItem {
  label: string;
  icon: string;
  route: string;
  permission?: keyof Permissions;
  external?: boolean;
}

export const MENU_ITEMS: MenuItem[] = [
  { label: 'Eventos', icon: 'calendar_month', route: 'eventos' },
  { label: 'Tags', icon: 'sell', route: 'tags', permission: 'canManageTags' },
  { label: 'Contribuintes', icon: 'group', route: 'contribuintes', permission: 'canManageContributors' },
  { label: 'Repositório', icon: 'account_tree', route: 'repositorio', permission: 'canManageContributors' },
  { label: 'Usuários', icon: 'manage_accounts', route: 'usuarios', permission: 'canManageUsers' },
  { label: 'Comunidades', icon: 'groups', route: 'comunidades' },
  { label: 'Galeria', icon: 'photo_library', route: 'galeria' },
  { label: 'Auditoria', icon: 'fact_check', route: 'auditoria', permission: 'canManageUsers' },
  { label: 'Configurações', icon: 'settings', route: 'configuracoes' },
];

export const SITE_URL = 'https://eventos.cafebugado.com.br/eventos';
