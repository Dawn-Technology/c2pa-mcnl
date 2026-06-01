import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { computed, inject, LOCALE_ID } from '@angular/core';
import {
  ActionAssertion,
  IdentityAssertion,
  Manifest,
  ManifestStore,
  MetadataAssertion,
  MetadataNamespace,
  ThumbnailAssertion,
  ThumbnailType,
  ValidationError,
  ValidationResult,
  ValidationStatusCode,
} from '@dockbite/c2pa-ts/manifest';
import {
  CawgValidationOptions,
  IdentityClaimsAggregationCredential,
  VerificationMethod,
  VerifiedIdentity,
  VerifiedIdentityType,
} from '@dockbite/c2pa-ts/cawg';
import { CBORBox, SuperBox } from '@dockbite/c2pa-ts/jumbf';
import { Asset, createAsset } from '@dockbite/c2pa-ts/asset';
import { formatDate } from '@angular/common';
import { isImageMimeType } from '@c2pa-mcnl/shared/utils/helpers';

export type IdentityVerificationState = 'verified' | 'warning' | 'invalid';

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

export type VerifiedManifestStore =
  | (ManifestStore & {
      manifests: VerifiedManifest[];
    });
  
export type VerifiedManifest = Manifest & { validationResult?: ValidationResult }

type VerifyStoreState = {
  isLoading: boolean;

  file: File | null;
  fileDataUrl: string | null;

  asset: Asset | null;
  manifestStore: VerifiedManifestStore | null
  manifestStoreReadValidationError?: ValidationError;
  manifestThumbnailUrls: Map<string, string> | null; // label → blob URL
  manifestValidationResults: Map<string, ValidationResult> | null;
  activeManifest: VerifiedManifest | null;

  error?: unknown;
};

const readableIdentityRoleMap: Record<string, string> = {
  'cawg.creator': 'Maker',
  'cawg.contributor': 'Bijdrager',
  'cawg.editor': 'Editor',
  'cawg.producer': 'Producent',
  'cawg.publisher': 'Uitgever',
  'cawg.sponsor': 'Sponsor',
  'cawg.translator': 'Vertaler',
};

const readableVerificationMethodMap: Record<string, string> = {
  'cawg.identity_claims_aggregation': 'Identity Claims Aggregation (ICA)',
  'cawg.x509.cose': 'X.509 certificaat (COSE)',
};

const readableIdentityClaimTypeMap: Record<string, string> = {
  [VerifiedIdentityType.DocumentVerification]: 'Documentverificatie',
  [VerifiedIdentityType.Website]: 'Website',
  [VerifiedIdentityType.Affiliation]: 'Affiliatie',
  [VerifiedIdentityType.SocialMedia]: 'Social media',
  [VerifiedIdentityType.CryptoWallet]: 'Crypto wallet',
};

const readableIdentityClaimMethodMap: Record<string, string> = {
  [VerificationMethod.DnsRecord]: 'DNS record',
  [VerificationMethod.UriFileVerification]: 'Bestandsverificatie op URL',
  [VerificationMethod.Email]: 'E-mailverificatie',
  [VerificationMethod.UriMetaTagVerification]: 'Meta-tag verificatie',
  [VerificationMethod.FederatedLogin]: 'Federated login',
};

const readableReferencedAssertionMap: Record<string, string> = {
  'c2pa.hash.data': 'Bestandsbinding (data hash)',
  'c2pa.hash.bmff': 'Bestandsbinding (BMFF hash)',
  'c2pa.actions': 'Bewerkingsgeschiedenis',
  'c2pa.metadata': 'Metadata',
};

