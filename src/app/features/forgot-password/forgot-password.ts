import { Component, inject, signal, HostListener } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-forgot-password',
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly emailSent = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.pattern(EMAIL_REGEX)]],
  });

  @HostListener('contextmenu', ['$event'])
  onContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }

  @HostListener('dragstart', ['$event'])
  onDragStart(e: DragEvent): void {
    e.preventDefault();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email } = this.form.getRawValue();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth.requestPasswordReset(email).subscribe({
      next: () => {
        this.loading.set(false);
        this.emailSent.set(true);
      },
      error: (error) => {
        this.loading.set(false);
        const detail = error?.error?.detail;
        if (typeof detail === 'string') {
          this.errorMessage.set(detail);
        } else {
          this.errorMessage.set('Não foi possível enviar o email. Tente novamente.');
        }
      },
    });
  }
}
