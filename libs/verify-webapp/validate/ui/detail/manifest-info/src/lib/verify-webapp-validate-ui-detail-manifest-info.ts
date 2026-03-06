import { Component, inject } from '@angular/core';
import { VerifyStore } from '@c2pa-mcnl/verify-webapp/validate/data-access';
import { VerifyWebappValidateUiFileCard } from '@c2pa-mcnl/verify-webapp/validate/ui/file-card';

@Component({
  selector: 'lib-verify-webapp-validate-ui-detail-manifest-info',
  imports: [VerifyWebappValidateUiFileCard],
  templateUrl: './verify-webapp-validate-ui-detail-manifest-info.html',
  styleUrl: './verify-webapp-validate-ui-detail-manifest-info.css',
})
export class VerifyWebappValidateUiDetailManifestInfo {
  readonly store = inject(VerifyStore);
}
