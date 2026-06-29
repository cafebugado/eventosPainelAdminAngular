import { Component, inject, signal, HostListener } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REMEMBER_EMAIL_KEY = 'eventos_admin_remember_email';

/** Aquece o cache do browser com os chunks lazy do dashboard/eventos antes da navegação. */
function preloadDashboardChunks(): void {
  import('../dashboard/dashboard');
  import('../dashboard/eventos/eventos');
}

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly hidePassword = signal(true);
  readonly rememberEmail = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.pattern(EMAIL_REGEX)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/admin/dashboard']);
      return;
    }

    // Fallback: captura code OAuth que chegou em /admin em vez de /admin/auth/callback
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      this.router.navigate(['/admin/auth/callback'], { queryParams: { code } });
      return;
    }

    this.loadRememberedEmail();
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }

  @HostListener('dragstart', ['$event'])
  onDragStart(e: DragEvent): void {
    e.preventDefault();
  }

  togglePasswordVisibility(): void {
    this.hidePassword.set(!this.hidePassword());
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth.signIn(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        if (this.rememberEmail()) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, email);
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
        preloadDashboardChunks();
        this.router.navigate(['/admin/dashboard']);
      },
      error: (error) => {
        this.loading.set(false);
        const detail = error?.error?.detail;
        if (detail === 'Invalid login credentials') {
          this.errorMessage.set('Email ou senha incorretos');
        } else if (typeof detail === 'string') {
          this.errorMessage.set(detail);
        } else if (Array.isArray(detail) && detail.length > 0) {
          this.errorMessage.set(detail[0]?.msg ?? 'Dados inválidos. Verifique os campos.');
        } else {
          this.errorMessage.set('Não foi possível fazer login. Tente novamente.');
        }
      },
    });
  }

  loginWithGithub(): void {
    this.auth.getOAuthUrl('github').subscribe({
      next: ({ url }) => (window.location.href = url),
    });
  }

  loginWithGoogle(): void {
    this.auth.getOAuthUrl('google').subscribe({
      next: ({ url }) => (window.location.href = url),
    });
  }

  private loadRememberedEmail(): void {
    const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (saved) {
      this.form.controls.email.setValue(saved);
      this.rememberEmail.set(true);
    }
  }
}
