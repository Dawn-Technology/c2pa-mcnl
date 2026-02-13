export function extractBase64FromPem(pemText: string): string {
  return pemText
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s/g, '');
}
