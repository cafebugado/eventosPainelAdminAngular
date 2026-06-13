import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AssignRoleRequest,
  NO_PERMISSIONS,
  PERMISSIONS,
  Permissions,
  Role,
  UserRoleRead,
} from '../models/user.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = environment.apiUrl;

  readonly role = computed<Role | null>(() => this.auth.currentUser()?.role ?? null);
  readonly permissions = computed<Permissions>(() => {
    const role = this.role();
    return role ? PERMISSIONS[role] : NO_PERMISSIONS;
  });

  /** super_admin enxerga todos; admin enxerga apenas moderadores/sem role. */
  getUsers(): Observable<UserRoleRead[]> {
    const path = this.role() === 'super_admin' ? '/users' : '/users/moderators';
    return this.http.get<UserRoleRead[]>(`${this.baseUrl}${path}`);
  }

  assignUserRole(userId: string, role: Role): Observable<UserRoleRead> {
    const body: AssignRoleRequest = { role };
    return this.http.put<UserRoleRead>(`${this.baseUrl}/users/${userId}/role`, body);
  }

  removeUserRole(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/users/${userId}/role`);
  }
}
