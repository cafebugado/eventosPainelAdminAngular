import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { initSentry } from './app/core/monitoring/sentry';

initSentry();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
