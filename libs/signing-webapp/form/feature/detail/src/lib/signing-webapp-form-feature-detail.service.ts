import { Injectable } from '@angular/core';
import { extractBase64FromPem } from '@c2pa-mcnl/shared/utils/helpers';
import { addYears } from 'date-fns';
import * as cbor from 'cbor-x';
import { VerifiableCredentialIssuer } from './form.model';
import { JPEG } from '@dockbite/c2pa-ts/asset';
import {
  Action,
  ActionAssertion,
  ActionType,
  ClaimVersion,
  DataHashAssertion,
  DigitalSourceType,
  IngredientAssertion,
  Manifest,
  ManifestStore,
  RelationshipType,
  ThumbnailAssertion,
} from '@dockbite/c2pa-ts/manifest';
import * as x509 from '@peculiar/x509';
import { CoseAlgorithmIdentifier, LocalSigner } from '@dockbite/c2pa-ts/cose';
import { LocalTimestampProvider } from '@dockbite/c2pa-ts/rfc3161';
import { SuperBox } from '@dockbite/c2pa-ts/jumbf';
import * as exifr from 'exifr';

@Injectable()
export class SigningWebappFormFeatureDetailService {
  /**
   * TODO
   * - add CAWG Identity Assertion
   * - add chain certification
   * @param opts
   */
  async createManifest(opts: {
    assetFile: File;
    leafCertificateFile: File;
    leafCertificateKeyFile: File;
    intermediateCertificate: File;
  }) {
    if (!(await JPEG.canRead(opts.assetFile))) {
      throw new Error('Unsupported file type. Only JPEG is supported.');
    }

    let leafCertificate: x509.X509Certificate;
    try {
      const pem = await opts.leafCertificateFile.text();
      leafCertificate = new x509.X509Certificate(pem);
    } catch (err) {
      console.error(err);
      throw new Error(
        'Invalid certificate file. Please provide a valid PEM-encoded X.509 certificate.',
      );
    }

    let privateKey: Uint8Array;
    try {
      const base64 = extractBase64FromPem(
        await opts.leafCertificateKeyFile.text(),
      );
      privateKey = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    } catch (err) {
      console.error(err);
      throw new Error(
        'Invalid private key file. Please provide a valid PEM-encoded private key in PKCS#8 format.',
      );
    }

    const instanceID = crypto.randomUUID();

    const signer = new LocalSigner(
      privateKey,
      CoseAlgorithmIdentifier.ES256,
      leafCertificate,
      // [intermediate],
    );

    const timestampProvider = new LocalTimestampProvider(
      leafCertificate,
      privateKey,
    );

    const asset = await JPEG.create(opts.assetFile);

    const { instanceID: xmpInstanceId, documentID: xmpDocumentID } =
      await this.getXmpInstanceId(opts.assetFile);

    console.log('xmp instance id', xmpInstanceId);
    console.log('xmp document id', xmpDocumentID);

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
      assetFormat: 'image/jpeg',
      instanceID,
      defaultHashAlgorithm: 'SHA-256',
      signer,
    });

    const thumbnalClaimAssertion = ThumbnailAssertion.create(
      'jpeg',
      new Uint8Array(await opts.assetFile.arrayBuffer()),
      0,
    );
    manifest.addAssertion(thumbnalClaimAssertion);

    const thumbnalIngredientAssertion = ThumbnailAssertion.create(
      'jpeg',
      new Uint8Array(await opts.assetFile.arrayBuffer()),
      1,
    );
    manifest.addAssertion(thumbnalIngredientAssertion);

    const ingredientAssertion = IngredientAssertion.create(
      opts.assetFile.name,
      'image/jpeg',
      xmpInstanceId || `urn:uuid:${crypto.randomUUID()}`,
      xmpDocumentID,
    );
    ingredientAssertion.relationship = RelationshipType.ParentOf;
    ingredientAssertion.thumbnail = manifest.createHashedReference(
      `c2pa.assertions/c2pa.thumbnail.ingredient.jpeg`,
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
      digitalSourceType: DigitalSourceType.DigitalArt,
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

    const newFile = await asset.getDataRange();

    return newFile;
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
    const coseSign1 = await this.generateCoseSign1(
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

  /**
   * Generates a COSE_Sign1 structure by signing the given payload with the provided private key.
   *
   * COSE_Sign1 structure: [protected, unprotected, payload, signature]
   *
   * @param payload - The data to be signed (e.g., the VC JSON as bytes)
   * @param privateKey - The ECDSA P-256 private key for signing
   * @param kid - The key identifier (e.g., the issuer's DID) to include in the unprotected header
   */
  private async generateCoseSign1(
    payload: Uint8Array,
    privateKey: CryptoKey,
    kid: string,
  ): Promise<Uint8Array> {
    // Protected header: { alg: ES256 (-7) }
    const protectedHeader = new Map<number, number>();
    protectedHeader.set(1, -7); // alg: ES256
    const protectedHeaderBytes = cbor.encode(protectedHeader);

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
    const toBeSignedBuffer = cbor.encode(sigStructure);
    const toBeSigned: Uint8Array<ArrayBuffer> = new Uint8Array(
      new Uint8Array(toBeSignedBuffer).buffer,
    );

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

  async getXmpInstanceId(input: Parameters<typeof exifr.parse>[0]): Promise<{
    instanceID: string | undefined;
    documentID: string | undefined;
  }> {
    try {
      // Tell exifr to exclusively parse XMP data to keep it fast
      const metadata = await exifr.parse(input, {
        xmp: true,
        tiff: false,
        exif: false,
        icc: false,
      });

      return {
        instanceID: metadata?.InstanceID
          ? metadata?.InstanceID.replace('xmp.iid:', 'xmp:iid:')
          : undefined,
        documentID: metadata?.DocumentID
          ? metadata?.DocumentID.replace('xmp.did:', 'xmp:did:')
          : undefined,
      };
    } catch (error) {
      console.error('Error extracting metadata:', error);
      return { instanceID: undefined, documentID: undefined };
    }
  }
}
