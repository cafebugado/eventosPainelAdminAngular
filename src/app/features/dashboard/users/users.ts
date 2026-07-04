import { Component, OnInit, inject, signal } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { Role, UserRoleRead } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { RoleService } from '../../../core/services/role.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { RoleLabelPipe } from '../../../shared/pipes/role-label.pipe';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-users',
  imports: [
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    RoleLabelPipe,
  ],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users implements OnInit {
  private readonly roleService = inject(RoleService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  readonly roles: Role[] = ['super_admin', 'admin', 'moderador', 'participante'];
  readonly users = signal<UserRoleRead[]>([]);
  readonly loading = signal(false);
  readonly columns = ['nome', 'email', 'role', 'acoes'];

  readonly currentUserId = this.authService.currentUser()?.id;
  readonly isSuperAdmin = this.roleService.role() === 'super_admin';

  ngOnInit(): void {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.roleService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  isCurrentUser(user: UserRoleRead): boolean {
    return user.user_id === this.currentUserId;
  }

  changeRole(user: UserRoleRead, role: Role): void {
    if (role === user.role) return;

    this.roleService.assignUserRole(user.user_id, role).subscribe({
      next: () => {
        this.notification.showNotification('Permissão atualizada com sucesso', 'success');
        this.loadUsers();
      },
    });
  }

  removeRole(user: UserRoleRead): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Remover acesso',
        message: `Tem certeza que deseja remover o acesso de "${user.nome ?? user.email ?? user.user_id}"?`,
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.roleService.removeUserRole(user.user_id).subscribe({
        next: () => {
          this.notification.showNotification('Acesso removido com sucesso', 'success');
          this.loadUsers();
        },
      });
    });
  }
}
