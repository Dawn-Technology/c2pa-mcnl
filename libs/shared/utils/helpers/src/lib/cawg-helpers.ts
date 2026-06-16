import {
  IdentityAssertion,
  ValidationResult,
  ValidationStatusCode,
} from '@dawn-technology/c2pa-ts/manifest';
import { CBORBox } from '@dawn-technology/c2pa-ts/jumbf';
import {
  IdentityClaimsAggregationCredential,
  VerifiedIdentity,
} from '@dawn-technology/c2pa-ts/cawg';
import {
  identityInvalidCodes,
  identityTrustedCodes,
  IdentityVerificationState,
  identityWarningCodes,
  readableIdentityClaimMethodMap,
  readableIdentityClaimTypeMap,
  readableReferencedAssertionMap,
} from '@c2pa-mcnl/shared/utils/constants';

export type ActiveManifestIdentityCard = {
  id: string;
  assertionLabel: string;
  issuer: string;
  shortIssuer: string;
  verificationMethod: string;
  roles: string[];
  status: {
    state: IdentityVerificationState;
    label: string;
    detail: string;
  };
  linkedAssertions: Array<{
    url: string;
    label: string;
    hash: string;
  }>;
  linkedIdentityClaims: Array<{
    type: string;
    value: string;
    provider: string;
    method: string;
    verifiedAt: string;
    verified: boolean;
  }>;
};

export type ManifestValidationState = 'valid' | 'invalid' | 'untrusted';

const untrustedManifestStatusCodes = new Set<ValidationStatusCode>([
  ValidationStatusCode.SigningCredentialUntrusted,
  ValidationStatusCode.TimeStampUntrusted,
]);

export function getManifestValidationState(
  validationResult: ValidationResult | null | undefined,
): ManifestValidationState {
  if (!validationResult) {
    return 'invalid';
  } else if (!validationResult.isValid) {
    const hasUntrustedStatusCode = validationResult.statusEntries.every(
      (entry) => {
        const code = entry.code as ValidationStatusCode;
        if (untrustedManifestStatusCodes.has(code)) {
          return true;
        }
        return entry.success;
      },
    );

    if (validationResult.statusEntries.length >= 1 && hasUntrustedStatusCode) {
      return 'untrusted';
    }
    return 'invalid';
  }

  return 'valid';
}

export function shortIssuer(value: string): string {
  const issuer = value.trim();
  if (!issuer || issuer === '—') {
    return '—';
  }

  if (issuer.startsWith('did:jwk:') && issuer.length > 46) {
    return `${issuer.slice(0, 20)}...${issuer.slice(-16)}`;
  }

  if (issuer.length > 42) {
    return `${issuer.slice(0, 24)}...${issuer.slice(-12)}`;
  }

  return issuer;
}

export function toHexSnippet(bytes?: Uint8Array): string {
  if (!bytes || bytes.length === 0) {
    return '—';
  }

  const hex = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return hex.length > 20 ? `${hex.slice(0, 20)}...` : hex;
}

export function readableReferencedAssertion(url: string): string {
  const marker = 'c2pa.assertions/';
  const markerIndex = url.indexOf(marker);
  const assertionPath =
    markerIndex >= 0 ? url.slice(markerIndex + marker.length) : url;
  const assertionLabel = assertionPath.split('/')[0] ?? assertionPath;

  return readableReferencedAssertionMap[assertionLabel] ?? assertionLabel;
}

export function readableStatusDetail(code: ValidationStatusCode): string {
  switch (code) {
    case ValidationStatusCode.IcaCredentialRevoked:
    case ValidationStatusCode.IdentityCredentialRevoked:
      return 'De identiteit is ingetrokken door de issuer.';
    case ValidationStatusCode.IcaUntrustedIssuer:
      return 'De issuer staat niet in de vertrouwde lijst.';
    case ValidationStatusCode.IcaDidUnavailable:
      return 'De DID van de issuer kon niet worden opgehaald.';
    case ValidationStatusCode.IcaSignatureMismatch:
      return 'De identiteitshandtekening kon niet worden geverifieerd.';
    case ValidationStatusCode.IcaValidUntilInvalid:
      return 'De geldigheidsperiode van de identiteit is ongeldig of verlopen.';
    case ValidationStatusCode.IdentityHardBindingMissing:
    case ValidationStatusCode.IdentityHardBindingIncorrect:
      return 'De identiteit is niet correct gekoppeld aan dit bestand.';
    case ValidationStatusCode.IdentityAssertionMismatch:
      return 'Een gekoppelde assertion komt niet overeen met de claim.';
    case ValidationStatusCode.WellFormed:
      return 'De assertion is technisch geldig, maar niet als vertrouwd bevestigd.';
    default:
      return 'Controleer de verificatiedetails van deze identity assertion.';
  }
}

export function asCoseSign1Array(decoded: unknown): unknown[] | null {
  if (Array.isArray(decoded)) {
    return decoded;
  }

  if (decoded && typeof decoded === 'object' && 'value' in decoded) {
    const tagValue = (decoded as { value?: unknown }).value;
    return Array.isArray(tagValue) ? tagValue : null;
  }

  return null;
}

