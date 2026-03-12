import { Injectable } from '@angular/core';
import {
  createX509CertFromFile,
  extractBase64FromPem,
  extractDerFromFile,
  generateCoseSign1,
  getImageXmpIdentifiers,
} from '@c2pa-mcnl/shared/utils/helpers';
import { addYears } from 'date-fns';

import { VerifiableCredentialIssuer } from './form.model';
import { createAsset } from '@dockbite/c2pa-ts/asset';
import {
  Action,
  ActionAssertion,
  ActionType,
  ClaimVersion,
  DataHashAssertion,
  IngredientAssertion,
  Manifest,
  ManifestStore,
  RelationshipType,
  ThumbnailAssertion,
} from '@dockbite/c2pa-ts/manifest';
import { CoseAlgorithmIdentifier, LocalSigner } from '@dockbite/c2pa-ts/cose';
import { LocalTimestampProvider } from '@dockbite/c2pa-ts/rfc3161';
import { SuperBox } from '@dockbite/c2pa-ts/jumbf';
import { generateThumbnail } from '@c2pa-mcnl/verify-webapp/shared/utils/helpers';

@Injectable()
export class SigningWebappFormFeatureDetailService {
  /**
   * This method performs the following steps:
   * 1. Creates an Asset instance from the provided file.
   * 2. Reads the leaf certificate, private key, and intermediate certificate from the provided PEM files.
   * 3. Creates a LocalSigner using the leaf certificate and private key.
   * 4. Creates a LocalTimestampProvider for timestamping the signature. (TODO: this should probably be excluded for the POC)
   * 5. Loads the asset and extracts existing XMP metadata to retrieve instanceID and documentID if they exist.
   * 6. Checks if the asset already contains a C2PA manifest in a JUMBF box. If it does, it loads the existing manifest into a ManifestStore; otherwise, it creates a new ManifestStore.
   * 7. Creates a new Manifest with the appropriate claim version, asset format, instanceID, and signer.
   * 8. Adds assertions to the manifest:
   *   - A ThumbnailAssertion containing the original asset data as a thumbnail.
   *   - Another ThumbnailAssertion for the ingredient thumbnail.
   *   - An IngredientAssertion referencing the original asset and linking to the previous manifest if it exists.
   *   - An ActionAssertion indicating that the asset was opened, with a relationship to the ingredient assertion.
   *   - A DataHashAssertion to create a hard binding between the manifest and the asset.
   * 9. Ensures that there is enough space in the asset for the manifest JUMBF box.
   * 10. Updates the DataHashAssertion with the actual asset data to create the hard binding.
   * 11. Signs the manifest using the LocalSigner and LocalTimestampProvider.
   * 12. Writes the manifest JUMBF box back into the asset.
   * 13. Returns the modified asset data as a Uint8Array.
   *
   * @summary Builds a C2PA manifest with the provided certificates and asset, embeds it into the asset's JUMBF box, and returns the modified asset data.
   * @param opts.assetFile - The image file to which the C2PA manifest will be added
   * @param opts.leafCertificateFile - The PEM file containing the leaf X.509 certificate for signing
   * @param opts.leafCertificateKeyFile - The PEM file containing the private key corresponding to the leaf certificate
   * @param opts.intermediateCertificate - The PEM file containing the intermediate X.509 certificate (if applicable)
   * @returns A Uint8Array containing the modified asset data with the embedded C2PA manifest
   */
  async addC2paManifest(opts: {
    assetFile: File;
    leafCertificateFile: File;
    leafCertificateKeyFile: File;
    intermediateCertificate: File;
  }): Promise<Uint8Array> {
    const asset = await createAsset(opts.assetFile);

    const fileName = opts.assetFile.name;
    const fileType = opts.assetFile.type;
    const fileExtension = fileType.replace(/.*\//, '');

    const leafCertificate = await createX509CertFromFile(
      opts.leafCertificateFile,
    );
    const leafKeyDer = await extractDerFromFile(opts.leafCertificateKeyFile);
    const intermediateCertificate = await createX509CertFromFile(
      opts.intermediateCertificate,
    );

    const instanceID = crypto.randomUUID();

    const signer = new LocalSigner(
      leafKeyDer,
      CoseAlgorithmIdentifier.ES256,
      leafCertificate,
      [intermediateCertificate],
    );

    const timestampProvider = new LocalTimestampProvider(
      leafCertificate,
      leafKeyDer,
    );

    const { instanceID: xmpInstanceId, documentID: xmpDocumentID } =
      await getImageXmpIdentifiers(opts.assetFile);

    console.debug(
      'xmp instance id',
      xmpInstanceId,
      'xmp document id',
      xmpDocumentID,
    );

    const jumbfBytes = await asset.getManifestJUMBF(); // depends on asset class

    let manifestStore: ManifestStore;
    let previousManifest: Manifest | undefined;
    if (jumbfBytes) {
      console.log('got jumbf bytes', jumbfBytes);
      const superBox = SuperBox.fromBuffer(jumbfBytes);

      manifestStore = ManifestStore.read(superBox);
      previousManifest = manifestStore.getActiveManifest();

      console.log(
        'existing manifest found, loading it into the manifest store',
      );
    } else {
      console.log('no existing manifest found, creating a new manifest store');
      manifestStore = new ManifestStore();
    }

    const manifest: Manifest = manifestStore.createManifest({
      claimVersion: ClaimVersion.V2,
      assetFormat: fileType,
      instanceID,
      defaultHashAlgorithm: 'SHA-256',
      signer,
    });

    const thumbnail = await generateThumbnail(opts.assetFile, 250, 250);
    const thumbnailBytes = new Uint8Array(await thumbnail.arrayBuffer());

    manifest.addAssertion(
      ThumbnailAssertion.create(fileExtension, thumbnailBytes, 0),
    );
    manifest.addAssertion(
      ThumbnailAssertion.create(fileExtension, thumbnailBytes, 1),
    );

    const ingredientAssertion = IngredientAssertion.create(
      fileName,
      fileType,
      xmpInstanceId || `urn:uuid:${crypto.randomUUID()}`,
      xmpDocumentID,
    );
    ingredientAssertion.relationship = RelationshipType.ParentOf;
    ingredientAssertion.thumbnail = manifest.createHashedReference(
      `c2pa.assertions/c2pa.thumbnail.ingredient.${fileExtension}`,
    );

    if (previousManifest) {
      ingredientAssertion.instanceID = previousManifest.claim?.instanceID;
      ingredientAssertion.c2pa_manifest = manifest.createHashedReference(
        `/c2pa/${previousManifest.label}/c2pa.claim.v2`,
      );
    }

    manifest.addAssertion(ingredientAssertion);

    const actionAssertion = new ActionAssertion();
    const openedAction: Action = {
      action: ActionType.C2paOpened,
      instanceID,
      parameters: {
        ingredients: [
          manifest.createHashedReference(`c2pa.assertions/c2pa.ingredient`),
        ],
      },
    };

    actionAssertion.actions.push(openedAction);

    manifest.addAssertion(actionAssertion);

    const dataHashAssertion = DataHashAssertion.create('SHA-512');
    manifest.addAssertion(dataHashAssertion);

    // make space in the asset
    await asset.ensureManifestSpace(manifestStore.measureSize());

    // update the hard binding
    await dataHashAssertion.updateWithAsset(asset);

    // create the signature
    await manifest.sign(signer, timestampProvider);

    // write the JUMBF box to the asset
    await asset.writeManifestJUMBF(manifestStore.getBytes());

    return await asset.getDataRange();
  }

  /**
   * Generates a Verifiable Credential (VC) in COSE_Sign1 format.
   *
   * Creates an Identity Claims Aggregation Credential (ICAC) following the CAWG specification,
   * signs it using ECDSA P-256, and encodes it as a CBOR COSE_Sign1 structure.
   *
   * @param verifiableCredentialIssuer - The issuer information including DID, name, and site
   * @param verifiableCredentialPrivateKey - The private key file in PEM format (PKCS#8) for signing
   * @returns An object containing the VC JSON and the COSE_Sign1 encoded VC as a Uint8Array
   */
  async generateVerifiableCredential(
    verifiableCredentialIssuer: VerifiableCredentialIssuer,
    verifiableCredentialPrivateKey: File,
    // TODO ADD ASSET HASH
  ): Promise<{ vcJson: object; coseSign1: Uint8Array }> {
    const pemText = await verifiableCredentialPrivateKey.text();
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
      issuer: verifiableCredentialIssuer.did,
      issuanceDate: new Date().toISOString(),
      expirationDate: addYears(new Date(), 1).toISOString(),
      credentialSubject: {
        id: `${verifiableCredentialIssuer.did}:user:${crypto.randomUUID()}`,
        verifiedIdentities: [
          {
            type: 'cawg.affiliation',
            provider: {
              id: verifiableCredentialIssuer.site,
              name: verifiableCredentialIssuer.name,
            },
            verifiedAt: new Date().toISOString(),
          },
        ],
        c2paAsset: {
          sig_type: 'cawg.identity_claims_aggregation',
          referenced_assertions: [
            { url: 'self#jumbf=c2pa.assertions/c2pa.hash.data', hash: '...' },
          ],
        },
      },
    };

    const vcPayload = new TextEncoder().encode(JSON.stringify(vcJson));
    const coseSign1 = await generateCoseSign1(
      vcPayload,
      privateKey,
      verifiableCredentialIssuer.did,
    );

    console.debug('Generated VC JSON:', vcJson);
    console.log('Generated VC (COSE_Sign1):', coseSign1);

    return {
      vcJson,
      coseSign1,
    };
  }
}
