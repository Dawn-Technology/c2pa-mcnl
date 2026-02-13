import { describe, expect, it } from 'vitest';
import { extractBase64FromPem } from './pem-file-helpers';

describe('extractBase64FromPem', () => {
  const mockBase64 = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA';

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
