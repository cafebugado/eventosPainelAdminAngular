import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { GENERO_OPCOES, NIVEL_EXPERIENCIA_OPCOES, UserProfileRead, UserProfileUpsert } from '../../../core/models/user.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { minAgeValidator } from '../../../shared/validators/min-age.validator';
import { ChangePasswordDialog } from './change-password-dialog/change-password-dialog';

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
    MatSelectModule,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly loading = this.profileService.loading;
  readonly generoOpcoes = GENERO_OPCOES;
  readonly nivelExperienciaOpcoes = NIVEL_EXPERIENCIA_OPCOES;

  readonly currentUser = this.authService.currentUser;
  readonly isEmailProvider = computed(() => (this.currentUser()?.provider ?? 'email') === 'email');

  readonly editingPersonal = signal(false);
  readonly editingProfessional = signal(false);

  readonly personalForm = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    sobrenome: ['', Validators.required],
    dataNascimento: ['', [Validators.required, minAgeValidator(18)]],
    genero: [''],
    whatsapp: [''],
  });

  readonly professionalForm = this.fb.nonNullable.group({
    cargo_atual: [''],
    empresa: [''],
    area_atuacao: [''],
    nivel_experiencia: [''],
    github_username: [''],
    linkedin_url: [''],
    portfolio_url: [''],
    bio: [''],
  });

  get avatarPreviewUrl(): string | null {
    return this.profileService.profile()?.avatar_url ?? null;
  }

  ngOnInit(): void {
    this.personalForm.disable();
    this.professionalForm.disable();

    this.profileService.getMyProfile().subscribe((profile) => {
      this.patchPersonalForm(profile);
      this.patchProfessionalForm(profile);
    });
  }

  editPersonal(): void {
    this.editingPersonal.set(true);
    this.personalForm.enable();
  }

  cancelPersonal(): void {
    this.patchPersonalForm(this.profileService.profile());
    this.personalForm.disable();
    this.editingPersonal.set(false);
  }

  savePersonal(): void {
    if (this.personalForm.invalid) {
      this.personalForm.markAllAsTouched();
      return;
    }

    const value = this.personalForm.getRawValue();
    this.saveProfile(
      {
        nome: value.nome || null,
        sobrenome: value.sobrenome || null,
        data_nascimento: value.dataNascimento || null,
        genero: (value.genero || null) as UserProfileUpsert['genero'],
        whatsapp: value.whatsapp || null,
      },
      () => {
        this.personalForm.disable();
        this.editingPersonal.set(false);
      },
    );
  }

  editProfessional(): void {
    this.editingProfessional.set(true);
    this.professionalForm.enable();
  }

  cancelProfessional(): void {
    this.patchProfessionalForm(this.profileService.profile());
    this.professionalForm.disable();
    this.editingProfessional.set(false);
  }

  saveProfessional(): void {
    if (this.professionalForm.invalid) {
      this.professionalForm.markAllAsTouched();
      return;
    }

    const value = this.professionalForm.getRawValue();
    this.saveProfile(
      {
        cargo_atual: value.cargo_atual || null,
        empresa: value.empresa || null,
        area_atuacao: value.area_atuacao || null,
        nivel_experiencia: (value.nivel_experiencia || null) as UserProfileUpsert['nivel_experiencia'],
        github_username: value.github_username || null,
        linkedin_url: value.linkedin_url || null,
        portfolio_url: value.portfolio_url || null,
        bio: value.bio || null,
      },
      () => {
        this.professionalForm.disable();
        this.editingProfessional.set(false);
      },
    );
  }

  private patchPersonalForm(profile: UserProfileRead | null): void {
    this.personalForm.patchValue({
      nome: profile?.nome ?? '',
      sobrenome: profile?.sobrenome ?? '',
      dataNascimento: profile?.data_nascimento ?? '',
      genero: profile?.genero ?? '',
      whatsapp: profile?.whatsapp ?? '',
    });
  }

  private patchProfessionalForm(profile: UserProfileRead | null): void {
    this.professionalForm.patchValue({
      cargo_atual: profile?.cargo_atual ?? '',
      empresa: profile?.empresa ?? '',
      area_atuacao: profile?.area_atuacao ?? '',
      nivel_experiencia: profile?.nivel_experiencia ?? '',
      github_username: profile?.github_username ?? '',
      linkedin_url: profile?.linkedin_url ?? '',
      portfolio_url: profile?.portfolio_url ?? '',
      bio: profile?.bio ?? '',
    });
  }

  private saveProfile(payload: UserProfileUpsert, onSuccess: () => void): void {
    this.profileService.upsertMyProfile(payload).subscribe({
      next: () => {
        this.notification.showNotification('Perfil atualizado com sucesso', 'success');
        onSuccess();
      },
    });
  }

  openChangePasswordDialog(): void {
    this.dialog.open(ChangePasswordDialog);
  }
}
