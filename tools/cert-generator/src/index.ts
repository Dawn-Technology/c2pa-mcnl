/**
 * Certificate Generator CLI - Entry Point
 *
 * This is the main entry point for the CLI tool that generates X.509 certificates.
 * It can generate complete certificate chains (root + intermediate + leaf) or
 * individual certificates. The actual implementation is modularized in the ./lib directory.
 */

// polyfill for x509
// See: https://github.com/PeculiarVentures/x509#%EF%B8%8F-reflect-polyfill-required
import 'reflect-metadata';

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
const program = setupCLI();
program.parse(process.argv);

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
