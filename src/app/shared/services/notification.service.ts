import { Injectable, inject } from '@angular/core';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';

export type NotificationType = 'success' | 'error' | 'info';

interface NotificationOptions {
  horizontalPosition?: MatSnackBarHorizontalPosition;
  verticalPosition?: MatSnackBarVerticalPosition;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  showNotification(message: string, type: NotificationType = 'info', options: NotificationOptions = {}): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 4000,
      panelClass: [`notification-${type}`],
      horizontalPosition: options.horizontalPosition ?? 'end',
      verticalPosition: options.verticalPosition ?? 'top',
    });
  }
}
