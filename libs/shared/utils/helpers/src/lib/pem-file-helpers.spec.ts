import { describe, expect, it, vi } from 'vitest';
import {
  createX509CertFromFile,
  extractBase64FromPem,
  extractDerFromFile,
} from './pem-file-helpers';

vi.mock('@peculiar/x509', () => ({
  X509Certificate: vi.fn(),
}));

const mockBase64 = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA';

const createMockFile = (content: string): File =>
  ({
    text: () => Promise.resolve(content),
  }) as unknown as File;

describe('extractBase64FromPem', () => {
  it('should extract base64 from PEM with CERTIFICATE label and \\n', () => {
    const pem = `-----BEGIN CERTIFICATE-----\n${mockBase64}\n-----END CERTIFICATE-----`;
    expect(extractBase64FromPem(pem)).toBe(mockBase64);
  });

  it('should extract base64 from PEM with CERTIFICATE label and \\r\\n', () => {
    const pem = `-----BEGIN CERTIFICATE-----\r\n${mockBase64}\r\n-----END CERTIFICATE-----`;
    expect(extractBase64FromPem(pem)).toBe(mockBase64);
  });

  it('should extract base64 from PEM with PRIVATE KEY label', () => {
    const pem = `-----BEGIN PRIVATE KEY-----\n${mockBase64}\n-----END PRIVATE KEY-----`;
    expect(extractBase64FromPem(pem)).toBe(mockBase64);
  });

  it('should extract base64 from PEM with PUBLIC KEY label', () => {
    const pem = `-----BEGIN PUBLIC KEY-----\n${mockBase64}\n-----END PUBLIC KEY-----`;
    expect(extractBase64FromPem(pem)).toBe(mockBase64);
  });

  it('should handle leading whitespace', () => {
    const pem = `  \n-----BEGIN CERTIFICATE-----\n${mockBase64}\n-----END CERTIFICATE-----`;
    expect(extractBase64FromPem(pem)).toBe(mockBase64);
  });

  it('should handle trailing whitespace', () => {
    const pem = `-----BEGIN CERTIFICATE-----\n${mockBase64}\n-----END CERTIFICATE-----\n  `;
    expect(extractBase64FromPem(pem)).toBe(mockBase64);
  });

  it('should handle multi-line base64 content', () => {
    const line1 = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A';
    const line2 = 'MIIBCgKCAQEAtest';
    const pem = `-----BEGIN CERTIFICATE-----\n${line1}\n${line2}\n-----END CERTIFICATE-----`;
    expect(extractBase64FromPem(pem)).toBe(line1 + line2);
  });

  it('should throw error for invalid PEM format', () => {
    expect(() => extractBase64FromPem('invalid pem')).toThrow();
  });

  it('should throw error for missing BEGIN marker', () => {
    const pem = `${mockBase64}\n-----END CERTIFICATE-----`;
    expect(() => extractBase64FromPem(pem)).toThrow();
  });

  it('should throw error for missing END marker', () => {
    const pem = `-----BEGIN CERTIFICATE-----\n${mockBase64}`;
    expect(() => extractBase64FromPem(pem)).toThrow();
  });
});

describe('extractDerFromFile', () => {
  it('should return a Uint8Array from a valid PEM file', async () => {
    const pem = `-----BEGIN PRIVATE KEY-----\n${mockBase64}\n-----END PRIVATE KEY-----`;
    const file = createMockFile(pem);

    const result = await extractDerFromFile(file);

    expect(result).toBeInstanceOf(Uint8Array);
    const expectedBytes = Uint8Array.from(atob(mockBase64), (c) =>
      c.charCodeAt(0),
    );
    expect(result).toEqual(expectedBytes);
  });

  it('should throw an error for an invalid PEM file', async () => {
    const file = createMockFile('not a valid pem');

    await expect(extractDerFromFile(file)).rejects.toThrow(
      'Invalid key/cert file. Please provide a valid PEM-encoded private key in PKCS#8 format.',
    );
  });

  it('should throw an error when the file has no BEGIN marker', async () => {
    const file = createMockFile(`${mockBase64}\n-----END PRIVATE KEY-----`);

    await expect(extractDerFromFile(file)).rejects.toThrow(
      'Invalid key/cert file. Please provide a valid PEM-encoded private key in PKCS#8 format.',
    );
  });
});

describe('createX509CertFromFile', () => {
  it('should return an X509Certificate for a valid PEM file', async () => {
    const pem = `-----BEGIN CERTIFICATE-----\n${mockBase64}\n-----END CERTIFICATE-----`;
    const file = createMockFile(pem);
    const mockCert = { subject: 'CN=Test' };

    const { X509Certificate } = await import('@peculiar/x509');
    vi.mocked(X509Certificate).mockImplementation(function () {
      return mockCert as unknown as InstanceType<typeof X509Certificate>;
    });

    const result = await createX509CertFromFile(file);

    expect(result).toEqual(mockCert);
  });

  it('should throw an error when x509 parsing fails', async () => {
    const { X509Certificate } = await import('@peculiar/x509');
    vi.mocked(X509Certificate).mockImplementation(function () {
      throw new Error('Parse error');
    });

    const file = createMockFile('invalid cert content');

    await expect(createX509CertFromFile(file)).rejects.toThrow(
      'Invalid certificate file. Please provide a valid PEM-encoded X.509 certificate.',
    );
  });
});
