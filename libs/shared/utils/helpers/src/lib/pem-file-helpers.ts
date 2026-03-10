import * as x509 from '@peculiar/x509';

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

/**
 * DER stands for Distinguished Encoding Rules.
 * It's a binary encoding format (a subset of ASN.1/BER) used to serialize cryptographic keys and certificates. PKCS#8 private keys are typically stored in DER format when in binary form.
 * The flow here is:
 * PEM file → base64 string (PEM is just base64-encoded DER wrapped in -----BEGIN...----- headers)
 * atob(base64) → binary string
 * Uint8Array.from(...) → raw DER bytes
 * @returns Uint8Array containing the DER-encoded key data extracted from the PEM file
 * @throws Error if the file content is not a valid PEM-encoded private key
 */
export async function extractDerFromFile(
  file: File,
): Promise<Uint8Array<ArrayBuffer>> {
  try {
    const base64 = extractBase64FromPem(await file.text());
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  } catch (err) {
    console.error(err);
    throw new Error(
      'Invalid key/cert file. Please provide a valid PEM-encoded private key in PKCS#8 format.',
    );
  }
}

/**
 * Creates an X.509 certificate object from a PEM-encoded certificate file.
 * The function reads the file content as text, which should be in PEM format (base64-encoded DER with appropriate headers).
 * It then constructs an X.509 certificate object using the @peculiar/x509 library.
 *
 * @returns An instance of x509.X509Certificate representing the parsed certificate.
 * @throws Error if the file content is not a valid PEM-encoded X.509 certificate.
 */
export async function createX509CertFromFile(
  file: File,
): Promise<x509.X509Certificate> {
  try {
    const pem = await file.text();
    return new x509.X509Certificate(pem);
  } catch (err) {
    console.error(err);
    throw new Error(
      'Invalid certificate file. Please provide a valid PEM-encoded X.509 certificate.',
    );
  }
}
