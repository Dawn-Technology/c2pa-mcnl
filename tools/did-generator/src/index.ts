/**
 * DID Generator & VC Issuer CLI - Entry Point
 *
 * This is the main entry point for the CLI tool that generates DIDs
 * and issues verifiable credentials. The actual implementation is
 * modularized in the ./lib directory.
 */

// Use the polyfill core-js/full/reflect
import 'core-js/full/reflect';

import { setupCLI } from './lib/commands';
import { generateKeys } from './lib/key-generator';
import { createDIDDocument } from './lib/did-generator';
import { issueCredential } from './lib/credential-issuer';

// Run the CLI when executed directly
if (require.main === module) {
  const program = setupCLI();
  program.parse(process.argv);
}

// Export core functions for programmatic use
export { generateKeys, createDIDDocument, issueCredential };
