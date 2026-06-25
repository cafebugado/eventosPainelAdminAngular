import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'admin', pathMatch: 'full' },
  {
    path: 'admin',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'admin/criar-conta',
    loadComponent: () => import('./features/register/register').then((m) => m.Register),
  },
  {
    path: 'admin/recuperar-senha',
    loadComponent: () => import('./features/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'admin/auth/callback',
    loadComponent: () => import('./features/auth-callback/auth-callback').then((m) => m.AuthCallback),
  },
  {
    path: 'admin/dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'eventos', pathMatch: 'full' },
      {
        path: 'eventos',
        loadComponent: () => import('./features/dashboard/eventos/eventos').then((m) => m.Eventos),
      },
      {
        path: 'eventos/novo',
        loadComponent: () => import('./features/dashboard/eventos/event-form/event-form').then((m) => m.EventForm),
      },
      {
        path: 'eventos/:id/editar',
        loadComponent: () => import('./features/dashboard/eventos/event-form/event-form').then((m) => m.EventForm),
      },
      {
        path: 'tags',
        loadComponent: () => import('./features/dashboard/tags/tags').then((m) => m.Tags),
        canActivate: [permissionGuard],
        data: { permission: 'canManageTags' },
      },
      {
        path: 'contribuintes',
        loadComponent: () =>
          import('./features/dashboard/contributors/contributors').then((m) => m.Contributors),
        canActivate: [permissionGuard],
        data: { permission: 'canManageContributors' },
      },
      {
        path: 'repositorio',
        loadComponent: () =>
          import('./features/dashboard/repository/github-stats').then((m) => m.GithubStats),
        canActivate: [permissionGuard],
        data: { permission: 'canManageContributors' },
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./features/dashboard/users/users').then((m) => m.Users),
        canActivate: [permissionGuard],
        data: { permission: 'canManageUsers' },
      },
      {
        path: 'comunidades',
        loadComponent: () =>
          import('./features/dashboard/communities/communities').then((m) => m.Communities),
      },
      {
        path: 'galeria',
        loadComponent: () => import('./features/dashboard/gallery/gallery').then((m) => m.Gallery),
      },
      {
        path: 'auditoria',
        loadComponent: () => import('./features/dashboard/audit/audit-log').then((m) => m.AuditLog),
        canActivate: [permissionGuard],
        data: { permission: 'canManageUsers' },
      },
      {
        path: 'configuracoes',
        loadComponent: () => import('./features/dashboard/settings/settings').then((m) => m.Settings),
      },
    ],
  },
  { path: '**', redirectTo: 'admin' },
];
