import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import * as Sentry from '@sentry/angular';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../../shared/services/notification.service';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notification = inject(NotificationService);
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401) {
        auth.signOut().subscribe();
        router.navigate(['/admin']);
        notification.showNotification('Sessão expirada. Faça login novamente.', 'error');
      } else {
        if (error.status >= 500) {
          Sentry.captureException(error, {
            extra: { url: req.url, method: req.method, status: error.status },
          });
        }
        const message = error?.error?.detail ?? error?.message ?? 'Erro inesperado';
        notification.showNotification(
          typeof message === 'string' ? message : 'Erro inesperado',
          'error',
        );
      }
      return throwError(() => error);
    }),
  );
};
