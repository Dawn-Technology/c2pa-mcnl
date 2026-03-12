import { signal } from '@angular/core';
import { ActionType } from '@dockbite/c2pa-ts/manifest';

export interface VerifiableCredentialIssuer {
  name: string;
  did: string;
  site: string;
}

export interface FormData {
  leafCertificate: File | null;
  leafPrivateKey: File | null;
  intermediateCertificate: File | null;

  verifiableCredentialIssuer: string;
  verifiableCredentialPrivateKey: File | null;

  assetFile: File | null;

  actionsToBeAdded: ActionType[];
}

export const FormModel = signal<FormData>({
  leafCertificate: null,
  leafPrivateKey: null,
  intermediateCertificate: null,

  verifiableCredentialIssuer: '',
  verifiableCredentialPrivateKey: null,

  assetFile: null,

  actionsToBeAdded: [ActionType.C2paOpened],
});
