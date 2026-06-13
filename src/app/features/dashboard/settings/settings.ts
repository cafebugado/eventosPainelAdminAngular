import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-settings',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly loading = this.profileService.loading;

  readonly profileForm = this.fb.nonNullable.group({
    nome: [''],
    sobrenome: [''],
    github_username: [''],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  get avatarPreviewUrl(): string | null {
    const username = this.profileForm.controls.github_username.value.trim();
    return username ? `https://github.com/${username}.png` : null;
  }

  ngOnInit(): void {
    this.profileService.getMyProfile().subscribe((profile) => {
      this.profileForm.patchValue({
        nome: profile.nome ?? '',
        sobrenome: profile.sobrenome ?? '',
        github_username: profile.github_username ?? '',
      });
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const value = this.profileForm.getRawValue();
    this.profileService
      .upsertMyProfile({
        nome: value.nome || null,
        sobrenome: value.sobrenome || null,
        github_username: value.github_username || null,
      })
      .subscribe({
        next: () => this.notification.showNotification('Perfil atualizado com sucesso', 'success'),
      });
  }

  updatePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.passwordForm.controls.confirmPassword.setErrors({ mismatch: true });
      return;
    }

    this.authService.updatePassword(newPassword).subscribe({
      next: () => {
        this.notification.showNotification('Senha atualizada com sucesso', 'success');
        this.passwordForm.reset();
      },
    });
  }
}
