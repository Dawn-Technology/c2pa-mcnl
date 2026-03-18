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
} from '@dockbite/c2pa-ts/manifest';
import { SuperBox } from '@dockbite/c2pa-ts/jumbf';
import { createAsset } from '@dockbite/c2pa-ts/asset';
import { formatDate } from '@angular/common';

type VerifyStoreState = {
  isLoading: boolean;

  file: File | null;
  fileDataUrl: string | null;

  manifestStore: ManifestStore | null;
  activeManifest: Manifest | null;
  manifestThumbnailUrls: Map<string, string>; // label → blob URL
};

const initialState: VerifyStoreState = {
  isLoading: false,
  file: null,
  fileDataUrl: null,
  manifestStore: null,
  activeManifest: null,
  manifestThumbnailUrls: new Map(),
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

    /**
     * Reversed ordering of the manifests array as we want to show the
     * last value as the first in the view.
     */
    manifestsReversed: computed(() =>
      [...(manifestStore()?.manifests ?? [])].reverse(),
    ),
  })),
  withMethods((store) => ({
    async setFile(file: File | null) {
      if (!file) {
        this._revokeCurrentFileDataUrl();
        patchState(store, () => ({
          file,
        }));
        return;
      }

      const prevFileDataUrl = store.fileDataUrl();
      if (prevFileDataUrl) {
        URL.revokeObjectURL(prevFileDataUrl);
      }

      const fileDataUrl = URL.createObjectURL(file);

      const prevManifestThumbnailUrls = store.manifestThumbnailUrls();
      for (const url of prevManifestThumbnailUrls.values()) {
        URL.revokeObjectURL(url);
      }

      patchState(store, () => ({
        isLoading: true,
        fileDataUrl,
        file,
      }));

      // todo error handling
      const asset = await createAsset(file);
      const jumbfBytes = await asset.getManifestJUMBF();

      if (jumbfBytes) {
        const manifestStore = ManifestStore.read(
          SuperBox.fromBuffer(jumbfBytes),
        );
        const activeManifest = manifestStore.getActiveManifest();

        // todo move to separate method
        const manifestThumbnailUrls = new Map<string, string>();
        for (const manifest of manifestStore?.manifests || []) {
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

        patchState(store, () => ({
          isLoading: false,
          manifestStore,
          activeManifest,
          manifestThumbnailUrls,
        }));
      }
    },
    setActiveManifest(label?: string) {
      patchState(store, () => ({
        isLoading: true,
      }));

      let activeManifest: Manifest | null;
      if (label) {
        activeManifest =
          store?.manifestStore()?.getManifestByLabel(label) || null;
      }

      patchState(store, () => ({
        activeManifest,
        isLoading: false,
      }));
    },

    getManifestThumbnailDataUrl(label?: string) {
      return label ? (store.manifestThumbnailUrls().get(label) ?? null) : null;
    },

    isActiveManifest(label?: string) {
      return store.activeManifest()?.label === label;
    },

    _createFileDataUrl(file: File) {
      const prevFileDataUrl = store.fileDataUrl();
      const fileDataUrl = URL.createObjectURL(file);

      patchState(store, () => ({
        fileDataUrl,
      }));

      if (prevFileDataUrl) {
        URL.revokeObjectURL(prevFileDataUrl);
      }
    },
    _revokeCurrentFileDataUrl() {
      const fileDataUrl = store.fileDataUrl();
      if (fileDataUrl) {
        URL.revokeObjectURL(fileDataUrl);
      }

      patchState(store, () => ({
        fileDataUrl: null,
      }));
    },
  })),
  withHooks({
    onInit() {
      console.debug('VerifyStore initialized');
    },
  }),
);
