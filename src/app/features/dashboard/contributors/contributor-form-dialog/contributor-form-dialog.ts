import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
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
import { ContributorCreate, ContributorRead } from '../../../../core/models/contributor.model';
import { ContributorService } from '../../../../core/services/contributor.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import {
  isValidGitHubUsername,
  isValidLinkedInUrl,
  isValidPortfolioUrl,
} from '../../../../shared/utils/url-validators.util';
import { buildContributorPayload } from './contributor-payload';
import { describeGitHubLookupError } from './github-lookup-error';

export interface ContributorFormDialogData {
  contributor?: ContributorRead;
}

/** Valor devolvido ao fechar: `true` quando o contribuinte foi salvo. */
export type ContributorFormDialogResult = boolean | undefined;

function githubUsernameValidator(): ValidatorFn {
  return (control): ValidationErrors | null => {
    if (!control.value) return null;
    return isValidGitHubUsername(control.value) ? null : { githubUsername: true };
  };
}

function linkedinValidator(): ValidatorFn {
  return (control): ValidationErrors | null =>
    isValidLinkedInUrl(control.value) ? null : { linkedin: true };
}

function portfolioValidator(): ValidatorFn {
  return (control): ValidationErrors | null =>
    isValidPortfolioUrl(control.value) ? null : { portfolio: true };
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
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './contributor-form-dialog.scss',
})
export class ContributorFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<ContributorFormDialog, ContributorFormDialogResult>>(MatDialogRef);
  private readonly contributorService = inject(ContributorService);
  private readonly notification = inject(NotificationService);
  readonly data = inject<ContributorFormDialogData>(MAT_DIALOG_DATA);

  readonly isEdit = !!this.data?.contributor;
  readonly searchingGithub = signal(false);
  readonly saving = signal(false);

  /**
   * `github_url` conhecido para um username (o já salvo, na edição). Só é usado
   * se o username do formulário for o mesmo no momento do envio.
   */
  private knownGithubUrl: { username: string; url: string } | null = this.data?.contributor?.github_url
    ? { username: this.data.contributor.github_username, url: this.data.contributor.github_url }
    : null;

  readonly form = this.fb.nonNullable.group({
    github_username: [
      this.data?.contributor?.github_username ?? '',
      [Validators.required, githubUsernameValidator()],
    ],
    nome: [this.data?.contributor?.nome ?? ''],
    avatar_url: [this.data?.contributor?.avatar_url ?? ''],
    linkedin_url: [this.data?.contributor?.linkedin_url ?? '', linkedinValidator()],
    portfolio_url: [this.data?.contributor?.portfolio_url ?? '', portfolioValidator()],
  });

  searchGitHub(): void {
    const username = this.form.controls.github_username.value.trim();
    if (!username || !isValidGitHubUsername(username)) {
      this.notification.showNotification('Informe um username válido do GitHub', 'error');
      return;
    }

    this.searchingGithub.set(true);
    this.contributorService.fetchGitHubUser(username).subscribe({
      next: (info) => {
        this.form.patchValue({
          nome: info.nome || this.form.controls.nome.value,
          avatar_url: info.avatar_url || this.form.controls.avatar_url.value,
        });
        // Vale só para este username: se ele mudar, o envio volta ao endereço padrão.
        if (info.github_url) this.knownGithubUrl = { username, url: info.github_url };
        this.searchingGithub.set(false);
      },
      error: (error: unknown) => {
        this.searchingGithub.set(false);
        this.notification.showNotification(describeGitHubLookupError(error), 'error');
      },
    });
  }

  onCancel(): void {
    if (this.saving()) return;
    this.dialogRef.close();
  }

  /**
   * Salva pelo próprio diálogo: ele só fecha em caso de sucesso. Em erro, os
   * dados continuam no formulário e o interceptor global mostra o motivo.
   */
  onSubmit(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();
    const contributor = this.data?.contributor;
    const request = contributor
      ? this.contributorService.updateContributor(contributor.id, payload)
      : this.contributorService.createContributor(payload);

    this.setSaving(true);
    request.subscribe({
      next: () => {
        this.setSaving(false);
        this.dialogRef.close(true);
      },
      error: () => this.setSaving(false),
    });
  }

  private setSaving(saving: boolean): void {
    this.saving.set(saving);
    // Impede fechar com Esc ou clique fora durante o envio.
    this.dialogRef.disableClose = saving;
  }

  private buildPayload(): ContributorCreate {
    const value = this.form.getRawValue();
    const username = value.github_username.trim();
    const githubUrl = this.knownGithubUrl?.username === username ? this.knownGithubUrl.url : null;
    return buildContributorPayload(value, githubUrl);
  }
}
