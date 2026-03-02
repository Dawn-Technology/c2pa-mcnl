import { Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { FileUploadComponent } from '@c2pa-mcnl/shared/ui/file-upload';
import {
  ASSET_MAX_SIZE,
  ASSET_MIME_TYPES,
} from '@c2pa-mcnl/shared/utils/constants';

@Component({
  selector: 'lib-verify-webapp-home-feature-detail',
  imports: [NgOptimizedImage, FileUploadComponent],
  templateUrl: './verify-webapp-home-feature-detail.html',
  styleUrl: './verify-webapp-home-feature-detail.css',
})
export class VerifyWebappHomeFeatureDetail {
  uploadMimeTypes = ASSET_MIME_TYPES;
  uploadMaxSize = ASSET_MAX_SIZE;
}
