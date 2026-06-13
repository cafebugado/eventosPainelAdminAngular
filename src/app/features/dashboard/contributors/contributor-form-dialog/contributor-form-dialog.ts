import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ContributorCreate, ContributorRead, ContributorUpdate } from '../../../../core/models/contributor.model';
import { ContributorService } from '../../../../core/services/contributor.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import {
  isValidGitHubUsername,
  isValidLinkedInUrl,
  isValidPortfolioUrl,
} from '../../../../shared/utils/url-validators.util';

export interface ContributorFormDialogData {
  contributor?: ContributorRead;
}

function githubUsernameValidator(): ValidatorFn {
  return (control): ValidationErrors | null => {
    if (!control.value) return null;
    return isValidGitHubUsername(control.value) ? null : { githubUsername: true };
  };
}

function linkedinValidator(): ValidatorFn {
  return (control): ValidationErrors | null => (isValidLinkedInUrl(control.value) ? null : { linkedin: true });
}

function portfolioValidator(): ValidatorFn {
  return (control): ValidationErrors | null => (isValidPortfolioUrl(control.value) ? null : { portfolio: true });
}

@Component({
  selector: 'app-contributor-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './contributor-form-dialog.html',
  styleUrl: './contributor-form-dialog.scss',
})
export class ContributorFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ContributorFormDialog>);
  private readonly contributorService = inject(ContributorService);
  private readonly notification = inject(NotificationService);
  readonly data = inject<ContributorFormDialogData>(MAT_DIALOG_DATA);

  readonly isEdit = !!this.data?.contributor;
  readonly searchingGithub = signal(false);

  readonly form = this.fb.nonNullable.group({
    github_username: [this.data?.contributor?.github_username ?? '', [Validators.required, githubUsernameValidator()]],
    nome: [this.data?.contributor?.nome ?? ''],
    avatar_url: [this.data?.contributor?.avatar_url ?? ''],
    linkedin_url: [this.data?.contributor?.linkedin_url ?? '', linkedinValidator()],
    portfolio_url: [this.data?.contributor?.portfolio_url ?? '', portfolioValidator()],
  });

  searchGitHub(): void {
    const username = this.form.controls.github_username.value;
    if (!username || !isValidGitHubUsername(username)) {
      this.notification.showNotification('Informe um username válido do GitHub', 'error');
      return;
    }

    this.searchingGithub.set(true);
    this.contributorService.fetchGitHubUser(username).subscribe({
      next: (info) => {
        this.form.patchValue({
          nome: info.name ?? this.form.controls.nome.value,
          avatar_url: info.avatar_url,
        });
        this.searchingGithub.set(false);
      },
      error: () => {
        this.searchingGithub.set(false);
        this.notification.showNotification('Usuário do GitHub não encontrado', 'error');
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const result: ContributorCreate | ContributorUpdate = this.form.getRawValue();
    this.dialogRef.close(result);
  }
}
