import { Component, inject } from '@angular/core';
import { VerifyStore } from '@c2pa-mcnl/verify-webapp/validate/data-access';

@Component({
  selector: 'lib-verify-webapp-validate-ui-detail-manifest-info',
  imports: [],
  templateUrl: './verify-webapp-validate-ui-detail-manifest-info.html',
  styleUrl: './verify-webapp-validate-ui-detail-manifest-info.css',
})
export class VerifyWebappValidateUiDetailManifestInfo {
  readonly store = inject(VerifyStore);
}
