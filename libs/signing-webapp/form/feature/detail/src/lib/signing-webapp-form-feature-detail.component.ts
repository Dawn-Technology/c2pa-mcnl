import { Component, computed, effect, inject } from '@angular/core';
import { SigningWebappFormFeatureDetailService } from './signing-webapp-form-feature-detail.service';
import { form as signalForm, FormField } from '@angular/forms/signals';
import { SigningWebappFormUiUploadFileInputComponent } from '@c2pa-mcnl/signing-webapp/form/ui/upload-file-input';
import { FormModel } from './form.model';
import {
  ASSET_MAX_SIZE,
  ASSET_MIME_TYPES,
  CERTIFICATE_MAX_SIZE,
  CERTIFICATE_MIME_TYPES,
  FormOptions,
  KEY_MAX_SIZE,
  KEY_MIME_TYPES,
  VC_ISSUERS,
} from './form.options';
import { NgStyle } from '@angular/common';
import { SigningWebappFormUiFormGroup } from '@c2pa-mcnl/signing-webapp/form/ui/form-group';

@Component({
  standalone: true,
  selector: 'lib-signing-webapp-feature-signing-form',
  imports: [
    SigningWebappFormUiUploadFileInputComponent,
    FormField,
    NgStyle,
    SigningWebappFormUiFormGroup,
  ],
  templateUrl: './signing-webapp-form-feature-detail.component.html',
  providers: [SigningWebappFormFeatureDetailService],
})
export class SigningWebappFormFeatureDetailComponent {
  private readonly service = inject(SigningWebappFormFeatureDetailService);

  certificateMimeTypes = CERTIFICATE_MIME_TYPES;
  certificateMaxSize = CERTIFICATE_MAX_SIZE;
  keyMimeTypes = KEY_MIME_TYPES;
  keyMaxSize = KEY_MAX_SIZE;
  verifiableCredentialPrivateKeyMimeTypes = KEY_MIME_TYPES;
  verifiableCredentialPrivateKeyMaxSize = KEY_MAX_SIZE;
  verifiableCredentialIssuers = VC_ISSUERS;
  assetMimeTypes = ASSET_MIME_TYPES;
  assetMaxSize = ASSET_MAX_SIZE;

  signingModel = FormModel;
  signingForm = signalForm(this.signingModel, FormOptions);

  canVcBeGenerated = computed(() => {
    return (
      this.signingForm.verifiableCredentialIssuer().dirty() &&
      this.signingForm.verifiableCredentialIssuer().valid() &&
      this.signingForm.verifiableCredentialPrivateKey().dirty() &&
      this.signingForm.verifiableCredentialPrivateKey().valid()
    );
  });

  constructor() {
    effect(() => this.generateVerifiableCredential());

    effect(() => {
      console.debug('form changed: ', this.signingModel());
      console.debug('form valid: ', this.signingForm().valid());
    });
  }

  async createAndSignManifest() {
    const model = this.signingModel();

    const file = await this.service.createManifest({
      assetFile: model.assetFile!,
      leafCertificateFile: model.leafCertificate!,
      leafCertificateKeyFile: model.leafPrivateKey!,
      intermediateCertificate: model.intermediateCertificate!,
    });

    // Trigger file download
    const blob = new Blob([new Uint8Array(file)], {
      type: 'application/octet-stream',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signed_manifest.jpeg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private generateVerifiableCredential(): void {
    if (this.canVcBeGenerated()) {
      const vcIssuer = this.verifiableCredentialIssuers.find(
        (i) => i.did === this.signingModel().verifiableCredentialIssuer,
      );
      const vcKey = this.signingModel().verifiableCredentialPrivateKey;

      if (!vcIssuer || !vcKey) {
        console.error('VC Issuer or Private Key is missing or invalid');
        return;
      }

      void this.service
        .generateVerifiableCredential(vcIssuer, vcKey)
        .catch((error) => {
          console.error('Failed to generate verifiable credential', error);
        });
    }
  }
}
