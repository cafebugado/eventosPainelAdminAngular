import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommunityRead } from '../../../../core/models/community.model';
import { CommunityService } from '../../../../core/services/community.service';

export interface CommunityFormDialogData {
  community?: CommunityRead;
}

/** Valor devolvido ao fechar: `true` quando a comunidade foi salva. */
export type CommunityFormDialogResult = boolean | undefined;

@Component({
  selector: 'app-community-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './community-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './community-form-dialog.scss',
})
export class CommunityFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<CommunityFormDialog, CommunityFormDialogResult>>(MatDialogRef);
  private readonly communityService = inject(CommunityService);
  readonly data = inject<CommunityFormDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    nome: [this.data.community?.nome ?? '', [Validators.required, Validators.minLength(2)]],
  });

  get isEdit(): boolean {
    return !!this.data.community;
  }

  /**
   * Salva pelo próprio diálogo: ele só fecha em caso de sucesso. Em erro, o
   * formulário continua preenchido e o interceptor global mostra o motivo.
   */
  save(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    const community = this.data.community;
    const request = community
      ? this.communityService.updateCommunity(community.id, payload)
      : this.communityService.createCommunity(payload);

    this.setSaving(true);
    request.subscribe({
      next: () => {
        this.setSaving(false);
        this.dialogRef.close(true);
      },
      error: () => this.setSaving(false),
    });
  }

  cancel(): void {
    if (this.saving()) return;
    this.dialogRef.close();
  }

  private setSaving(saving: boolean): void {
    this.saving.set(saving);
    // Impede fechar com Esc ou clique fora durante o envio.
    this.dialogRef.disableClose = saving;
  }
}
