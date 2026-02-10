import {
  AuthorityKeyIdentifierExtension,
  BasicConstraintsExtension,
  ExtendedKeyUsageExtension,
  KeyUsageFlags,
  KeyUsagesExtension,
  SubjectKeyIdentifierExtension,
  X509Certificate,
  X509CertificateGenerator,
} from '@peculiar/x509';

export interface CertificateSubject {
  country?: string;
  state?: string;
  organization?: string;
  organizationalUnit?: string;
  commonName: string;
}

export interface RootCertificateResult {
  certificate: X509Certificate;
  keys: CryptoKeyPair;
  certificatePem: string;
  privateKeyPem: string;
}

export interface IntermediateCertificateResult {
  certificate: X509Certificate;
  keys: CryptoKeyPair;
  certificatePem: string;
  privateKeyPem: string;
}

export interface LeafCertificateResult {
  certificate: X509Certificate;
  keys: CryptoKeyPair;
  certificatePem: string;
  privateKeyPem: string;
}

// ---- C2PA EKUs ----
// C2PA v2.2 claim signing EKU:
const C2PA_CLAIM_SIGNING_EKU = '1.3.6.1.4.1.62558.2.1';
// Back-compat EKUs seen/allowed by older validators:
const ID_KP_EMAIL_PROTECTION = '1.3.6.1.5.5.7.3.4';
const ID_KP_DOCUMENT_SIGNING = '1.3.6.1.5.5.7.3.36';

/**
 * Generate a self-signed root certificate
 */
export async function generateRootCertificate(
  subject: CertificateSubject,
  serialNumber = '01',
): Promise<RootCertificateResult> {
  const keys = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify'],
  );

  const subjectName = formatSubjectName(subject);

  const certificate = await X509CertificateGenerator.createSelfSigned(
    {
      serialNumber,
      name: subjectName,
      keys,
      signingAlgorithm: {
        name: 'ECDSA',
        hash: 'SHA-256',
      },
      extensions: [
        new BasicConstraintsExtension(true, 3, true),

        new KeyUsagesExtension(
          KeyUsageFlags.digitalSignature +
            KeyUsageFlags.keyCertSign +
            KeyUsageFlags.cRLSign,
          true,
        ),
        await SubjectKeyIdentifierExtension.create(keys.publicKey, false),
        await AuthorityKeyIdentifierExtension.create(keys.publicKey, false),
      ],
    },
    crypto,
  );

  const certificatePem = certificate.toString('pem');
  const privateKeyPem = await exportPrivateKeyPem(keys.privateKey);

  return {
    certificate,
    keys,
    certificatePem,
    privateKeyPem,
  };
}

/**
 * Generate an intermediate certificate signed by a root certificate
 */
export async function generateIntermediateCertificate(
  subject: CertificateSubject,
  rootCertificate: X509Certificate,
  rootPrivateKey: CryptoKey,
  serialNumber = '02',
): Promise<IntermediateCertificateResult> {
  const keys = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify'],
  );

  const subjectName = formatSubjectName(subject);

  const certificate = await X509CertificateGenerator.create(
    {
      serialNumber,
      subject: subjectName,
      issuer: rootCertificate.subject,
      signingKey: rootPrivateKey,
      publicKey: keys.publicKey,
      signingAlgorithm: {
        name: 'ECDSA',
        hash: 'SHA-256',
      },
      extensions: [
        new BasicConstraintsExtension(true, 2, true),
        // C2PA/compat EKUs (must be present and non-empty for leaf certs).
        new ExtendedKeyUsageExtension(
          [
            C2PA_CLAIM_SIGNING_EKU,
            ID_KP_EMAIL_PROTECTION,
            ID_KP_DOCUMENT_SIGNING,
          ],
          true,
        ),
        new KeyUsagesExtension(
          KeyUsageFlags.digitalSignature + KeyUsageFlags.keyCertSign,
          true,
        ),
        await SubjectKeyIdentifierExtension.create(keys.publicKey, false),
        await AuthorityKeyIdentifierExtension.create(
          rootCertificate.publicKey,
          false,
        ),
      ],
    },
    crypto,
  );

  const certificatePem = certificate.toString('pem');
  const privateKeyPem = await exportPrivateKeyPem(keys.privateKey);

  return {
    certificate,
    keys,
    certificatePem,
    privateKeyPem,
  };
}

/**
 * Generate a leaf certificate signed by an intermediate certificate
 */