export function parseIcaCredentialFromSignature(
  signature: Uint8Array,
): IdentityClaimsAggregationCredential | null {
  try {
    // CBOR decode COSE_Sign1 structure: [protected, unprotected, payload, signature]
    const decoded = CBORBox.decoder.decode(signature);
    const coseArray = asCoseSign1Array(decoded);
    if (!coseArray || coseArray.length !== 4) {
      return null;
    }

    const payload = coseArray[2];
    if (!(payload instanceof Uint8Array)) {
      return null;
    }

    const credentialJson = new TextDecoder().decode(payload);
    return JSON.parse(credentialJson) as IdentityClaimsAggregationCredential;
  } catch {
    return null;
  }
}

export function getIdentityClaimValue(identity: VerifiedIdentity): string {
  return (
    identity.name ??
    identity.username ??
    identity.uri ??
    identity.address ??
    '—'
  );
}

export function readableIdentityClaimMethod(method?: string): string {
  if (!method) {
    return 'Onbekend';
  }

  return readableIdentityClaimMethodMap[method] ?? method;
}

export function linkedIdentityClaimsForAssertion(
  assertion: IdentityAssertion,
  statusState: IdentityVerificationState,
): ActiveManifestIdentityCard['linkedIdentityClaims'] {
  const credential = parseIcaCredentialFromSignature(assertion.signature);
  const identities = credential?.credentialSubject?.verifiedIdentities ?? [];

  return identities.map((identity) => ({
    type: readableIdentityClaimTypeMap[identity.type] ?? identity.type,
    value: getIdentityClaimValue(identity),
    provider: identity.provider?.name ?? 'Onbekende provider',
    method: readableIdentityClaimMethod(identity.method),
    verifiedAt: identity.verifiedAt ?? '—',
    verified: statusState === 'verified',
  }));
}

export function statusForIdentity(
  assertion: IdentityAssertion,
  validationResult: ValidationResult | null,
): ActiveManifestIdentityCard['status'] {
  const entries = validationResult?.statusEntries ?? [];
  const assertionUrl = assertion.sourceBox?.uri;
  const assertionLabel = assertion.fullLabel ?? assertion.label ?? '';

  const relatedCodes = entries
    .filter((entry) => {
      if (!entry.code.startsWith('cawg.')) {
        return false;
      }

      if (!entry.url) {
        return true;
      }

      return (
        entry.url === assertionUrl ||
        entry.url === assertion.label ||
        entry.url === assertionLabel ||
        entry.url.includes(assertionLabel)
      );
    })
    .map((entry) => entry.code as ValidationStatusCode);

  const firstInvalidCode = relatedCodes.find((code) =>
    identityInvalidCodes.has(code),
  );

  if (firstInvalidCode) {
    return {
      state: 'invalid',
      label: 'Verificatie mislukt',
      detail: readableStatusDetail(firstInvalidCode),
    };
  }

  if (relatedCodes.some((code) => identityTrustedCodes.has(code))) {
    return {
      state: 'verified',
      label: 'Geverifieerd',
      detail: 'Deze identiteit is cryptografisch geverifieerd.',
    };
  }

  const firstWarningCode = relatedCodes.find((code) =>
    identityWarningCodes.has(code),
  );
  return {
    state: 'warning',
    label: 'Niet geverifieerd',
    detail: firstWarningCode
      ? readableStatusDetail(firstWarningCode)
      : 'Geen vertrouwde identiteit gevonden voor deze assertion.',
  };
}

export function issuerForIdentity(assertion: IdentityAssertion): string {
  const fallback = 'Onbekende issuer';

  if (assertion.signerPayload.sig_type === 'cawg.x509.cose') {
    return 'X.509 issuer';
  }

  const credential = parseIcaCredentialFromSignature(assertion.signature);
  const credentialIssuer = credential?.issuer;
  if (typeof credentialIssuer === 'string' && credentialIssuer) {
    return credentialIssuer;
  }

  if (
    credentialIssuer &&
    typeof credentialIssuer === 'object' &&
    'id' in credentialIssuer &&
    typeof credentialIssuer.id === 'string'
  ) {
    return credentialIssuer.id;
  }

  try {
    const signaturePayload = assertion.signature
      ? new TextDecoder().decode(assertion.signature)
      : '';

    if (!signaturePayload) {
      return fallback;
    }

    const possibleDidMatch = signaturePayload.match(
      /did:[a-z0-9]+:[A-Za-z0-9._:-]+/i,
    );
    if (possibleDidMatch?.[0]) {
      return possibleDidMatch[0];
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function toDisplayValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const firstDisplayable = value.find(
      (item) => typeof item === 'string' || typeof item === 'number',
    );

    return firstDisplayable !== undefined ? String(firstDisplayable) : '—';
  }

  if (value && typeof value === 'object') {
    const objectValues = Object.values(value);
    const firstDisplayable = objectValues.find(
      (item) => typeof item === 'string' || typeof item === 'number',
    );

    return firstDisplayable !== undefined ? String(firstDisplayable) : '—';
  }

  return '—';
}
