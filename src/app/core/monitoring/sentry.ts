import * as Sentry from '@sentry/angular';
import { environment } from '../../../environments/environment';

export function initSentry(): void {
  if (!environment.sentryDsn) {
    return;
  }

  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.production ? 'production' : 'development',
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
  });
}
