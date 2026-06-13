import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

export type NotificationType = 'success' | 'error' | 'info';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  showNotification(message: string, type: NotificationType = 'info'): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 4000,
      panelClass: [`notification-${type}`],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }
}
