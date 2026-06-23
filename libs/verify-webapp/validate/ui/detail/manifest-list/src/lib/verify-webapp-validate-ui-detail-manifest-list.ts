import { Component, inject } from '@angular/core';
import { VerifyStore } from '@c2pa-mcnl/verify-webapp/validate/data-access';
import { NgClass } from '@angular/common';
import { VerifyWebappValidateUiValidationBadge } from '@c2pa-mcnl/verify-webapp/validate/ui/validation-badge';
import {
  getManifestValidationState,
  ManifestValidationState,
} from '@c2pa-mcnl/shared/utils/helpers';
import { ValidationResult } from '@dawn-technology/c2pa-ts/manifest';

@Component({
  selector: 'lib-verify-webapp-validate-ui-detail-manifest-list',
  imports: [NgClass, VerifyWebappValidateUiValidationBadge],
  templateUrl: './verify-webapp-validate-ui-detail-manifest-list.html',
  styleUrl: './verify-webapp-validate-ui-detail-manifest-list.css',
})
export class VerifyWebappValidateUiDetailManifestList {
  readonly store = inject(VerifyStore);

  isVideoFile(mimeType: string | null | undefined): boolean {
    return mimeType?.startsWith('video/') ?? false;
  }

  manifestAriaLabel(label: string | undefined, index: number): string {
    const manifestLabel = label?.trim() || `manifest ${index + 1}`;
    return `Selecteer ${manifestLabel}`;
  }

  manifestValidationState(
    validationResult: ValidationResult | null | undefined,
  ): ManifestValidationState {
    return getManifestValidationState(validationResult);
  }
}
