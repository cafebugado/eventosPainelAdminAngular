import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { AdminMobileNav } from './components/admin-mobile-nav/admin-mobile-nav';
import { AdminSidebar } from './components/admin-sidebar/admin-sidebar';

@Component({
  selector: 'app-dashboard',
  imports: [RouterOutlet, MatButtonModule, MatIconModule, MatSidenavModule, MatToolbarModule, AdminSidebar, AdminMobileNav],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly profileService = inject(ProfileService);

  readonly mobileNavOpen = signal(false);

  ngOnInit(): void {
    if (!this.auth.getSession()) {
      this.router.navigate(['/admin']);
      return;
    }

    this.profileService.getMyProfile().subscribe();
  }

  toggleMobileNav(): void {
    this.mobileNavOpen.set(!this.mobileNavOpen());
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }
}
