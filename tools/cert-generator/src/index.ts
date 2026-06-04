/**
 * Certificate Generator CLI - Entry Point
 *
 * This is the main entry point for the CLI tool that generates X.509 certificates.
 * It can generate complete certificate chains (root + intermediate + leaf) or
 * individual certificates. The actual implementation is modularized in the ./lib directory.
 */

// Use the polyfill core-js/full/reflect
import 'core-js/full/reflect';

import { setupCLI } from './lib/commands';
import {
  generateCertificateChain,
  generateIntermediateCertificate,
  generateLeafCertificate,
  generateRootCertificate,
  importCertificateFromPem,
  importPrivateKeyFromPem,
} from './lib/cert-generator';

// Run the CLI when executed directly
if (require.main === module) {
  const program = setupCLI();
  program.parse(process.argv);
}

// Export core functions for programmatic use
export {
  generateRootCertificate,
  generateIntermediateCertificate,
  generateLeafCertificate,
  generateCertificateChain,
  importPrivateKeyFromPem,
  importCertificateFromPem,
};

// Also export types
export type {
  CertificateSubject,
  RootCertificateResult,
  IntermediateCertificateResult,
  LeafCertificateResult,
} from './lib/cert-generator';
