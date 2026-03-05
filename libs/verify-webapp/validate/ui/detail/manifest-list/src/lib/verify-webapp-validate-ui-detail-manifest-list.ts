import { Component, inject } from '@angular/core';
import { VerifyStore } from '@c2pa-mcnl/verify-webapp/validate/data-access';
import { NgClass } from '@angular/common';

@Component({
  selector: 'lib-verify-webapp-validate-ui-detail-manifest-list',
  imports: [NgClass],
  templateUrl: './verify-webapp-validate-ui-detail-manifest-list.html',
  styleUrl: './verify-webapp-validate-ui-detail-manifest-list.css',
})
export class VerifyWebappValidateUiDetailManifestList {
  readonly store = inject(VerifyStore);
}
