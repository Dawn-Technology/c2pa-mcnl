import '@angular/compiler';
import '@analogjs/vitest-angular/setup-snapshots';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';

// polyfill for x509
// See: https://github.com/PeculiarVentures/x509#%EF%B8%8F-reflect-polyfill-required
import 'reflect-metadata';

setupTestBed();
