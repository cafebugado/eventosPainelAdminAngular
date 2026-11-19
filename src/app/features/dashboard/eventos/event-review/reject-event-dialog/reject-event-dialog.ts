import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EventService } from '../../../../../core/services/event.service';

export interface RejectEventDialogData {
  eventId: string;
}

/** Valor devolvido ao fechar: `true` quando a recusa foi registrada. */
export type RejectEventDialogResult = boolean | undefined;

@Component({
  selector: 'app-reject-event-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './reject-event-dialog.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './reject-event-dialog.scss',
})
export class RejectEventDialog {
  private readonly dialogRef = inject<MatDialogRef<RejectEventDialog, RejectEventDialogResult>>(MatDialogRef);
  private readonly eventService = inject(EventService);
  private readonly data = inject<RejectEventDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);

  readonly motivo = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(10), Validators.maxLength(500)],
  });

  cancel(): void {
    if (this.saving()) return;
    this.dialogRef.close();
  }

  /**
   * Envia a recusa pelo próprio diálogo: ele só fecha em caso de sucesso. Em erro,
   * o motivo digitado continua no campo e o interceptor global mostra a causa.
   */
  confirm(): void {
    if (this.saving()) return;
    if (this.motivo.invalid) {
      this.motivo.markAsTouched();
      return;
    }

    this.setSaving(true);
    this.eventService.rejectEvent(this.data.eventId, this.motivo.value.trim()).subscribe({
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
}
