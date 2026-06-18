import { Component, inject, signal, HostListener } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { minAgeValidator } from '../../shared/validators/min-age.validator';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
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
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);

  readonly hidePassword = signal(true);
  readonly hideConfirmPassword = signal(true);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly emailConfirmationPending = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      nome: ['', [Validators.required, Validators.minLength(2)]],
      sobrenome: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.pattern(EMAIL_REGEX)]],
      dataNascimento: ['', [Validators.required, minAgeValidator(18)]],
      github: ['', Validators.required],
      linkedin: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

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

  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword.set(!this.hideConfirmPassword());
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nome, sobrenome, email, dataNascimento, github, linkedin, password, confirmPassword } =
      this.form.getRawValue();

    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth
      .register({
        nome,
        sobrenome,
        email,
        senha: password,
        confirma_senha: confirmPassword,
        data_nascimento: dataNascimento,
        github,
        linkedin,
      })
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          if (response.confirmacao_pendente) {
            this.emailConfirmationPending.set(true);
          } else {
            this.router.navigate(['/admin/dashboard']);
          }
        },
        error: (error) => {
          this.loading.set(false);
          const detail = error?.error?.detail;
          if (error?.status === 409) {
            this.errorMessage.set('Este email já está cadastrado.');
          } else if (typeof detail === 'string') {
            this.errorMessage.set(detail);
          } else if (Array.isArray(detail) && detail.length > 0) {
            this.errorMessage.set(detail[0]?.msg ?? 'Dados inválidos. Verifique os campos.');
          } else {
            this.errorMessage.set('Não foi possível criar sua conta. Tente novamente.');
          }
        },
      });
  }
}
