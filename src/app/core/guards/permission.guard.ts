import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Permissions } from '../models/user.model';
import { RoleService } from '../services/role.service';

export const permissionGuard: CanActivateFn = (route) => {
  const roleService = inject(RoleService);
  const router = inject(Router);

  const requiredPermission = route.data?.['permission'] as keyof Permissions | undefined;
  if (!requiredPermission) {
    return true;
  }

  if (roleService.permissions()[requiredPermission]) {
    return true;
  }

  return router.createUrlTree(['/admin/dashboard/eventos']);
};
