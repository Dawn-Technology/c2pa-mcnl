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
  manifestsThumbnailUrls: Map<string, string> | null; // label → blob URL

  activeManifest: Manifest | null;
  activeManifestValidationResult?: ValidationResult;

  error?: unknown;
};

const initialState: VerifyStoreState = {
  isLoading: false,
  file: null,
  fileDataUrl: null,
  asset: null,
  manifestStore: null,
  activeManifest: null,
  manifestsThumbnailUrls: null,
};

export const VerifyStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ file, manifestStore }, localeId = inject(LOCALE_ID)) => ({
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
  })),
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
        manifestsThumbnailUrls: null,
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
        try {
          manifestStore = ManifestStore.read(SuperBox.fromBuffer(jumbfBytes));
        } catch (error) {
          if (error instanceof ValidationError) {
            console.error('Manifest validation error:', error);
            return patchState(store, () => ({
              isLoading: false,
              manifestStoreReadValidationError: error,
            }));
          } else {
            console.error('An unexpected error occurred.', String(error));
            return patchState(store, () => ({
              isLoading: false,
              error,
            }));
          }
        }

        const manifestsThumbnailUrls = this._createManifestsThumbnailUrls(
          manifestStore.manifests,
        );

        let activeManifestValidationResult: ValidationResult;
        try {
          activeManifestValidationResult = await manifestStore.validate(asset);
          console.log(activeManifestValidationResult);
        } catch (error) {
          if (error instanceof ValidationError) {
            console.error('Manifest validation error:', error);
            return patchState(store, () => ({
              isLoading: false,
              manifestStoreReadValidationError: error,
            }));
          } else {
            console.error('An unexpected error occurred.', String(error));
            return patchState(store, () => ({
              isLoading: false,
              error,
            }));
          }
        }

        patchState(store, () => ({
          isLoading: false,
          asset,
          manifestStore,
          manifestsThumbnailUrls,
          activeManifest: manifestStore.getActiveManifest(),
          activeManifestValidationResult,
        }));
      } catch (error) {
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
      const activeManifestValidationResult =
        await activeManifest?.validate(asset);

      patchState(store, () => ({
        isLoading: false,
        activeManifest,
        activeManifestValidationResult,
      }));
    },

    getManifestsThumbnailDataUrl(label?: string) {
      return label
        ? (store?.manifestsThumbnailUrls()?.get(label) ?? null)
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

    _createManifestsThumbnailUrls(
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
      for (const url of store.manifestsThumbnailUrls()?.values() || []) {
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
