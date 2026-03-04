import { Component, effect, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { FileUploadComponent } from '@c2pa-mcnl/shared/ui/file-upload';
import {
  ASSET_MAX_SIZE,
  ASSET_MIME_TYPES,
} from '@c2pa-mcnl/shared/utils/constants';
import { VerifyStore } from '@c2pa-mcnl/verify-webapp/validate/data-access';
import { Router } from '@angular/router';
import { VerifyWebappSharedUiLoadingOverlayComponent } from '@c2pa-mcnl/verify-webapp/shared/ui/loading-overlay';

@Component({
  selector: 'lib-verify-webapp-home-feature-detail',
  imports: [
    NgOptimizedImage,
    FileUploadComponent,
    VerifyWebappSharedUiLoadingOverlayComponent,
  ],
  templateUrl: './verify-webapp-validate-feature-home.component.html',
  styleUrl: './verify-webapp-validate-feature-home.component.css',
})
export class VerifyWebappValidateFeatureHomeComponent {
  private readonly router = inject(Router);
  readonly store = inject(VerifyStore);

  readonly uploadMimeTypes = ASSET_MIME_TYPES;
  readonly uploadMaxSize = ASSET_MAX_SIZE;

  constructor() {
    effect(() => {
      if (this.store.hasC2paResult()) {
        this.router.navigate(['verify']);
      }
    });
  }
}
