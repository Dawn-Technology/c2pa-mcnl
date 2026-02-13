export function extractBase64FromPem(pemText: string): string {
  const beginMatch = pemText.match(/-----BEGIN [^-]+-----/);
  const endMatch = pemText.match(/-----END [^-]+-----/);

  if (!beginMatch || !endMatch) {
    throw new Error('Invalid PEM format: missing BEGIN or END marker');
  }

  return pemText
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s/g, '');
}