export async function generateLeafCertificate(
  subject: CertificateSubject,
  intermediateCertificate: X509Certificate,
  intermediatePrivateKey: CryptoKey,
  serialNumber = '03',
): Promise<LeafCertificateResult> {
  const keys = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign'],
  );

  const subjectName = formatSubjectName(subject);

  const certificate = await X509CertificateGenerator.create(
    {
      serialNumber,
      subject: subjectName,
      issuer: intermediateCertificate.subject,
      signingKey: intermediatePrivateKey,
      publicKey: keys.publicKey,
      signingAlgorithm: {
        name: 'ECDSA',
        hash: 'SHA-256',
      },
      extensions: [
        new BasicConstraintsExtension(false, 0, true),
        // C2PA/compat EKUs (must be present and non-empty for leaf certs).
        new ExtendedKeyUsageExtension(
          [
            C2PA_CLAIM_SIGNING_EKU,
            ID_KP_EMAIL_PROTECTION,
            ID_KP_DOCUMENT_SIGNING,
          ],
          true,
        ),
        new KeyUsagesExtension(KeyUsageFlags.digitalSignature, true),
        await SubjectKeyIdentifierExtension.create(keys.publicKey, false),
        await AuthorityKeyIdentifierExtension.create(
          intermediateCertificate.publicKey,
          false,
        ),
      ],
    },
    crypto,
  );

  const certificatePem = certificate.toString('pem');
  const privateKeyPem = await exportPrivateKeyPem(keys.privateKey);

  return {
    certificate,
    keys,
    certificatePem,
    privateKeyPem,
  };
}

/**
 * Generate a complete certificate chain (root + intermediate + optional leaf)
 */
export async function generateCertificateChain(
  rootSubject: CertificateSubject,
  intermediateSubject: CertificateSubject,
  leafSubject?: CertificateSubject,
) {
  const root = await generateRootCertificate(rootSubject);
  const intermediate = await generateIntermediateCertificate(
    intermediateSubject,
    root.certificate,
    root.keys.privateKey,
  );

  let leaf: LeafCertificateResult | undefined;
  if (leafSubject) {
    leaf = await generateLeafCertificate(
      leafSubject,
      intermediate.certificate,
      intermediate.keys.privateKey,
    );
  }

  return {
    root,
    intermediate,
    leaf,
  };
}

/**
 * Format certificate subject as DN string
 */
function formatSubjectName(subject: CertificateSubject): string {
  const parts: string[] = [];

  if (subject.country) parts.push(`C=${subject.country}`);
  if (subject.state) parts.push(`ST=${subject.state}`);
  if (subject.organization) parts.push(`O=${subject.organization}`);
  if (subject.organizationalUnit)
    parts.push(`OU=${subject.organizationalUnit}`);
  parts.push(`CN=${subject.commonName}`);

  return parts.join(', ');
}

/**
 * Export private key to PEM format
 */
async function exportPrivateKeyPem(key: CryptoKey): Promise<string> {
  const der = await crypto.subtle.exportKey('pkcs8', key);
  const base64 = Buffer.from(der).toString('base64');

  // Format as PEM with proper line breaks
  const lines: string[] = [];
  lines.push('-----BEGIN PRIVATE KEY-----');
  for (let i = 0; i < base64.length; i += 64) {
    lines.push(base64.substring(i, i + 64));
  }
  lines.push('-----END PRIVATE KEY-----');

  return lines.join('\n');
}

/**
 * Import private key from PEM format
 */
export async function importPrivateKeyFromPem(pem: string): Promise<CryptoKey> {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const der = Buffer.from(base64, 'base64');

  return await crypto.subtle.importKey(
    'pkcs8',
    der,
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign'],
  );
}

/**
 * Import certificate from PEM format
 */
export async function importCertificateFromPem(
  pem: string,
): Promise<X509Certificate> {
  return new X509Certificate(pem);
}

// Legacy function for backwards compatibility
export async function generateTestCertificate(value = '') {
  const root = await generateRootCertificate({
    country: 'NL',
    state: 'Zuid-Holland',
    organization: `My Company${value}`,
    organizationalUnit: 'Development',
    commonName: `Root${value}`,
  });

  const intermediate = await generateIntermediateCertificate(
    {
      country: 'NL',
      state: 'Zuid-Holland',
      organization: `My Company${value}`,
      organizationalUnit: 'Development',
      commonName: `Intermediate${value}`,
    },
    root.certificate,
    root.keys.privateKey,
  );

  const leaf = await generateLeafCertificate(
    {
      country: 'NL',
      state: 'Zuid-Holland',
      organization: `My Company${value}`,
      organizationalUnit: 'Development',
      commonName: `Leaf${value}`,
    },
    intermediate.certificate,
    intermediate.keys.privateKey,
  );

  console.log(
    [
      root.certificatePem,
      intermediate.certificatePem,
      leaf.certificatePem,
    ].join('\n'),
  );

  console.log(leaf.privateKeyPem);

  return {
    leafCert: leaf.certificate,
    leafKeys: leaf.keys,
    intermediateCert: intermediate.certificate,
    intermediateKeys: intermediate.keys,
    rootCert: root.certificate,
    rootKeys: root.keys,
  };
}