const identityWarningCodes = new Set<ValidationStatusCode>([
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

const identityInvalidCodes = new Set<ValidationStatusCode>([
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

const identityTrustedCodes = new Set<ValidationStatusCode>([
  ValidationStatusCode.Trusted,
  ValidationStatusCode.IcaCredentialValid,
]);

const identitySortOrder: Record<IdentityVerificationState, number> = {
  verified: 0,
  warning: 1,
  invalid: 2,
};

function shortIssuer(value: string): string {
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

function toHexSnippet(bytes?: Uint8Array): string {
  if (!bytes || bytes.length === 0) {
    return '—';
  }

  const hex = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return hex.length > 20 ? `${hex.slice(0, 20)}...` : hex;
}

function readableReferencedAssertion(url: string): string {
  const marker = 'c2pa.assertions/';
  const markerIndex = url.indexOf(marker);
  const assertionPath =
    markerIndex >= 0 ? url.slice(markerIndex + marker.length) : url;
  const assertionLabel = assertionPath.split('/')[0] ?? assertionPath;

  return readableReferencedAssertionMap[assertionLabel] ?? assertionLabel;
}

function readableStatusDetail(code: ValidationStatusCode): string {
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

function asCoseSign1Array(decoded: unknown): unknown[] | null {
  if (Array.isArray(decoded)) {
    return decoded;
  }

  if (decoded && typeof decoded === 'object' && 'value' in decoded) {
    const tagValue = (decoded as { value?: unknown }).value;
    return Array.isArray(tagValue) ? tagValue : null;
  }

  return null;
}

function parseIcaCredentialFromSignature(
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

function getIdentityClaimValue(identity: VerifiedIdentity): string {
  return (
    identity.name ??
    identity.username ??
    identity.uri ??
    identity.address ??
    '—'
  );
}

function readableIdentityClaimMethod(method?: string): string {
  if (!method) {
    return 'Onbekend';
  }

  return readableIdentityClaimMethodMap[method] ?? method;
}

function linkedIdentityClaimsForAssertion(
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

function statusForIdentity(
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

function issuerForIdentity(assertion: IdentityAssertion): string {
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

function toDisplayValue(value: unknown): string {
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

const initialState: VerifyStoreState = {
  isLoading: false,
  file: null,
  fileDataUrl: null,
  asset: null,
  manifestStore: null,
  manifestThumbnailUrls: null,
  manifestValidationResults: null,
  activeManifest: null,
};

export const VerifyStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(
    (
      { file, manifestStore, activeManifest, manifestValidationResults },
      localeId = inject(LOCALE_ID),
    ) => ({
      hasFile: computed(() => !!file()),
      hasManifests: computed(() => manifestStore()?.manifests.length),
      fileDate: computed(() => {
        const lastModified = file()?.lastModified;
        if (!lastModified) {
          return '—';
        }

        return formatDate(lastModified, 'dd MMMM yyyy', localeId);
      }),
      manifestsReversed: computed(() =>
        [...(manifestStore()?.manifests ?? [])].reverse(),
      ),
      activeManifestValidationResult: computed(() => {
        const label = activeManifest()?.label;
        if (!label) {
          return null;
        }

        return manifestValidationResults()?.get(label) ?? null;
      }),

      getActionAssertions: computed(
        () => activeManifest()?.assertions?.getActionAssertions() ?? [],
      ),
      activeManifestIdentityCards: computed<ActiveManifestIdentityCard[]>(
        () => {
          const identities =
            activeManifest()?.assertions?.getIdentityAssertions() ?? [];

          const activeManifestLabel = activeManifest()?.label;
          const validationResult = activeManifestLabel
            ? (manifestValidationResults()?.get(activeManifestLabel) ?? null)
            : null;

          const cards = identities.map((assertion, index) => {
            const issuer = issuerForIdentity(assertion);

            return {
              id: `${assertion.fullLabel ?? assertion.label ?? 'identity'}-${index}`,
              assertionLabel:
                assertion.fullLabel ?? assertion.label ?? 'cawg.identity',
              issuer,
              shortIssuer: shortIssuer(issuer),
              verificationMethod:
                readableVerificationMethodMap[
                  assertion.signerPayload.sig_type
                ] ?? assertion.signerPayload.sig_type,
              roles: (assertion.signerPayload.role ?? []).map(
                (role) => readableIdentityRoleMap[String(role)] ?? String(role),
              ),
              status: statusForIdentity(assertion, validationResult),
              linkedAssertions:
                assertion.signerPayload.referenced_assertions.map(
                  (reference) => ({
                    url: reference.url,
                    label: readableReferencedAssertion(reference.url),
                    hash: toHexSnippet(reference.hash),
                  }),
                ),
              linkedIdentityClaims:
                [] as ActiveManifestIdentityCard['linkedIdentityClaims'],
            };
          });

          for (const card of cards) {
            const assertion = identities.find(
              (identityAssertion, index) =>
                `${identityAssertion.fullLabel ?? identityAssertion.label ?? 'identity'}-${index}` ===
                card.id,
            );

            if (!assertion) {
              continue;
            }

            card.linkedIdentityClaims = linkedIdentityClaimsForAssertion(
              assertion,
              card.status.state,
            );
          }

          return cards.sort(
            (a, b) =>
              identitySortOrder[a.status.state] -
              identitySortOrder[b.status.state],
          );
        },
      ),
      activeManifestIssuer: computed(() => {
        const claim = activeManifest()?.claim;
        if (!claim?.claimGeneratorName) {
          return '—';
        }

        return claim.claimGeneratorVersion
          ? `${claim.claimGeneratorName} ${claim.claimGeneratorVersion}`
          : claim.claimGeneratorName;
      }),
      activeManifestIssuedOn: computed(() => {
        const timestamp = activeManifest()?.signature?.signatureData?.timestamp;

        if (!timestamp) {
          return '—';
        }

        return formatDate(timestamp, 'dd MMMM yyyy HH:mm', localeId);
      }),
      activeManifestSoftwareAgent: computed(() => {
        const assertions =
          activeManifest()?.assertions?.getActionAssertions() as
            | ActionAssertion[]
            | undefined;

        for (const assertion of assertions ?? []) {
          for (const action of assertion.actions) {
            if (!action.softwareAgent?.name) {
              continue;
            }

            const { name, version } = action.softwareAgent;
            return version ? `${name} ${version}` : name;
          }
        }

        const claim = activeManifest()?.claim;
        if (!claim?.claimGeneratorName) {
          return '—';
        }

        return claim.claimGeneratorVersion
          ? `${claim.claimGeneratorName} ${claim.claimGeneratorVersion}`
          : claim.claimGeneratorName;
      }),
      activeManifestCameraInfo: computed(() => {
        const assertions = activeManifest()?.assertions?.assertions ?? [];

        const metadataAssertions = assertions.filter(
          (assertion): assertion is MetadataAssertion =>
            assertion instanceof MetadataAssertion,
        );

        const cameraNamespaces = new Set<string>([
          MetadataNamespace.Exif,
          MetadataNamespace.ExifEx_1_0,
          MetadataNamespace.ExifEx_2_32,
        ]);

        const preferredEntryNames = ['Model', 'LensModel', 'Make'];

        for (const metadataAssertion of metadataAssertions) {
          for (const entryName of preferredEntryNames) {
            const entry = metadataAssertion.entries.find(
              (metadataEntry) =>
                cameraNamespaces.has(String(metadataEntry.namespace)) &&
                metadataEntry.name === entryName,
            );

            if (entry) {
              return toDisplayValue(entry.value);
            }
          }
        }

        return '—';
      }),
    }),
  ),
  withMethods((store) => ({
    async setFile(file: File | null) {
      patchState(store, () => ({
        isLoading: true,
      }));

      this._revokeCurrentFileDataUrl();
      this._revokeCurrentManifestThumbnailUrls();

      if (!file) {
        console.debug('No file selected, resetting state');
        return this._resetState();
      }

      const fileDataUrl = this._createFileDataUrl(file);

      patchState(store, () => ({
        fileDataUrl,
        file,
        manifestThumbnailUrls: null,
      }));

      try {
        const asset = await createAsset(file);
        const jumbfBytes = await asset.getManifestJUMBF();

        /* no manifest found */
        if (!jumbfBytes) {
          return patchState(store, {
            isLoading: false,
            manifestStore: null,
            activeManifest: null,
          });
        }

        let manifestStore: ManifestStore;
        let manifestValidationResults: VerifyStoreState['manifestValidationResults'];
        try {
          manifestStore = ManifestStore.read(SuperBox.fromBuffer(jumbfBytes));

          manifestValidationResults = await this._validateManifests(
            manifestStore,
            asset,
          );
        } catch (error) {
          if (error instanceof ValidationError) {
            console.error('Manifest validation error:', error);
            return patchState(store, () => ({
              isLoading: false,
              manifestStoreReadValidationError: error,
            }));
          } else {
            console.error('Manifest validation unknown error.', String(error));
            return patchState(store, () => ({
              isLoading: false,
              error,
            }));
          }
        }

        const manifestThumbnailUrls = this._createManifestThumbnailUrls(
          manifestStore.manifests,
        );

        const activeManifest = manifestStore.getActiveManifest();

        console.debug('active manifest:', activeManifest);
        console.debug(
          'manifests validation results:',
          manifestValidationResults,
        );
        patchState(store, () => ({
          isLoading: false,
          asset,
          manifestStore,
          manifestThumbnailUrls,
          manifestValidationResults,
          activeManifest,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('An unexpected error occurred.', message);
        patchState(store, () => ({
          error,
        }));
      }
    },

    async setActiveManifest(label?: string) {
      const asset = store.asset();
      const manifestStore = store.manifestStore();

      if (!asset || !manifestStore || !label) {
        return;
      }

      patchState(store, () => ({
        isLoading: true,
      }));

      const activeManifest = manifestStore.getManifestByLabel(label);

      patchState(store, () => ({
        isLoading: false,
        activeManifest,
      }));
    },

    getManifestsThumbnailDataUrl(label?: string) {
      return label
        ? (store?.manifestThumbnailUrls()?.get(label) ?? null)
        : null;
    },

    isActiveManifest(label?: string) {
      return store.activeManifest()?.label === label;
    },

    _createFileDataUrl(file: File) {
      if (!isImageMimeType(file)) {
        return null;
      }

      return URL.createObjectURL(file);
    },

    _revokeCurrentFileDataUrl() {
      const fileDataUrl = store.fileDataUrl();
      if (fileDataUrl) {
        URL.revokeObjectURL(fileDataUrl);
      }
    },

    _getTrustList() {
      return `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA62I1JYGkqQcvvySENhXY
dNiRVSZO7l2CfbQaJSM6NaEDJYrm5kv6K4daYdQ6rTGoLf1H6HJoyRwgBR/9dwlE
rjQmHWzaQnj6QKTv5EHWfXF5l4mOsqEnvMIOEfp4VWo706bemFylnIq3TXIOSF8g
/3kbMIgu4+bmUspgjc/QWakLzOXly16+AbVNclxfxs1Tp+weabDSsGtVdQ5H43Uw
4U7+H76bEiGEtbrTVeuBi7qUNAMgM5z8jHDMSnz5IDMve/o1K0ERgirZ35qVSARQ
A4zwTNmy6eCzR2i8w8Zx/DsI6wbjGt2YscTFFq7gTWDUA1+HZCxh2to0y1L/Bykj
U8boGSpRDjOUyg78IjadnmieKdu4v3H9Qm35rpW8cDR7htMhwklWrf+3r2alm017
paoN8ZT4otnkclIE1Jb0rJbFIBQW4MUAy0plFmZMGicodKNiVi1P79Y3uf8uAUnY
RjE94VwYY+tWpFPDfyDRADxzIV7Ad9AFlSJIp28xEHXOYiP72eZiyHyBqcnO49pS
CwY1Uqg4lker5hrd7AGPCyVH3WRC0Qarjc9EK/HhV/6qJd4wLMr4vUaDS/6O3zSC
vP7LwKHn8STGK1of96L8dEkbK8Nm7u+tXp9tYt9bKwGgVK0daKtByhxgMawWb2GH
tvAz5bSq80H+FtFDTF+swj0CAwEAAQ==
-----END PUBLIC KEY-----

-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAED2i+kZAJGJClOPiK8gUmMSTN4e+7
BYjK272yPHxu8NgW5faLTRv3HIdwwMOaxgD1ezVpMpd0Brlf8LdDKwDw6A==
-----END PUBLIC KEY-----

-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAMp5+0e83nNgQhdhBW8Rshkjy90sa1A9JIzkItcDqCuI=
-----END PUBLIC KEY-----

-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE3Gu2j8b6K4pwTZgjILQO+At8TFvs
ojXaCJt/SsdguqLSkDXOsLdRM8LvT0YGEMcaSEXM+7vLsXOj4jOxazR/hA==
-----END PUBLIC KEY-----

-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEXEfQ50yTq8YluTWHPT1ceYpOlXRY
WsNLGo6EFtATq2D8GKyCm3GljmUcGE1bdGsZAhl28TK5pLPD9RcOKpY+Pw==
-----END PUBLIC KEY-----

-----BEGIN PUBLIC KEY-----
MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAEQpS36d6JWBZ+nlyqOGTBRfAo6RT6ZJZT
qxrZgSX38N8v/QmU85H2e2xSayDrv0u1U9hwS2qqqAg6Mn2t53G4Cj3RUszTXFZP
6eSpRR20ekFU9E4NLdmsGkQI1q+V2a9D
-----END PUBLIC KEY-----

-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAoYzyrOI5FNRYsHPmWV82
UM2sMr1jrqE3H9Q5+tFQtapUk5e/yiLC63EifnR1SvM/vX/6Ze/ZLSucBx4tMLsm
scOX17PMypBOSaq8FN0GBU7Icvo/8nPzXwt8LrxVAH4RDiSgNMQa4Fg/l4pSh/qu
QuIJ0BcIvMy2pd4gecV59kQ4l0Kz1PQg1UqhVVfXfR6XETKLPLs+vbJxBverkQVh
wH322kr77tOhC67pFCOguogNZe2eb+8Kas2gQJQGmuhuKQoTWqBDwmnLutmQk8PV
cA51Kqve1P3k4pyOnKHHxKNtn6eDBYkKdLwMa+OpVlU1B41+3w0GWivhDyxQklMg
csQyHrDsDm65K4y+nEVH6JxxdxvpoSBT//WKNIc2qwtPTqPAaKRXnrLyprtrzQao
Ral3yEmxt1RVCeN2FrsmOCBrGrukIchMJCsEMgYSyK9AxXa54lLIyaugL78rKdeU
NdeZW6Tj3Drx9H0bzAeRjBlm+sixooVT2wSZ7UIO3rX2H2E7cF70Ig0FFeDtNwCJ
10eqscQyHohgBiybmSesg0la7QrKRsZcjqHZ5OujaxkUC0VWMyJk7RHHVphjdvBv
CwxmQRx5oHsrxjJh8QUP47OXm7cgRFfHs55OUXgUC8J7estf6hKRGDgaYwz2tTT5
DZFxng2pBDjhrzXOYVXPrQ0CAwEAAQ==
-----END PUBLIC KEY-----

Subject C=US, ST=CA, L=Somewhere, O=C2PA Test Root CA, OU=FOR TESTING_ONLY, CN=Root CA
-----BEGIN CERTIFICATE-----
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
-----END CERTIFICATE-----

Subject C=US, ST=CA, L=Somewhere, O=C2PA Test Signing Cert, OU=FOR TESTING_ONLY, CN=C2PA Signer
-----BEGIN CERTIFICATE-----
MIIChzCCAi6gAwIBAgIUcCTmJHYF8dZfG0d1UdT6/LXtkeYwCgYIKoZIzj0EAwIw
gYwxCzAJBgNVBAYTAlVTMQswCQYDVQQIDAJDQTESMBAGA1UEBwwJU29tZXdoZXJl
MScwJQYDVQQKDB5DMlBBIFRlc3QgSW50ZXJtZWRpYXRlIFJvb3QgQ0ExGTAXBgNV
BAsMEEZPUiBURVNUSU5HX09OTFkxGDAWBgNVBAMMD0ludGVybWVkaWF0ZSBDQTAe
Fw0yMjA2MTAxODQ2NDBaFw0zMDA4MjYxODQ2NDBaMIGAMQswCQYDVQQGEwJVUzEL
MAkGA1UECAwCQ0ExEjAQBgNVBAcMCVNvbWV3aGVyZTEfMB0GA1UECgwWQzJQQSBU
ZXN0IFNpZ25pbmcgQ2VydDEZMBcGA1UECwwQRk9SIFRFU1RJTkdfT05MWTEUMBIG
A1UEAwwLQzJQQSBTaWduZXIwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAQPaL6R
kAkYkKU4+IryBSYxJM3h77sFiMrbvbI8fG7w2Bbl9otNG/cch3DAw5rGAPV7NWky
l3QGuV/wt0MrAPDoo3gwdjAMBgNVHRMBAf8EAjAAMBYGA1UdJQEB/wQMMAoGCCsG
AQUFBwMEMA4GA1UdDwEB/wQEAwIGwDAdBgNVHQ4EFgQUFznP0y83joiNOCedQkxT
tAMyNcowHwYDVR0jBBgwFoAUDnyNcma/osnlAJTvtW6A4rYOL2swCgYIKoZIzj0E
AwIDRwAwRAIgOY/2szXjslg/MyJFZ2y7OH8giPYTsvS7UPRP9GI9NgICIDQPMKrE
LQUJEtipZ0TqvI/4mieoyRCeIiQtyuS0LACz
-----END CERTIFICATE-----

Subject C=US, ST=CA, L=Somewhere, O=C2PA Test Signing Cert, OU=FOR TESTING_ONLY, CN=C2PA Signer
-----BEGIN CERTIFICATE-----
MIICSDCCAfqgAwIBAgIUb+aBTX1CsjJ1iuMJ9kRudz/7qEcwBQYDK2VwMIGMMQsw
CQYDVQQGEwJVUzELMAkGA1UECAwCQ0ExEjAQBgNVBAcMCVNvbWV3aGVyZTEnMCUG
A1UECgweQzJQQSBUZXN0IEludGVybWVkaWF0ZSBSb290IENBMRkwFwYDVQQLDBBG
T1IgVEVTVElOR19PTkxZMRgwFgYDVQQDDA9JbnRlcm1lZGlhdGUgQ0EwHhcNMjIw
NjEwMTg0NjQxWhcNMzAwODI2MTg0NjQxWjCBgDELMAkGA1UEBhMCVVMxCzAJBgNV
BAgMAkNBMRIwEAYDVQQHDAlTb21ld2hlcmUxHzAdBgNVBAoMFkMyUEEgVGVzdCBT
aWduaW5nIENlcnQxGTAXBgNVBAsMEEZPUiBURVNUSU5HX09OTFkxFDASBgNVBAMM
C0MyUEEgU2lnbmVyMCowBQYDK2VwAyEAMp5+0e83nNgQhdhBW8Rshkjy90sa1A9J
IzkItcDqCuKjeDB2MAwGA1UdEwEB/wQCMAAwFgYDVR0lAQH/BAwwCgYIKwYBBQUH
AwQwDgYDVR0PAQH/BAQDAgbAMB0GA1UdDgQWBBTuLrYRqW4wu6yjIK1/iW8ud7dm
kTAfBgNVHSMEGDAWgBRXTAfC/JxQvRlk/bCbdPMDbsSfqTAFBgMrZXADQQB2R6vb
I+X8CTRC54j3NTvsUj454G1/bdzbiHVgl3n+ShOAJ85FJigE7Eoav7SeXeVnNjc8
QZ1UrJGwgBBEP84G
-----END CERTIFICATE-----

Subject	C=US, O=Truepic, OU=Vision, CN=Truepic Lens SDK v1.1.3 in Vision Camera v3.1.5
-----BEGIN CERTIFICATE-----
MIIDQTCCAimgAwIBAgIUb+w58RlzuEmpGkmsoktfi3+IeD0wDQYJKoZIhvcNAQEM
BQAwTjEeMBwGA1UEAwwVQW5kcm9pZENsYWltU2lnbmluZ0NBMQ0wCwYDVQQLDARM
ZW5zMRAwDgYDVQQKDAdUcnVlcGljMQswCQYDVQQGEwJVUzAeFw0yMzAyMTIxNzQ0
NTdaFw0yMzAyMTMxNzQ0NTZaMGoxCzAJBgNVBAYTAlVTMRAwDgYDVQQKDAdUcnVl
cGljMQ8wDQYDVQQLDAZWaXNpb24xODA2BgNVBAMML1RydWVwaWMgTGVucyBTREsg
djEuMS4zIGluIFZpc2lvbiBDYW1lcmEgdjMuMS41MFkwEwYHKoZIzj0CAQYIKoZI
zj0DAQcDQgAE3Gu2j8b6K4pwTZgjILQO+At8TFvsojXaCJt/SsdguqLSkDXOsLdR
M8LvT0YGEMcaSEXM+7vLsXOj4jOxazR/hKOBxTCBwjAMBgNVHRMBAf8EAjAAMB8G
A1UdIwQYMBaAFNTQ3GEYq9CvbacngtZ+DQECAypsME0GCCsGAQUFBwEBBEEwPzA9
BggrBgEFBQcwAYYxaHR0cDovL3ZhLnRydWVwaWMuY29tL2VqYmNhL3B1YmxpY3dl
Yi9zdGF0dXMvb2NzcDATBgNVHSUEDDAKBggrBgEFBQcDBDAdBgNVHQ4EFgQUE8X1
E0n82XhEImuosqlFFp3iBAkwDgYDVR0PAQH/BAQDAgeAMA0GCSqGSIb3DQEBDAUA
A4IBAQC7cGGGVG1QC/FrrjsWZcY+KgLJgrg7V372mt0ZYdDkR9aFyAAUSG+xc922
ZVuVK1GRg/g98OzOTdH91mfmPV4xFnA77bgp7HYhBjvH/iyZFHXSW7Ivzd10Fnvp
imIUEKRZDUVW+RgYKfNK0Ubrodi5iPFdcl0PpSADbbalngi+XUF9FQybRf+MobKi
J2wfvOJozN9I9RPCbqAjY5idNqHmZZiBlZqUsQ4blSxCWUeDjQe/wiaElbziFhYi
ev9TQP8kxj8VElaXgC8+pxkBmSbvSGeMH2IvEbLiACIGr7Bs2kidpHLfaD1w6Tnz
hBuO/s1sS+1sYhTEsn5Y/9dm3Lqh
-----END CERTIFICATE-----

Subject C=US, O=Truepic, OU=Vision, CN=Truepic Lens SDK v1.1.3 in Vision Camera v3.1.5
-----BEGIN CERTIFICATE-----
MIIDQTCCAimgAwIBAgIUTuu/3ye0L+cTPLWjhMw2dLN0d6cwDQYJKoZIhvcNAQEM
BQAwTjEeMBwGA1UEAwwVQW5kcm9pZENsYWltU2lnbmluZ0NBMQ0wCwYDVQQLDARM
ZW5zMRAwDgYDVQQKDAdUcnVlcGljMQswCQYDVQQGEwJVUzAeFw0yMzAyMTExODIy
MDBaFw0yMzAyMTIxODIxNTlaMGoxCzAJBgNVBAYTAlVTMRAwDgYDVQQKDAdUcnVl
cGljMQ8wDQYDVQQLDAZWaXNpb24xODA2BgNVBAMML1RydWVwaWMgTGVucyBTREsg
djEuMS4zIGluIFZpc2lvbiBDYW1lcmEgdjMuMS41MFkwEwYHKoZIzj0CAQYIKoZI
zj0DAQcDQgAEXEfQ50yTq8YluTWHPT1ceYpOlXRYWsNLGo6EFtATq2D8GKyCm3Gl
jmUcGE1bdGsZAhl28TK5pLPD9RcOKpY+P6OBxTCBwjAMBgNVHRMBAf8EAjAAMB8G
A1UdIwQYMBaAFNTQ3GEYq9CvbacngtZ+DQECAypsME0GCCsGAQUFBwEBBEEwPzA9
BggrBgEFBQcwAYYxaHR0cDovL3ZhLnRydWVwaWMuY29tL2VqYmNhL3B1YmxpY3dl
Yi9zdGF0dXMvb2NzcDATBgNVHSUEDDAKBggrBgEFBQcDBDAdBgNVHQ4EFgQUbJGK
r/Ji09Xgut+YRwQbdAv9i4QwDgYDVR0PAQH/BAQDAgeAMA0GCSqGSIb3DQEBDAUA
A4IBAQAqc0sFRwCvXBiKcumJO/xfYrx+HXKgVO4/9n5bgRw5YgbZk4v/ovFwwjQS
e1bfCYimPDm/H95WBSPcJcTU2vE7loid70ci9HJn+DLu3YSzGIQ1Id8rfq9ymFXk
NzW1IPRqGNA5r0KLnjZM2vNZFvKsi5BAUIMyiJsoA3ScFttoNn2Rq2w6zHy//Dd4
8ZXC77H2uxgIgJgam+q6XfZZ6ROJHXoYXSu1IN9YsfPL65m4W4Ak0QnzZvWS3Mrz
rhgf/RwblED57U3mkZKLWJAlEPsM0Kj81diW/aN6rghZn2yFkij+W0DlNYkAbKZI
WmWUfh2FnaxzuDvp4YfW+AdfdJlF
-----END CERTIFICATE-----

Subject	C=US, ST=Washington, L=Seattle, O=Amazon Web Services, Inc., OU=Amazon Bedrock, CN=Amazon Web Services, Inc.
-----BEGIN CERTIFICATE-----
MIIE4jCCA8qgAwIBAgIQDoTxo1cQcFRgZuCjsA1tYjANBgkqhkiG9w0BAQwFADBm
MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3
d3cuZGlnaWNlcnQuY29tMSUwIwYDVQQDExxEaWdpQ2VydCBEb2N1bWVudCBTaWdu
aW5nIENBMB4XDTI0MDgxNDAwMDAwMFoXDTI1MDgxNDIzNTk1OVowgZUxCzAJBgNV
BAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdTZWF0dGxlMSIw
IAYDVQQKExlBbWF6b24gV2ViIFNlcnZpY2VzLCBJbmMuMRcwFQYDVQQLEw5BbWF6
b24gQmVkcm9jazEiMCAGA1UEAxMZQW1hem9uIFdlYiBTZXJ2aWNlcywgSW5jLjB2
MBAGByqGSM49AgEGBSuBBAAiA2IABEKUt+neiVgWfp5cqjhkwUXwKOkU+mSWU6sa
2YEl9/DfL/0JlPOR9ntsUmsg679LtVPYcEtqqqgIOjJ9redxuAo90VLM01xWT+nk
qUUdtHpBVPRODS3ZrBpECNavldmvQ6OCAggwggIEMB8GA1UdIwQYMBaAFO/ONZPO
9obF+IT1DOdab9kvS+NkMB0GA1UdDgQWBBRkOTg3sqb/0k1bHUE+AqFxzLmpqDAW
BgNVHSAEDzANMAsGCWCGSAGG/WwDFTAOBgNVHQ8BAf8EBAMCBsAwHQYDVR0lBBYw
FAYIKwYBBQUHAwIGCCsGAQUFBwMEMIGNBgNVHR8EgYUwgYIwP6A9oDuGOWh0dHA6
Ly9jcmwzLmRpZ2ljZXJ0LmNvbS9EaWdpQ2VydERvY3VtZW50U2lnbmluZ0NBLWcx
LmNybDA/oD2gO4Y5aHR0cDovL2NybDQuZGlnaWNlcnQuY29tL0RpZ2lDZXJ0RG9j
dW1lbnRTaWduaW5nQ0EtZzEuY3JsMHsGCCsGAQUFBwEBBG8wbTAkBggrBgEFBQcw
AYYYaHR0cDovL29jc3AuZGlnaWNlcnQuY29tMEUGCCsGAQUFBzAChjlodHRwOi8v
Y2FjZXJ0cy5kaWdpY2VydC5jb20vRGlnaUNlcnREb2N1bWVudFNpZ25pbmdDQS5j
cnQwEwYKKoZIhvcvAQEJAgQFMAMCAQEwWQYKKoZIhvcvAQEJAQRLMEkCAQGGRGh0
dHA6Ly9hZG9iZS50aW1lc3RhbXAuZGlnaWNlcnQuY29tLzBFODRGMUEzNTcxMDcw
NTQ2MDY2RTBBM0IwMEQ2RDYyMA0GCSqGSIb3DQEBDAUAA4IBAQBqDwAfeE6JQfbs
S/6hwSNN5i2SWYg7z8W7KV2wxVyP9oSxVALvV2r9Eaomn+JHs8ZDi/667gvUDRzX
BRusP3pSOIyVT5tzMk3oGSzZUM16bM4o64FebC1MRpNz2u8yDYhxy9g9QXVCpjTk
WT7hDe7xqsn4aNulNJeS9K4hED4nksTbyYZ6Ef6O9mTgpcwoP5DlVAOH4uYzGZrT
Ixa/eUI8b4JlDCoip+ifl8Kf+qDYiukGa8fYqPQfhY5Od1e8i0u6lcnTZ8gACLZc
gM3ZQIfMugdhMaijqWvdqteMB4rl02cR9mvTQZAQRSdOHbfZfFxtHQ/HpDT737k2
faRY7r6c
-----END CERTIFICATE-----

Subject	C=DE, ST=Hamburg, L=Hamburg, O=TrustNXT GmbH, CN=TrustNXT Root CA, E=info@trustnxt.com
-----BEGIN CERTIFICATE-----
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
wO0n
-----END CERTIFICATE-----


-----BEGIN CERTIFICATE-----
MIICVDCCAfmgAwIBAgIBAjAKBggqhkjOPQQDAjBjMQswCQYDVQQGEwJOTDEVMBMG
A1UECBMMWnVpZC1Ib2xsYW5kMRMwEQYDVQQKEwpNeSBDb21wYW55MRYwFAYDVQQL
Ew1JVCBEZXBhcnRtZW50MRAwDgYDVQQDEwdSb290IENBMB4XDTI2MDUyNzE0MTcx
OVoXDTI3MDUyNzE0MTcxOVowazELMAkGA1UEBhMCTkwxFTATBgNVBAgTDFp1aWQt
SG9sbGFuZDETMBEGA1UEChMKTXkgQ29tcGFueTEWMBQGA1UECxMNSVQgRGVwYXJ0
bWVudDEYMBYGA1UEAxMPSW50ZXJtZWRpYXRlIENBMFkwEwYHKoZIzj0CAQYIKoZI
zj0DAQcDQgAEgGC6NMKsB02Z7Sx1/H2YLRWxvwo1QzFGHJGndc6EsH5SdQQowTmk
c5UsAcaa60QXV9oW0i4tBFhYIswgyzEjUaOBlTCBkjASBgNVHRMBAf8ECDAGAQH/
AgECMCwGA1UdJQEB/wQiMCAGCisGAQQBg+heAgEGCCsGAQUFBwMEBggrBgEFBQcD
JDAOBgNVHQ8BAf8EBAMCAoQwHQYDVR0OBBYEFCpSFgmWmqFcSmuRA884zMMnBnIH
MB8GA1UdIwQYMBaAFP/1zcGeP+xdXeT/GS8HJCdpuYmcMAoGCCqGSM49BAMCA0kA
MEYCIQCEtp1iKs3U14dV7TDfj6R45lxwbthwXDmhRL7/ayB1hAIhAP4YSfISllC3
I6BI/SUaAy+adYahCUaFph/dYm1FK8NY
-----END CERTIFICATE-----

-----BEGIN PUBLIC KEY-----
MIIGPzCCBCegAwIBAgIQU/92z3vZbxRdz2jzOAN2ZTANBgkqhkiG9w0BAQsFADB1
MQswCQYDVQQGEwJVUzEjMCEGA1UEChMaQWRvYmUgU3lzdGVtcyBJbmNvcnBvcmF0
ZWQxHTAbBgNVBAsTFEFkb2JlIFRydXN0IFNlcnZpY2VzMSIwIAYDVQQDExlBZG9i
ZSBQcm9kdWN0IFNlcnZpY2VzIEczMB4XDTI0MTAxNTAwMDAwMFoXDTI1MTAxNTIz
NTk1OVowgbExGTAXBgNVBAMMEEFkb2JlIEMyUEEgU3RhZ2UxKDAmBgNVBAsMH0Nv
bnRlbnQgQXV0aGVudGljaXR5IEluaXRpYXRpdmUxEzARBgNVBAoMCkFkb2JlIElu
Yy4xETAPBgNVBAcMCFNhbiBKb3NlMRMwEQYDVQQIDApDYWxpZm9ybmlhMQswCQYD
VQQGEwJVUzEgMB4GCSqGSIb3DQEJARYRY2FpLW9wc0BhZG9iZS5jb20wggEiMA0G
CSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC2s8cb+8ZxeWkJLnVwqVfjmwmc81UT
C/wDpEYdXNWdwoJbkhpvu2noXB02Fi6HLyZQmiEs+CPgt90KOYs6jAxMOfRdEhzt
ptlD1mKlh5P6MYoPs7Lk9hvtKISfB7BYZqt1p3hoTnT/6W+X/d1iwApqpSZayq+g
NWdmmZJtC0fOuaTPUuC/LR8yshl4I39KAe0JNJFZKnDrWwDZ/MBBbcbBTjzcI/Ut
QJwQrX1BhB5hgWBl47kGkygEn73/+LuRU6nyXyokPmrH0ILR153e52xcI1G1GJd8
59s8oc9XfnWrcIQ1VTs+GW0GMryJ/UNFcdp17kC4aNdKSvBGMm6wPeZXAgMBAAGj
ggGMMIIBiDAMBgNVHRMBAf8EAjAAMA4GA1UdDwEB/wQEAwIHgDAeBgNVHSUEFzAV
BgkqhkiG9y8BAQwGCCsGAQUFBwMEMIGOBgNVHSAEgYYwgYMwgYAGCSqGSIb3LwEC
AzBzMHEGCCsGAQUFBwICMGUMY1lvdSBhcmUgbm90IHBlcm1pdHRlZCB0byB1c2Ug
dGhpcyBMaWNlbnNlIENlcnRpZmljYXRlIGV4Y2VwdCBhcyBwZXJtaXR0ZWQgYnkg
dGhlIGxpY2Vuc2UgYWdyZWVtZW50LjBdBgNVHR8EVjBUMFKgUKBOhkxodHRwOi8v
cGtpLWNybC5zeW1hdXRoLmNvbS9jYV83YTVjM2EwYzczMTE3NDA2YWRkMTkzMTJi
YzFiYzIzZi9MYXRlc3RDUkwuY3JsMDcGCCsGAQUFBwEBBCswKTAnBggrBgEFBQcw
AYYbaHR0cDovL3BraS1vY3NwLnN5bWF1dGguY29tMB8GA1UdIwQYMBaAFFcpejJN
zP7kNU7AHyRzznNTq99qMA0GCSqGSIb3DQEBCwUAA4ICAQBEcThKNOiCxloQOHnt
q9AGg2kbWBYXWqpHZsbK38GVnecsCXSO3qifGC418+Vt1/E78e3/DYAJQcdLhqgy
4EooquDI4mz3PGxgZCUgpD51g4jyX3VJYCThHUx6z/K4ts0VZavbyrBUOurtRBEQ
lU7XnW3XVW2pEfxg1F/nJNrH1KoNTysCsieY8ajdRy+dPpLD3/L+nYYVqrcN2JzA
exWxN5a87wIr4KNKVxK3177nxIWf0G1nidC3RRS+ler/BUDFuLrLgEWG8ULEGqRI
1+gnx2P7PnD5F1F5xraqbrzfou0XXA1eDVeDvKTFS7xHdcz7jljcPM3IfdC7QNUn
/uMiEPa67d5p0/IwC9RMmbE4J2V+sEntChepon+RDcVHlr4SSW3hL9d7tEhzJS+0
3EVWO/3/f1oVHaSRLDbb7BXZt2uQjvlvUAj5I3of0yv9enCfPJLh4O5ttof+XW8d
ILFoknXr36N4Oe7AyeINykRbp+bcV8XSsQLsQX2wCzEeBdtUC9VZhzkYkQqBobdg
uYy0GEtghU/x3HitUKa2WQMfNbBA73Pmg5BqhdBNHamFnbhtV/gPdNCvQtQB4url
EsfKwfOeZA//3mJkSU3kH/+0WXhNQCIMmbq1grdEisYjKToBLz35RzEErB23U/Ts
m0WbXY+sP73kGwFo+FazmrtVtw==
-----END PUBLIC KEY-----

`;
    },

    async _validateManifests(manifestStore: VerifiedManifestStore, asset: Asset) {
      const validationResults: VerifyStoreState['manifestValidationResults'] =
        new Map();

      const activeManifest = manifestStore.getActiveManifest();
      if (!activeManifest) {
        throw new ValidationError(
          ValidationStatusCode.ClaimCBORInvalid,
          manifestStore.sourceBox,
          'Active manifest is missing',
        );
      }

      for (const manifest of manifestStore.manifests) {
        const label = manifest.label;
        if (!label) {
          throw new ValidationError(
            ValidationStatusCode.GeneralError,
            manifestStore.sourceBox,
            'The manifest is missing a label',
          );
        }
        const validationOptions: CawgValidationOptions = {
          trustAnchors: [this._getTrustList()],
        };
        console.debug('validationOptions:',  validationOptions);
        const result = await manifest.validate(asset, validationOptions)
        manifest.validationResult = result;
        validationResults.set(label, result);
      }
      return validationResults;
    },

    _createManifestThumbnailUrls(
      manifests: Manifest[] = [],
      manifestThumbnailUrls = new Map<string, string>(),
    ) {
      for (const manifest of manifests) {
        if (!manifest.label) {
          continue;
        }

        const thumbnails =
          manifest.assertions?.getThumbnailAssertions() as ThumbnailAssertion[];

        const claimThumbnail = thumbnails?.find(
          (thumbnail) => thumbnail.thumbnailType === ThumbnailType.Claim,
        );

        if (claimThumbnail?.content) {
          const thumbnailDataUrl = URL.createObjectURL(
            new Blob([new Uint8Array(claimThumbnail.content)], {
              type: claimThumbnail.mimeType,
            }),
          );

          manifestThumbnailUrls.set(manifest.label, thumbnailDataUrl);
        }
      }

      return manifestThumbnailUrls;
    },

    _revokeCurrentManifestThumbnailUrls() {
      for (const url of store.manifestThumbnailUrls()?.values() || []) {
        URL.revokeObjectURL(url);
      }
    },

    _resetState() {
      patchState(store, initialState);
    },
  })),
  withHooks({
    onInit() {
      console.debug('VerifyStore initialized');
    },
  }),
);
