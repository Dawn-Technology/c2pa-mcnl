import { InjectionToken } from '@angular/core';

export const VERIFY_TRUSTED_ICA_ISSUERS = new InjectionToken<readonly string[]>(
  'VERIFY_TRUSTED_ICA_ISSUERS',
  {
    providedIn: 'root',
    factory: () => [
      'https://raw.githubusercontent.com/Dawn-Technology/c2pa-mcnl-trust-list/refs/heads/main/trust-list/ICA-ISSUERS-TRUST-LIST.txt',
    ],
  },
);
