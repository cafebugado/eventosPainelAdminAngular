import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-auth-callback',
  imports: [MatProgressSpinnerModule],
  template: `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;">
      <mat-spinner diameter="48"></mat-spinner>
    </div>
  `,
})
export class AuthCallback {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  constructor() {
    const code = this.route.snapshot.queryParamMap.get('code');

    if (!code) {
      this.router.navigate(['/admin']);
      return;
    }

    this.auth.oauthCallback(code).subscribe({
      next: () => this.router.navigate(['/admin/dashboard']),
      error: () => {
        this.notification.showNotification('Falha na autenticação. Tente novamente.', 'error');
        this.router.navigate(['/admin']);
      },
    });
  }
}
