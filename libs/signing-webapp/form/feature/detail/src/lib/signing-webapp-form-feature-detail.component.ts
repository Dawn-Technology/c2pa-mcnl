import { Component, effect, inject } from '@angular/core';
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
import { extractBase64FromPem } from '@c2pa-mcnl/shared/utils/helpers';
import * as cose from 'cosette';
import { addYears } from 'date-fns';

@Component({
  standalone: true,
  selector: 'lib-signing-webapp-feature-signing-form',
  imports: [SigningWebappFormUiUploadFileInputComponent, FormField],
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

  constructor() {
    effect(async () => {
      if (
        this.signingForm.verifiableCredentialIssuer().dirty() &&
        this.signingForm.verifiableCredentialIssuer().valid() &&
        this.signingForm.verifiableCredentialPrivateKey().dirty() &&
        this.signingForm.verifiableCredentialPrivateKey().valid()
      ) {
        this.generateVerifiableCredential();
      }
    });

    effect(() => {
      console.debug('form changed: ', this.signingModel());
      console.debug('form valid: ', this.signingForm().valid());
    });
  }

  private async generateVerifiableCredential(): Promise<void> {
    const vcIssuer = this.verifiableCredentialIssuers.find(
      (i) => i.did === this.signingModel().verifiableCredentialIssuer,
    );
    const vcKey = this.signingModel().verifiableCredentialPrivateKey;

    if (!vcIssuer || !vcKey) {
      console.error('VC Issuer or Private Key is missing or invalid');
      return;
    }

    const pemText = await vcKey.text();
    const base64 = extractBase64FromPem(pemText);
    const derBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      derBytes,
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign'],
    );

    const headers = {
      p: { alg: 'ES256' },
      u: { kid: vcIssuer.did },
    };

    const signer = { key: privateKey };

    const vcJson = {
      '@context': [
        'https://www.w3.org/ns/credentials/v2',
        'https://cawg.io/identity/1.1/ica/context/',
      ],
      type: ['VerifiableCredential', 'IdentityClaimsAggregationCredential'],
      issuer: vcIssuer.did,
      issuanceDate: new Date().toISOString(),
      expirationDate: addYears(new Date(), 1).toISOString(),
      credentialSubject: {
        id: `${vcIssuer.did}:user:${Math.floor(Math.random() * 100) + 1}`,
        verifiedIdentities: [
          {
            type: 'cawg.affiliation',
            provider: {
              id: vcIssuer.site,
              name: vcIssuer.name,
            },
            verifiedAt: '2024-07-26T22:29:57Z',
          },
        ],
        c2paAsset: {
          sig_type: 'cawg.identity_claims_aggregation',
          referenced_assertions: [{ url: '...', hash: '...' }],
        },
      },
    };

    const coseSign1 = await cose.sign.create(
      headers,
      JSON.stringify(vcJson),
      signer,
    );

    console.debug('Generated VC JSON:', JSON.stringify(vcJson));
    console.log('Generated VC (COSE_Sign1):', coseSign1);
  }
}
