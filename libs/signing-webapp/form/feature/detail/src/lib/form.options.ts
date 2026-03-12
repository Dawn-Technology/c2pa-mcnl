import { required, SchemaOrSchemaFn } from '@angular/forms/signals';
import {
  fileMimeTypeValidator,
  fileSizeValidator,
  pemCertificateValidator,
  pemKeyValidator,
} from '@c2pa-mcnl/shared/utils/validators';
import {
  ASSET_MAX_SIZE,
  ASSET_MIME_TYPES,
  MIME_TYPES,
} from '@c2pa-mcnl/shared/utils/constants';
import { FormData, VerifiableCredentialIssuer } from './form.model';
import { ActionType } from '@dockbite/c2pa-ts/manifest';

export interface ActionOption {
  label: string;
  description: string;
  value: ActionType;
  disabled?: boolean;
}

export const ACTION_OPTIONS: ActionOption[] = [
  {
    label: 'Geopend',
    description: 'Het bestand werd geopend',
    value: ActionType.C2paOpened,
    disabled: true,
  },
  {
    label: 'Bewerkt',
    description: 'Het bestand werd gewijzigd of bewerkt',
    value: ActionType.C2paEdited,
  },
  {
    label: 'Bijgesneden',
    description: 'Het bestand werd bijgesneden tot een ander kader of gebied',
    value: ActionType.C2paCropped,
  },
  {
    label: 'Gefilterd',
    description: 'Een visueel filter of effect werd toegepast op het bestand',
    value: ActionType.C2paFiltered,
  },
  {
    label: 'Kleuraanpassingen',
    description:
      'Kleur-, helderheids-, contrast- of toonaanpassingen werden aangebracht',
    value: ActionType.C2paColorAdjustments,
  },
  {
    label: 'Vergroot/verkleind',
    description: 'Het bestand werd geschaald of van formaat gewijzigd',
    value: ActionType.C2paResized,
  },
  {
    label: 'Geconverteerd',
    description:
      'Het bestand werd geconverteerd naar een ander bestandsformaat',
    value: ActionType.C2paConverted,
  },
  {
    label: 'Gepubliceerd',
    description: 'Het bestand werd gepubliceerd of verspreid',
    value: ActionType.C2paPublished,
  },
  {
    label: 'Watermerk toegevoegd',
    description:
      'Een zichtbaar of onzichtbaar watermerk werd toegepast op het bestand',
    value: ActionType.C2paWatermarked,
  },
];

export const CERTIFICATE_MIME_TYPES = [
  MIME_TYPES.APPLICATION_X_X509_CA_CERT,
  MIME_TYPES.APPLICATION_X_PEM_FILE,
];

export const KEY_MIME_TYPES = [
  ...CERTIFICATE_MIME_TYPES,
  MIME_TYPES.APPLICATION_PKCS8,
  MIME_TYPES.APPLICATION_X_PKCS8,
  MIME_TYPES.TEXT_PLAIN,
];

export const CERTIFICATE_MAX_SIZE = 5 * 1024 * 1024;
export const KEY_MAX_SIZE = 5 * 1024 * 1024;

export const VC_ISSUERS: VerifiableCredentialIssuer[] = [
  {
    name: 'VPRO',
    did: 'did:web:verifieermij.nl:vpro',
    site: 'https://verifieermij.nl',
  },
  {
    name: 'Media Campus Nederland',
    did: 'did:web:verifieermij.nl:mcnl',
    site: 'https://verifieermij.nl',
  },
  {
    name: 'Dawn Technology',
    did: 'did:web:verifieermij.nl:dawn-technology',
    site: 'https://verifieermij.nl',
  },
];

export const FormOptions: SchemaOrSchemaFn<FormData> = (schemaPath) => {
  /**
   * `leafCertificate` Validations
   */
  required(schemaPath.leafCertificate);
  pemCertificateValidator(schemaPath.leafCertificate);
  fileSizeValidator(schemaPath.leafCertificate, {
    maxSize: CERTIFICATE_MAX_SIZE,
  });
  fileMimeTypeValidator(schemaPath.leafCertificate, CERTIFICATE_MIME_TYPES);

  /**
   * `leafPrivateKey` Validations
   */
  required(schemaPath.leafPrivateKey);
  fileSizeValidator(schemaPath.leafPrivateKey, {
    maxSize: KEY_MAX_SIZE,
  });
  fileMimeTypeValidator(schemaPath.leafPrivateKey, KEY_MIME_TYPES);
  pemKeyValidator(schemaPath.leafPrivateKey);

  /**
   * `intermediateCertificate` Validations
   */
  required(schemaPath.intermediateCertificate);
  pemCertificateValidator(schemaPath.intermediateCertificate);
  fileSizeValidator(schemaPath.intermediateCertificate, {
    maxSize: CERTIFICATE_MAX_SIZE,
  });
  fileMimeTypeValidator(
    schemaPath.intermediateCertificate,
    CERTIFICATE_MIME_TYPES,
  );

  /**
   * `verifiableCredentialIssuer` Validations
   */
  required(schemaPath.verifiableCredentialIssuer, {
    when: ({ valueOf }) => !!valueOf(schemaPath.verifiableCredentialPrivateKey),
  });

  /**
   * `verifiableCredentialPrivateKey` Validations
   */
  required(schemaPath.verifiableCredentialPrivateKey, {
    when: ({ valueOf }) => !!valueOf(schemaPath.verifiableCredentialIssuer),
  });
  fileSizeValidator(schemaPath.verifiableCredentialPrivateKey, {
    maxSize: KEY_MAX_SIZE,
  });
  fileMimeTypeValidator(
    schemaPath.verifiableCredentialPrivateKey,
    KEY_MIME_TYPES,
  );
  pemKeyValidator(schemaPath.verifiableCredentialPrivateKey);

  /**
   * `assetFile` Validations
   */
  required(schemaPath.assetFile);
  fileSizeValidator(schemaPath.assetFile, {
    maxSize: ASSET_MAX_SIZE,
  });
  fileMimeTypeValidator(schemaPath.assetFile, ASSET_MIME_TYPES);
};
