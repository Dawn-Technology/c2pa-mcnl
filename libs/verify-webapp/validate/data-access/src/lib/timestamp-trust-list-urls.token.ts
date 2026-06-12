import { InjectionToken } from '@angular/core';

export const VERIFY_TIMESTAMP_TRUST_LIST_URLS = new InjectionToken<
  readonly string[]
>('VERIFY_TIMESTAMP_TRUST_LIST_URLS', {
  providedIn: 'root',
  factory: () => [
    'https://raw.githubusercontent.com/Dawn-Technology/c2pa-mcnl-trust-list/refs/heads/main/trust-list/C2PA-TSA-TRUST-LIST.pem',
    'https://raw.githubusercontent.com/c2pa-org/conformance-public/refs/heads/main/trust-list/C2PA-TSA-TRUST-LIST.pem',
    'https://verify.contentauthenticity.org/trust/anchors.pem',
  ],
});
