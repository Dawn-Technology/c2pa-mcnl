import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { computed } from '@angular/core';

type VerifyStoreState = {
  isLoading: boolean;
  file: File | null;
  c2paResult: {
    mocked: any;
  } | null;

  activeManifest: number | null;
};

const initialState: VerifyStoreState = {
  isLoading: false,
  file: null,
  c2paResult: null,
  activeManifest: 1,
};

export const VerifyStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ file, c2paResult }) => ({
    hasFile: computed(() => !!file()),
    hasC2paResult: computed(() => !!c2paResult()),
    fileDate: computed(() => {
      const lastModified = file()?.lastModified;
      if (!lastModified) return '—';
      return new Date(lastModified).toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }),
  })),
  withMethods((store) => ({
    setFile(file: File | null) {
      patchState(store, () => ({
        isLoading: true,
        file,
      }));

      setTimeout(() => {
        console.debug('Simulating C2PA result for file:', file);

        patchState(store, () => ({
          isLoading: false,
          c2paResult: {
            mocked: {
              fileName: file?.name,
              fileSize: file?.size,
              fileType: file?.type,
              timestamp: new Date().toISOString(),
            },
          },
        }));
      }, 1000);
    },
    setActiveManifest(manifestIndex: number) {
      patchState(store, () => ({
        isLoading: true,
      }));

      setTimeout(() => {
        patchState(store, () => ({
          activeManifest: manifestIndex,
          isLoading: false,
        }));
      }, 500);
    },
  })),
  withHooks({
    onInit() {
      console.debug('VerifyStore initialized');
    },
  }),
);
