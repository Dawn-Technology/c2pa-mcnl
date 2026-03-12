import { Component, computed, effect, inject } from '@angular/core';
import { SigningWebappFormFeatureDetailService } from './signing-webapp-form-feature-detail.service';
import { form as signalForm, FormField } from '@angular/forms/signals';
import { SigningWebappFormUiUploadFileInputComponent } from '@c2pa-mcnl/signing-webapp/form/ui/upload-file-input';
import { FormModel } from './form.model';
import {
  ACTION_OPTIONS,
  CERTIFICATE_MAX_SIZE,
  CERTIFICATE_MIME_TYPES,
  FormOptions,
  KEY_MAX_SIZE,
  KEY_MIME_TYPES,
  VC_ISSUERS,
} from './form.options';
import { ActionType } from '@dockbite/c2pa-ts/manifest';
import { NgStyle } from '@angular/common';
import { SigningWebappFormUiFormGroup } from '@c2pa-mcnl/signing-webapp/form/ui/form-group';
import {
  ASSET_MAX_SIZE,
  ASSET_MIME_TYPES,
} from '@c2pa-mcnl/shared/utils/constants';

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
  actionOptions = ACTION_OPTIONS;

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

    if (!model.assetFile || !model.leafCertificate || !model.leafPrivateKey) {
      console.error('One or more required fields are missing');
      return;
    }

    const file = await this.service.createC2paManifest({
      assetFile: model.assetFile,
      leafCertificateFile: model.leafCertificate,
      leafCertificateKeyFile: model.leafPrivateKey,
      intermediateCertificate: model.intermediateCertificate,
      actions: model.actionsToBeAdded,
    });

    const blob = new Blob([new Uint8Array(file)], {
      type: model.assetFile.type || 'application/octet-stream',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = model.assetFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  isActionSelected(action: ActionType): boolean {
    return this.signingModel().actionsToBeAdded.includes(action);
  }

  toggleAction(action: ActionType): void {
    this.signingModel.update((model) => {
      const current = model.actionsToBeAdded;
      const updated = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action];
      return { ...model, actionsToBeAdded: updated };
    });
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
