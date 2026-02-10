import { Component, effect, inject } from '@angular/core';
import { SigningWebappFormFeatureDetailService } from './signing-webapp-form-feature-detail.service';
import { form as signalForm } from '@angular/forms/signals';
import { SigningWebappFormUiUploadFileInputComponent } from '@c2pa-mcnl/signing-webapp/form/ui/upload-file-input';
import { FormModel } from './form.model';
import {
  ASSET_MAX_SIZE,
  ASSET_MIME_TYPES,
  CERTIFICATE_MAX_SIZE,
  CERTIFICATE_MIME_TYPES,
  DID_MAX_SIZE,
  DID_MIME_TYPES,
  FormOptions,
} from './form.options';

@Component({
  standalone: true,
  selector: 'lib-signing-webapp-feature-signing-form',
  imports: [SigningWebappFormUiUploadFileInputComponent],
  templateUrl: './signing-webapp-form-feature-detail.component.html',
  providers: [SigningWebappFormFeatureDetailService],
})
export class SigningWebappFormFeatureDetailComponent {
  private readonly service = inject(SigningWebappFormFeatureDetailService);

  certificateMimeTypes = CERTIFICATE_MIME_TYPES;
  certificateMaxSize = CERTIFICATE_MAX_SIZE;
  didMimeTypes = DID_MIME_TYPES;
  didMaxSize = DID_MAX_SIZE;
  assetMimeTypes = ASSET_MIME_TYPES;
  assetMaxSize = ASSET_MAX_SIZE;

  signingModel = FormModel;
  signingForm = signalForm(this.signingModel, FormOptions);

  constructor() {
    effect(() => {
      console.debug('form changed: ', this.signingModel());
      console.debug('form valid: ', this.signingForm().valid());
    });
  }
}
