import { Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgOptimizedImage } from '@angular/common';
import { FileUploadComponent } from '@c2pa-mcnl/shared/ui/file-upload';
import {
  ASSET_MAX_SIZE,
  ASSET_MIME_TYPES,
} from '@c2pa-mcnl/shared/utils/constants';
import { VerifyStore } from '@c2pa-mcnl/verify-webapp/validate/data-access';
import { Router, ActivatedRoute } from '@angular/router';
import {
  VerifyWebappSharedUiLoadingOverlayComponent,
  WindowFileDropOverlayComponent,
} from '@c2pa-mcnl/verify-webapp/shared/ui/loading-overlay';
import { fetchFileFromUrl } from '@c2pa-mcnl/shared/utils/helpers';

@Component({
  selector: 'lib-verify-webapp-home-feature-detail',
  imports: [
    NgOptimizedImage,
    FileUploadComponent,
    VerifyWebappSharedUiLoadingOverlayComponent,
    WindowFileDropOverlayComponent,
  ],
  templateUrl: './verify-webapp-validate-feature-home.component.html',
  styleUrl: './verify-webapp-validate-feature-home.component.css',
})
export class VerifyWebappValidateFeatureHomeComponent {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  readonly store = inject(VerifyStore);

  readonly uploadMimeTypes = ASSET_MIME_TYPES;
  readonly uploadMaxSize = ASSET_MAX_SIZE;

  /**
   * Reactive signal derived from the URL query params.
   * Re-runs the ?o effect whenever the URL changes (e.g. back/forward navigation).
   */
  private readonly queryParams = toSignal(this.activatedRoute.queryParamMap);

  constructor() {
    // Navigate to /verify once a file is loaded into the store.
    effect(() => {
      if (this.store.hasFile()) {
        this.router.navigate(['verify']);
      }
    });

    // Reactively handle the ?o=<url> query parameter using signals.
    effect(async () => {
      const fileUrl = this.queryParams()?.get('o');
      if (!fileUrl) {
        return;
      }

      try {
        const file = await fetchFileFromUrl(fileUrl, ASSET_MAX_SIZE);

        const isAllowedMimeType = ASSET_MIME_TYPES.some((allowed) => {
          const norm = allowed.toLowerCase();
          const type = file.type.toLowerCase();
          if (type === norm) return true;
          if (norm.endsWith('/*'))
            return type.startsWith(norm.slice(0, -2) + '/');
          return false;
        });

        if (!isAllowedMimeType) {
          console.warn(
            `File type "${file.type || 'unknown'}" is not supported. ` +
              `Supported types: ${ASSET_MIME_TYPES.join(', ')}`,
          );
          return;
        }

        // Delegates to the store — reuses the existing loading state and navigation effect.
        this.store.setFile(file);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to load file from URL:', message);
        // Non-fatal: the manual upload UI remains available as a fallback.
      }
    });
  }
}
