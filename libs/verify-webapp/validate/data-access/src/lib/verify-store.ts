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
  Manifest,
  ManifestStore,
  ThumbnailAssertion,
  ThumbnailType,
  ValidationError,
  ValidationResult,
  ValidationStatusCode,
} from '@dockbite/c2pa-ts/manifest';
import { SuperBox } from '@dockbite/c2pa-ts/jumbf';
import { Asset, createAsset } from '@dockbite/c2pa-ts/asset';
import { formatDate } from '@angular/common';
import { isImageMimeType } from '@c2pa-mcnl/shared/utils/helpers';

type VerifyStoreState = {
  isLoading: boolean;

  file: File | null;
  fileDataUrl: string | null;

  asset: Asset | null;
  manifestStore: ManifestStore | null;
  manifestStoreReadValidationError?: ValidationError;
  manifestThumbnailUrls: Map<string, string> | null; // label → blob URL
  manifestValidationResults: Map<string, ValidationResult> | null;
  activeManifest: Manifest | null;

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
      { file, manifestStore, activeManifest },
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

      getActionAssertions: computed(
        () => activeManifest()?.assertions?.getActionAssertions() ?? [],
      ),
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
          'manifests validationr results:',
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

    async _validateManifests(manifestStore: ManifestStore, asset: Asset) {
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

        validationResults.set(label, await manifest.validate(asset));
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
