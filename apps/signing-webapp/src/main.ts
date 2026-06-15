import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Use the polyfill core-js/full/reflect
import 'core-js/full/reflect';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
