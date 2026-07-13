import { Component, computed, inject, output } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../../../core/services/auth.service';
import { RoleService } from '../../../../core/services/role.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { RoleLabelPipe } from '../../../../shared/pipes/role-label.pipe';
import { NotificationService } from '../../../../shared/services/notification.service';
import { MENU_ITEMS, SITE_URL } from '../../menu-items';

@Component({
  selector: 'app-admin-mobile-nav',
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatToolbarModule, RoleLabelPipe],
  templateUrl: './admin-mobile-nav.html',
  styleUrl: './admin-mobile-nav.scss',
})
export class AdminMobileNav {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);

  readonly roleService = inject(RoleService);
  readonly themeService = inject(ThemeService);

  readonly closeRequested = output<void>();
  readonly siteUrl = SITE_URL;

  readonly menuItems = computed(() =>
    MENU_ITEMS.filter((item) => !item.permission || this.roleService.permissions()[item.permission]),
  );

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  close(): void {
    this.closeRequested.emit();
  }

  handleLogout(): void {
    this.auth.signOut().subscribe({
      next: () => this.router.navigate(['/admin']),
      error: () => this.notification.showNotification('Erro ao fazer logout', 'error'),
    });
  }
}
