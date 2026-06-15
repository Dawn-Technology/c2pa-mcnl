import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// polyfill for x509
// See: https://github.com/PeculiarVentures/x509#%EF%B8%8F-reflect-polyfill-required
import '@abraham/reflection';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
