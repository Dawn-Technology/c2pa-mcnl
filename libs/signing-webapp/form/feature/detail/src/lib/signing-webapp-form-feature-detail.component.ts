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
import * as cbor from 'cbor-x';
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
    effect(() => {
      if (
        this.signingForm.verifiableCredentialIssuer().dirty() &&
        this.signingForm.verifiableCredentialIssuer().valid() &&
        this.signingForm.verifiableCredentialPrivateKey().dirty() &&
        this.signingForm.verifiableCredentialPrivateKey().valid()
      ) {
        void this.generateVerifiableCredential().catch((error) => {
          console.error('Failed to generate verifiable credential', error);
        });
      }
    });

    effect(() => {
      console.debug('form changed: ', this.signingModel());
      console.debug('form valid: ', this.signingForm().valid());
    });
  }

  private async generateCoseSign1(
    payload: Uint8Array,
    privateKey: CryptoKey,
    kid: string,
  ): Promise<Uint8Array> {
    // COSE_Sign1 structure: [protected, unprotected, payload, signature]

    // Protected header: { alg: ES256 (-7) }
    const protectedHeader = new Map<number, number>();
    protectedHeader.set(1, -7); // alg: ES256
    const protectedHeaderBytes = cbor.encode(
      Object.fromEntries(protectedHeader),
    );

    // Unprotected header: { kid }
    const kidBytes = new TextEncoder().encode(kid);
    const unprotectedHeader = new Map<number, Uint8Array>();
    unprotectedHeader.set(4, kidBytes); // kid as CBOR bstr

    // Sig_structure for signing: ["Signature1", protected, external_aad, payload]
    const sigStructure = [
      'Signature1',
      protectedHeaderBytes,
      new Uint8Array(0), // external_aad (empty)
      payload,
    ];
    const toBeSigned = cbor.encode(sigStructure);

    // Sign with ECDSA
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      privateKey,
      toBeSigned,
    );

    // Build COSE_Sign1: tag 18 + [protected, unprotected, payload, signature]
    const coseSign1Array = [
      protectedHeaderBytes,
      unprotectedHeader,
      payload,
      new Uint8Array(signature),
    ];

    // Encode with CBOR tag 18 (COSE_Sign1)
    return new cbor.Encoder({ tagUint8Array: false }).encode(
      new cbor.Tag(coseSign1Array, 18),
    );
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
      false,
      ['sign'],
    );

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

    const vcPayload = new TextEncoder().encode(JSON.stringify(vcJson));
    const coseSign1 = await this.generateCoseSign1(
      vcPayload,
      privateKey,
      vcIssuer.did,
    );

    console.debug('Generated VC JSON:', vcJson);
    console.log('Generated VC (COSE_Sign1):', coseSign1);
  }
}
