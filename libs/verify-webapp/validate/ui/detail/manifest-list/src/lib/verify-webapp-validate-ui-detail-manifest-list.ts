import { Component, inject } from '@angular/core';
import { VerifyStore } from '@c2pa-mcnl/verify-webapp/validate/data-access';
import { NgClass } from '@angular/common';
import { VerifyWebappValidateUiValidationBadge } from '@c2pa-mcnl/verify-webapp/validate/ui/validation-badge';
import { VerifyWebappValidateUiFileCard } from '@c2pa-mcnl/verify-webapp/validate/ui/file-card';

@Component({
  selector: 'lib-verify-webapp-validate-ui-detail-manifest-list',
  imports: [
    NgClass,
    VerifyWebappValidateUiValidationBadge,
    VerifyWebappValidateUiFileCard,
  ],
  templateUrl: './verify-webapp-validate-ui-detail-manifest-list.html',
  styleUrl: './verify-webapp-validate-ui-detail-manifest-list.css',
})
export class VerifyWebappValidateUiDetailManifestList {
  readonly store = inject(VerifyStore);
}
