import { Component, inject } from '@angular/core';
import { FileUploadComponent } from '@c2pa-mcnl/shared/ui/file-upload';
import {
  ASSET_MAX_SIZE,
  ASSET_MIME_TYPES,
} from '@c2pa-mcnl/shared/utils/constants';
import { VerifyStore } from '@c2pa-mcnl/verify-webapp/validate/data-access';

@Component({
  selector: 'lib-verify-webapp-validate-ui-detail-file-handler',
  imports: [FileUploadComponent],
  templateUrl: './verify-webapp-validate-ui-detail-file-handler.html',
  styleUrl: './verify-webapp-validate-ui-detail-file-handler.css',
})
export class VerifyWebappValidateUiDetailFileHandler {
  readonly store = inject(VerifyStore);

  readonly uploadMimeTypes = ASSET_MIME_TYPES;
  readonly uploadMaxSize = ASSET_MAX_SIZE;
}
