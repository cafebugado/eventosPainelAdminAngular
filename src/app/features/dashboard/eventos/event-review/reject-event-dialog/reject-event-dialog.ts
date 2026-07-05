import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-reject-event-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './reject-event-dialog.html',
  styleUrl: './reject-event-dialog.scss',
})
export class RejectEventDialog {
  private readonly dialogRef = inject(MatDialogRef<RejectEventDialog>);

  readonly motivo = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(10), Validators.maxLength(500)],
  });

  cancel(): void {
    this.dialogRef.close();
  }

  confirm(): void {
    if (this.motivo.invalid) {
      this.motivo.markAsTouched();
      return;
    }
    this.dialogRef.close(this.motivo.value.trim());
  }
}
