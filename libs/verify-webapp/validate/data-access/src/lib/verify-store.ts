import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { computed, inject, LOCALE_ID } from '@angular/core';
import {
  ActionAssertion,
  Manifest,
  ManifestStore,
  MetadataAssertion,
  MetadataNamespace,
  ThumbnailAssertion,
  ThumbnailType,
  ValidationError,
  ValidationResult,
  ValidationStatusCode,
} from '@dawn-technology/c2pa-ts/manifest';
import { CawgValidationOptions } from '@dawn-technology/c2pa-ts/cawg';
import { SuperBox } from '@dawn-technology/c2pa-ts/jumbf';
import { Asset, createAsset } from '@dawn-technology/c2pa-ts/asset';
import { formatDate } from '@angular/common';
import {
  ActiveManifestIdentityCard,
  isImageMimeType,
  issuerForIdentity,
  linkedIdentityClaimsForAssertion,
  readableReferencedAssertion,
  shortIssuer,
  statusForIdentity,
  toDisplayValue,
  toHexSnippet,
} from '@c2pa-mcnl/shared/utils/helpers';
import {
  identitySortOrder,
  readableIdentityRoleMap,
  readableVerificationMethodMap,
} from '@c2pa-mcnl/shared/utils/constants';
import { environment } from '@c2pa-mcnl/verify-webapp/shared/environments';

export type VerifiedManifestStore = ManifestStore & {
  manifests: VerifiedManifest[];
};

export type VerifiedManifest = Manifest & {
  validationResult?: ValidationResult;
};

type VerifyStoreState = {
  isLoading: boolean;

  file: File | null;
  fileDataUrl: string | null;

  asset: Asset | null;
  manifestStore: VerifiedManifestStore | null;
  manifestStoreReadValidationError?: ValidationError;
  manifestThumbnailUrls: Map<string, string> | null; // label → blob URL
  manifestValidationResults: Map<string, ValidationResult> | null;
  activeManifest: VerifiedManifest | null;

  error?: unknown;
};

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
  withMethods((store) => {
    let signerTrustAnchorsCache: string[] | null = null;
    let timestampTrustAnchorsCache: string[] | null = null;
    let signerTrustAnchorsPromise: Promise<string[]> | null = null;
    let timestampTrustAnchorsPromise: Promise<string[]> | null = null;
    let trustedIcaIssuersCache: string[] | null = null;
    let trustedIcaIssuersPromise: Promise<string[]> | null = null;

    return {
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

            console.log(manifestValidationResults);
            console.log(manifestStore.manifests);
          } catch (error) {
            if (error instanceof ValidationError) {
              console.error('Manifest validation error:', error);
              return patchState(store, () => ({
                isLoading: false,
                manifestStoreReadValidationError: error,
              }));
            } else {
              console.error(
                'Manifest validation unknown error.',
                String(error),
              );
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

          patchState(store, () => ({
            isLoading: false,
            asset,
            manifestStore,
            manifestThumbnailUrls,
            manifestValidationResults,
            activeManifest,
          }));
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.error('An unexpected error occurred.', message);

          patchState(store, () => ({
            error,
            isLoading: false,
            file: null,
          }));

          this._resetState();
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

      _normalizeUrls(urls: readonly string[]) {
        return [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
      },

      _getSignerTrustListUrls() {
        return this._normalizeUrls(environment.trustListUrls);
      },

      _getTimestampTrustListUrls() {
        return this._normalizeUrls(environment.timestampTrustListUrls);
      },

      async _getTrustedIcaIssuers() {
        if (trustedIcaIssuersCache) {
          return trustedIcaIssuersCache;
        }

        if (trustedIcaIssuersPromise) {
          return trustedIcaIssuersPromise;
        }

        const urls = this._normalizeUrls(environment.trustedIcaIssuers);
        if (!urls.length) {
          return [];
        }

        trustedIcaIssuersPromise = this._fetchTrustAnchors(
          urls,
          'trusted ICA issuers',
        )
          .then((trustedIcaIssuers) => {
            const flatMap = trustedIcaIssuers.flatMap((issuers) =>
              issuers
                .split('\n')
                .map((issuer) => issuer.trim())
                .filter(Boolean),
            );
            trustedIcaIssuersCache = flatMap;
            return flatMap;
          })
          .finally(() => {
            trustedIcaIssuersPromise = null;
          });

        return trustedIcaIssuersPromise;
      },

      async _fetchTrustAnchors(urls: string[], trustListName: string) {
        if (!urls.length) {
          throw new Error(`No URLs configured for ${trustListName}`);
        }

        const results = await Promise.allSettled(
          urls.map(async (url) => {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(
                `Failed to fetch trust list from "${url}" (${response.status})`,
              );
            }

            return response.text();
          }),
        );

        const anchors = results.flatMap((result) =>
          result.status === 'fulfilled' ? [result.value] : [],
        );

        if (!anchors.length) {
          const failureMessages = results
            .flatMap((result) =>
              result.status === 'rejected' ? [String(result.reason)] : [],
            )
            .join('; ');
          throw new Error(
            `No trust anchors resolved for ${trustListName}${
              failureMessages ? `: ${failureMessages}` : ''
            }`,
          );
        }

        return anchors;
      },

      async _getTrustAnchors() {
        if (signerTrustAnchorsCache) {
          return signerTrustAnchorsCache;
        }

        if (signerTrustAnchorsPromise) {
          return signerTrustAnchorsPromise;
        }

        const urls = this._getSignerTrustListUrls();
        signerTrustAnchorsPromise = this._fetchTrustAnchors(
          urls,
          'signing trust lists',
        )
          .then((anchors) => {
            signerTrustAnchorsCache = anchors;
            return anchors;
          })
          .finally(() => {
            signerTrustAnchorsPromise = null;
          });

        return signerTrustAnchorsPromise;
      },

      async _getTimestampTrustAnchors() {
        if (timestampTrustAnchorsCache) {
          return timestampTrustAnchorsCache;
        }

        if (timestampTrustAnchorsPromise) {
          return timestampTrustAnchorsPromise;
        }

        const urls = this._getTimestampTrustListUrls();
        if (!urls.length) {
          return [];
        }

        timestampTrustAnchorsPromise = this._fetchTrustAnchors(
          urls,
          'timestamp trust lists',
        )
          .then((anchors) => {
            timestampTrustAnchorsCache = anchors;
            return anchors;
          })
          .finally(() => {
            timestampTrustAnchorsPromise = null;
          });

        return timestampTrustAnchorsPromise;
      },

      async _validateManifests(
        manifestStore: VerifiedManifestStore,
        asset: Asset,
      ) {
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

        const trustAnchors = await this._getTrustAnchors();
        const timestampTrustAnchors = await this._getTimestampTrustAnchors();
        const trustedIssuers = await this._getTrustedIcaIssuers();

        const cawgOptions: Record<string, unknown> = {};
        if (timestampTrustAnchors.length) {
          cawgOptions['timestampTrustAnchors'] = timestampTrustAnchors;
        }
        if (trustedIssuers.length) {
          cawgOptions['trustedIcaIssuers'] = trustedIssuers;
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
            trustAnchors,
            timestampTrustAnchors,
            cawg: {
              trustedIcaIssuers: trustedIssuers,
            },
          };

          const result = await manifest.validate(asset, validationOptions);
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
    };
  }),
);
