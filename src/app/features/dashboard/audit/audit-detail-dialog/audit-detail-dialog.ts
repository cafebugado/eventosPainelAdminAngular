import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { AuditLogRead } from '../../../../core/models/audit.model';

export interface AuditDetailDialogData {
  log: AuditLogRead;
}

@Component({
  selector: 'app-audit-detail-dialog',
  imports: [DatePipe, MatButtonModule, MatDialogModule],
  templateUrl: './audit-detail-dialog.html',
  styleUrl: './audit-detail-dialog.scss',
})
export class AuditDetailDialog {
  private readonly dialogRef = inject(MatDialogRef<AuditDetailDialog>);
  readonly data = inject<AuditDetailDialogData>(MAT_DIALOG_DATA);

  get changeEntries(): { field: string; before: unknown; after: unknown }[] {
    const changes = this.data.log.changes;
    if (!changes) return [];

    return Object.entries(changes).map(([field, value]) => {
      if (value && typeof value === 'object' && ('before' in value || 'after' in value)) {
        const change = value as { before?: unknown; after?: unknown };
        return { field, before: change.before, after: change.after };
      }
      return { field, before: undefined, after: value };
    });
  }

  formatValue(value: unknown): string {
    if (value === undefined || value === null) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  close(): void {
    this.dialogRef.close();
  }
}
