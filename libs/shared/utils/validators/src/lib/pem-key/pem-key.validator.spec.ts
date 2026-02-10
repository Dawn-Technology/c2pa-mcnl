import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { form } from '@angular/forms/signals';
import { pemKeyValidator } from './pem-key.validator';
import { Crypto } from '@peculiar/webcrypto';

// Polyfill global crypto with WebCrypto instance
Object.defineProperty(globalThis, 'crypto', {
  value: new Crypto(),
  writable: true,
  configurable: true,
});

// Helper to create a File with working text() method for Node.js
function createTestFile(content: string, name: string, type: string): File {
  const blob = new Blob([content], { type });
  const file = new File([blob], name, { type });

  // Ensure text() method works in Node environment
  if (!file.text) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (file as any).text = () => Promise.resolve(content);
  }

  return file;
}

describe('pemKeyValidator', () => {
  let keyModel: ReturnType<typeof signal<{ key: File | null }>>;
  let keyForm: ReturnType<typeof form<{ key: File | null }>>;

  beforeEach(() => {
    TestBed.configureTestingModule({});

    TestBed.runInInjectionContext(() => {
      keyModel = signal<{ key: File | null }>({
        key: null,
      });

      keyForm = form(keyModel, (schemaPath) => {
        pemKeyValidator(schemaPath.key);
      });
    });
  });

  async function flushAsync() {
    await TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await TestBed.tick();
  }

  it('should return no errors for empty value', async () => {
    keyModel.set({ key: null });
    await flushAsync();

    expect(keyForm.key().errors()).toEqual([]);
  });

  it('should return error for non-file value', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keyModel.set({ key: 'not a file' as any });
    await flushAsync();

    expect(keyForm.key().errors()).toContainEqual(
      expect.objectContaining({ kind: 'pemKey' }),
    );
  });

  it('should return error for invalid PEM key', async () => {
    const invalidFile = createTestFile(
      'invalid content',
      'key.pem',
      'text/plain',
    );
    keyModel.set({ key: invalidFile });
    await flushAsync();

    expect(keyForm.key().errors()).toContainEqual(
      expect.objectContaining({
        kind: 'pemKey',
        message:
          'Must be a valid PKCS#8 PEM-encoded ECDSA private key using P-256 curve with signing capability',
      }),
    );
  });

  it('should return error for key with wrong curve', async () => {
    // Generate a key with P-384 instead of P-256
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-384',
      },
      true,
      ['sign'],
    );

    const exportedKey = await crypto.subtle.exportKey(
      'pkcs8',
      keyPair.privateKey,
    );
    const base64 = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
    const pem =
      '-----BEGIN PRIVATE KEY-----\n' +
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      base64.match(/.{1,64}/g)!.join('\n') +
      '\n-----END PRIVATE KEY-----';

    const invalidFile = createTestFile(
      pem,
      'key.pem',
      'application/x-pem-file',
    );
    keyModel.set({ key: invalidFile });
    await flushAsync();

    expect(keyForm.key().errors()).toContainEqual(
      expect.objectContaining({
        kind: 'pemKey',
        message:
          'Must be a valid PKCS#8 PEM-encoded ECDSA private key using P-256 curve with signing capability',
      }),
    );
  });

  // not checked by the WebCrypto polyfill
  // it('should return error for key without signing capability', async () => {
  //   // Generate a key with 'verify' instead of 'sign' capability
  //   const keyPair = await crypto.subtle.generateKey(
  //     {
  //       name: 'ECDSA',
  //       namedCurve: 'P-256',
  //     },
  //     true,
  //     ['verify'],
  //   );
  //
  //   const exportedKey = await crypto.subtle.exportKey(
  //     'pkcs8',
  //     keyPair.privateKey,
  //   );
  //   const base64 = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
  //   const pem =
  //     '-----BEGIN PRIVATE KEY-----\n' +
  //     base64.match(/.{1,64}/g)!.join('\n') +
  //     '\n-----END PRIVATE KEY-----';
  //
  //   const invalidFile = createTestFile(
  //     pem,
  //     'key.pem',
  //     'application/x-pem-file',
  //   );
  //   keyModel.set({ key: invalidFile });
  //   await flushAsync();
  //
  //   expect(keyForm.key().errors()).toContainEqual(
  //     expect.objectContaining({
  //       kind: 'pemKey',
  //       message:
  //         'Must be a valid PKCS#8 PEM-encoded ECDSA private key using P-256 curve with signing capability',
  //     }),
  //   );
  // });

  it('should return no errors for valid PEM private key', async () => {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true,
      ['sign'],
    );

    const exportedKey = await crypto.subtle.exportKey(
      'pkcs8',
      keyPair.privateKey,
    );
    const base64 = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
    const pem =
      '-----BEGIN PRIVATE KEY-----\n' +
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      base64.match(/.{1,64}/g)!.join('\n') +
      '\n-----END PRIVATE KEY-----';

    const validFile = createTestFile(pem, 'key.pem', 'application/x-pem-file');
    keyModel.set({ key: validFile });
    await flushAsync();

    expect(keyForm.key().errors()).toEqual([]);
  });
});
