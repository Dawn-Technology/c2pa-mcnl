export const environment = {
  trustListUrls: [
    'https://raw.githubusercontent.com/Dawn-Technology/c2pa-mcnl-trust-list/refs/heads/main/trust-list/C2PA-TRUST-LIST.pem',
    'https://raw.githubusercontent.com/c2pa-org/conformance-public/refs/heads/main/trust-list/C2PA-TRUST-LIST.pem',
    'https://verify.contentauthenticity.org/trust/anchors.pem',
  ] as readonly string[],
  timestampTrustListUrls: [
    'https://raw.githubusercontent.com/Dawn-Technology/c2pa-mcnl-trust-list/refs/heads/main/trust-list/C2PA-TSA-TRUST-LIST.pem',
    'https://raw.githubusercontent.com/c2pa-org/conformance-public/refs/heads/main/trust-list/C2PA-TSA-TRUST-LIST.pem',
    'https://verify.contentauthenticity.org/trust/anchors.pem',
  ] as readonly string[],
  trustedIcaIssuers: [
    'https://raw.githubusercontent.com/Dawn-Technology/c2pa-mcnl-trust-list/refs/heads/main/trust-list/ICA-ISSUERS-TRUST-LIST.txt',
  ] as readonly string[],
};
