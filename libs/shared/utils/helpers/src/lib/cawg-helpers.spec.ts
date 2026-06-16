// polyfill for x509
// See: https://github.com/PeculiarVentures/x509#%EF%B8%8F-reflect-polyfill-required
import '@abraham/reflection';

import { describe, expect, it } from 'vitest';
import {
  getManifestValidationState,
  ManifestValidationState,
} from './cawg-helpers';
import {
  ValidationResult,
  ValidationStatusCode,
} from '@dawn-technology/c2pa-ts/manifest';

function makeValidationResult(
  isValid: boolean,
  statusCodes: ValidationStatusCode[] = [],
): ValidationResult {
  return {
    isValid,
    statusEntries: statusCodes.map((code) => ({ code })),
  } as ValidationResult;
}

describe('getManifestValidationState', () => {
  it('returns invalid when validationResult is null', () => {
    expect(getManifestValidationState(null)).toBe<ManifestValidationState>(
      'invalid',
    );
  });

  it('returns invalid when isValid is false and statusEntries is empty', () => {
    const result = makeValidationResult(false, []);
    expect(getManifestValidationState(result)).toBe<ManifestValidationState>(
      'invalid',
    );
  });

  it('returns valid when isValid is true and no untrusted codes are present', () => {
    const result = makeValidationResult(true, [
      ValidationStatusCode.WellFormed,
    ]);

    expect(getManifestValidationState(result)).toBe<ManifestValidationState>(
      'valid',
    );
  });

  it('returns untrusted when signing credential is untrusted', () => {
    const result = makeValidationResult(false, [
      ValidationStatusCode.SigningCredentialUntrusted,
    ]);

    expect(getManifestValidationState(result)).toBe<ManifestValidationState>(
      'untrusted',
    );
  });

  it('returns untrusted when timestamp is untrusted', () => {
    const result = makeValidationResult(false, [
      ValidationStatusCode.TimeStampUntrusted,
    ]);

    expect(getManifestValidationState(result)).toBe<ManifestValidationState>(
      'untrusted',
    );
  });

  it('returns invalid when isValid is false even if untrusted codes are present', () => {
    const result = makeValidationResult(false, [
      ValidationStatusCode.SigningCredentialUntrusted,
      ValidationStatusCode.AlgorithmUnsupported,
    ]);

    expect(getManifestValidationState(result)).toBe<ManifestValidationState>(
      'invalid',
    );
  });
});
