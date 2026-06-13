import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TagCreate, TagRead, TagUpdate } from '../../../../core/models/tag.model';

export interface TagFormDialogData {
  tag?: TagRead;
}

const DEFAULT_COLOR = '#2563eb';

@Component({
  selector: 'app-tag-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './tag-form-dialog.html',
  styleUrl: './tag-form-dialog.scss',
})
export class TagFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<TagFormDialog>);
  readonly data = inject<TagFormDialogData>(MAT_DIALOG_DATA);

  readonly isEdit = !!this.data?.tag;

  readonly form = this.fb.nonNullable.group({
    nome: [this.data?.tag?.nome ?? '', Validators.required],
    cor: [this.data?.tag?.cor ?? DEFAULT_COLOR, Validators.required],
  });

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const result: TagCreate | TagUpdate = this.form.getRawValue();
    this.dialogRef.close(result);
  }
}
