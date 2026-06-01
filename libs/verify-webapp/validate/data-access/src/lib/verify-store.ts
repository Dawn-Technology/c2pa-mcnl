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
          trustAnchors: [],
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
