import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommunityRead } from '../../../../core/models/community.model';

export interface CommunityFormDialogData {
  community?: CommunityRead;
}

@Component({
  selector: 'app-community-form-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  templateUrl: './community-form-dialog.html',
  styleUrl: './community-form-dialog.scss',
})
export class CommunityFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<CommunityFormDialog>);
  readonly data = inject<CommunityFormDialogData>(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
    nome: [this.data.community?.nome ?? '', [Validators.required, Validators.minLength(2)]],
  });

  get isEdit(): boolean {
    return !!this.data.community;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close(this.form.getRawValue());
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
