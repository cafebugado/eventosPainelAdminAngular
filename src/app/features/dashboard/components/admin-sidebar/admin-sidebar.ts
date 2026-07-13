import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../../core/services/auth.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { RoleService } from '../../../../core/services/role.service';
import { SidebarService } from '../../../../core/services/sidebar.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { RoleLabelPipe } from '../../../../shared/pipes/role-label.pipe';
import { NotificationService } from '../../../../shared/services/notification.service';
import { MENU_ITEMS, SITE_URL } from '../../menu-items';

@Component({
  selector: 'app-admin-sidebar',
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatTooltipModule, MatDividerModule, RoleLabelPipe],
  templateUrl: './admin-sidebar.html',
  styleUrl: './admin-sidebar.scss',
})
export class AdminSidebar {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);

  readonly sidebarService = inject(SidebarService);
  readonly themeService = inject(ThemeService);
  readonly roleService = inject(RoleService);
  readonly profileService = inject(ProfileService);

  readonly siteUrl = SITE_URL;
  readonly menuItems = computed(() =>
    MENU_ITEMS.filter((item) => !item.permission || this.roleService.permissions()[item.permission]),
  );

  readonly displayName = computed(() => {
    const profile = this.profileService.profile();
    if (profile?.nome) {
      return [profile.nome, profile.sobrenome].filter(Boolean).join(' ');
    }
    const role = this.roleService.role();
    return role ? new RoleLabelPipe().transform(role) : '';
  });

  readonly avatarInitial = computed(() => {
    const profile = this.profileService.profile();
    if (profile?.nome) return profile.nome.charAt(0).toUpperCase();
    const email = this.auth.currentUser()?.email;
    return email ? email.charAt(0).toUpperCase() : '?';
  });

  toggleCollapse(): void {
    this.sidebarService.toggle();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  handleLogout(): void {
    this.auth.signOut().subscribe({
      next: () => this.router.navigate(['/admin']),
      error: () => this.notification.showNotification('Erro ao fazer logout', 'error'),
    });
  }
}
