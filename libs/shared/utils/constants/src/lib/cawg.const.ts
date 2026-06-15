import {
  VerificationMethod,
  VerifiedIdentityType,
} from '@dawn-technology/c2pa-ts/cawg';
import { ValidationStatusCode } from '@dawn-technology/c2pa-ts/manifest';

export type IdentityVerificationState = 'verified' | 'warning' | 'invalid';

export const readableIdentityRoleMap: Record<string, string> = {
  'cawg.creator': 'Maker',
  'cawg.contributor': 'Bijdrager',
  'cawg.editor': 'Editor',
  'cawg.producer': 'Producent',
  'cawg.publisher': 'Uitgever',
  'cawg.sponsor': 'Sponsor',
  'cawg.translator': 'Vertaler',
};

export const readableVerificationMethodMap: Record<string, string> = {
  'cawg.identity_claims_aggregation': 'Identity Claims Aggregation (ICA)',
  'cawg.x509.cose': 'X.509 certificaat (COSE)',
};

export const readableIdentityClaimTypeMap: Record<string, string> = {
  [VerifiedIdentityType.DocumentVerification]: 'Documentverificatie',
  [VerifiedIdentityType.Website]: 'Website',
  [VerifiedIdentityType.Affiliation]: 'Affiliatie',
  [VerifiedIdentityType.SocialMedia]: 'Social media',
  [VerifiedIdentityType.CryptoWallet]: 'Crypto wallet',
};

export const readableIdentityClaimMethodMap: Record<string, string> = {
  [VerificationMethod.DnsRecord]: 'DNS record',
  [VerificationMethod.UriFileVerification]: 'Bestandsverificatie op URL',
  [VerificationMethod.Email]: 'E-mailverificatie',
  [VerificationMethod.UriMetaTagVerification]: 'Meta-tag verificatie',
  [VerificationMethod.FederatedLogin]: 'Federated login',
};

export const readableReferencedAssertionMap: Record<string, string> = {
  'c2pa.hash.data': 'Bestandsbinding (data hash)',
  'c2pa.hash.bmff': 'Bestandsbinding (BMFF hash)',
  'c2pa.actions': 'Bewerkingsgeschiedenis',
  'c2pa.metadata': 'Metadata',
};

export const identityWarningCodes = new Set<ValidationStatusCode>([
  ValidationStatusCode.WellFormed,
  ValidationStatusCode.IcaUntrustedIssuer,
  ValidationStatusCode.IcaDidUnavailable,
  ValidationStatusCode.IcaDidUnsupportedMethod,
  ValidationStatusCode.IcaRevocationUnavailable,
  ValidationStatusCode.IcaRevocationUnsupported,
  ValidationStatusCode.IcaValidFromMissing,
  ValidationStatusCode.IcaValidFromInvalid,
  ValidationStatusCode.IcaValidUntilInvalid,
]);

export const identityInvalidCodes = new Set<ValidationStatusCode>([
  ValidationStatusCode.IdentityCborInvalid,
  ValidationStatusCode.IdentityAssertionMismatch,
  ValidationStatusCode.IdentityAssertionDuplicate,
  ValidationStatusCode.IdentityCredentialRevoked,
  ValidationStatusCode.IdentityHardBindingMissing,
  ValidationStatusCode.IdentityHardBindingIncorrect,
  ValidationStatusCode.IdentitySigTypeUnknown,
  ValidationStatusCode.IdentityPadInvalid,
  ValidationStatusCode.IdentityExpectedPartialClaimMismatch,
  ValidationStatusCode.IdentityExpectedClaimGeneratorMismatch,
  ValidationStatusCode.IdentityUnexpectedCountersigner,
  ValidationStatusCode.IdentityExpectedCountersignerMismatch,
  ValidationStatusCode.IdentityExpectedCountersignerMissing,
  ValidationStatusCode.IcaInvalidCoseSign1,
  ValidationStatusCode.IcaInvalidAlg,
  ValidationStatusCode.IcaInvalidContentType,
  ValidationStatusCode.IcaInvalidVerifiableCredential,
  ValidationStatusCode.IcaInvalidIssuer,
  ValidationStatusCode.IcaInvalidDidDocument,
  ValidationStatusCode.IcaSignatureMismatch,
  ValidationStatusCode.IcaTimeStampInvalid,
  ValidationStatusCode.IcaCredentialRevoked,
  ValidationStatusCode.IcaSignerPayloadMismatch,
  ValidationStatusCode.IcaVerifiedIdentitiesMissing,
  ValidationStatusCode.IcaVerifiedIdentitiesInvalid,
]);

export const identityTrustedCodes = new Set<ValidationStatusCode>([
  ValidationStatusCode.Trusted,
  ValidationStatusCode.IcaCredentialValid,
]);

export const identitySortOrder: Record<IdentityVerificationState, number> = {
  verified: 0,
  warning: 1,
  invalid: 2,
};
