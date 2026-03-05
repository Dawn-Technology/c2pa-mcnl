import { Component, inject, OnInit } from '@angular/core';
import { VerifyStore } from '@c2pa-mcnl/verify-webapp/validate/data-access';
import { Router } from '@angular/router';
import { VerifyWebappSharedUiLoadingOverlayComponent } from '@c2pa-mcnl/verify-webapp/shared/ui/loading-overlay';
import {
  ASSET_MAX_SIZE,
  ASSET_MIME_TYPES,
} from '@c2pa-mcnl/shared/utils/constants';
import { VerifyWebappValidateUiDetailFileHandler } from '@c2pa-mcnl/verify-webapp/validate/ui/detail/file-handler';
import { VerifyWebappValidateUiDetailManifestList } from '@c2pa-mcnl/verify-webapp/validate/ui/detail/manifest-list';
import { VerifyWebappValidateUiDetailManifestInfo } from '@c2pa-mcnl/verify-webapp/validate/ui/detail/manifest-info';

@Component({
  selector: 'lib-verify-webapp-validate-feature-detail',
  imports: [
    VerifyWebappSharedUiLoadingOverlayComponent,
    VerifyWebappValidateUiDetailFileHandler,
    VerifyWebappValidateUiDetailManifestList,
    VerifyWebappValidateUiDetailManifestInfo,
  ],
  templateUrl: './verify-webapp-validate-feature-detail.component.html',
  styleUrl: './verify-webapp-validate-feature-detail.component.css',
})
export class VerifyWebappValidateFeatureDetailComponent implements OnInit {
  private readonly router = inject(Router);
  readonly store = inject(VerifyStore);


  ngOnInit() {
    if (!this.store.hasFile()) {
      console.debug('No file found in store, redirecting to home');
      this.router.navigate(['/']);
    }
  }
}
