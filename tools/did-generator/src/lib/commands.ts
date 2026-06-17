import fs from 'node:fs';
import { Command } from 'commander';
import { displayFinalSummary } from './display';
import { collectCredentialData } from './credential-data-collector';
import { issueCredential } from './credential-issuer';
import { createDIDDocument } from './did-generator';
import { generateKeys } from './key-generator';
import {
  createOutputDirectory as createOutputDir,
  createReadlineInterface,
  header,
  log,
  question,
} from '@c2pa-mcnl/shared/utils/cli';

function createOutputDirectory(customPath: string) {
  return createOutputDir('did-generator', customPath);
}

export async function generateCommand(options: Record<string, any>) {
  const rl =
    options['interactive'] !== false ? createReadlineInterface() : undefined;

  try {
    console.clear();
    log(
      '╔════════════════════════════════════════════════════════════╗',
      'bright',
    );
    log(
      '║     Verifiable Credentials Issuer CLI Tool (did-jwt-vc)   ║',
      'bright',
    );
    log(
      '║        Create Keys, DID, and Issue Employment VCs          ║',
      'bright',
    );
    log(
      '╚════════════════════════════════════════════════════════════╝',
      'bright',
    );

    // Setup
    const outputDir = createOutputDirectory(options['output']);
    log(`\n📁 Output directory: ${outputDir}\n`, 'cyan');

    // Get domain
    log(
      '═══════════════════════════════════════════════════════════',
      'bright',
    );

    let domain = options['domain'];
    if (!domain && rl) {
      domain = await question(
        rl,
        'Enter your domain (e.g., yourcompany.com or localhost:3000): ',
      );
    }

    if (!domain) {
      log(
        '❌ Domain is required! Use --domain flag or run in interactive mode.',
        'red',
      );
      if (rl) rl.close();
      return;
    }

    const { jwk, privateKeyHex } = generateKeys(outputDir);

    const { did } = createDIDDocument(domain, jwk, outputDir);

    log(
      '\n═══════════════════════════════════════════════════════════',
      'bright',
    );
    log("Now let's create an employment credential", 'cyan');
    log(
      '═══════════════════════════════════════════════════════════\n',
      'bright',
    );

    const credentialData = await collectCredentialData(rl, options);

    await issueCredential(did, credentialData, privateKeyHex, outputDir);

    header('✅ Complete!');
    displayFinalSummary(domain, outputDir);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('\n❌ Error: ' + errorMessage, 'red');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (rl) rl.close();
  }
}

export async function keysCommand(options: Record<string, any>) {
  const rl =
    options['interactive'] !== false ? createReadlineInterface() : null;

  try {
    console.clear();
    header('Generate Keys Only');

    let outputPath = options['output'];
    if (!outputPath && rl) {
      const useCustomPath = await question(
        rl,
        'Use custom output directory? (y/N): ',
      );
      if (useCustomPath.toLowerCase() === 'y') {
        outputPath = await question(rl, 'Enter output directory path: ');
      }
    }

    const outputDir = createOutputDirectory(outputPath);
    generateKeys(outputDir);

    log('\n✅ Keys generated successfully!', 'green');
    log(`📁 Output directory: ${outputDir}`, 'cyan');
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    log(`❌ Error: ${error.message}`, 'red');
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (rl) rl.close();
  }
}

export async function didCommand(options: Record<string, any>) {
  const rl =
    options['interactive'] !== false ? createReadlineInterface() : undefined;

  try {
    console.clear();
    header('Generate DID Document');

    let domain = options['domain'];
    let keyFile = options['keyFile'];

    // Interactive prompts for missing values
    if (rl) {
      if (!domain) {
        domain = await question(
          rl,
          'Enter your domain (e.g., yourcompany.com or localhost:3000): ',
        );
      }
      if (!keyFile) {
        keyFile = await question(rl, 'Enter path to public-key.jwk file: ');
      }
    }

    // Validate required inputs
    if (!domain) {
      log(
        '❌ Domain is required! Use --domain flag or run in interactive mode.',
        'red',
      );
      if (rl) rl.close();
      return;
    }

    if (!keyFile) {
      log(
        '❌ Key file is required! Use --key-file flag or run in interactive mode.',
        'red',
      );
      if (rl) rl.close();
      return;
    }

    let outputPath = options['output'];
    if (!outputPath && rl) {
      const useCustomPath = await question(
        rl,
        'Use custom output directory? (y/N): ',
      );
      if (useCustomPath.toLowerCase() === 'y') {
        outputPath = await question(rl, 'Enter output directory path: ');
      }
    }

    const outputDir = createOutputDirectory(outputPath);
    const jwk = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
    createDIDDocument(domain, jwk, outputDir);

    log('\n✅ DID document generated successfully!', 'green');
    log(`📁 Output directory: ${outputDir}`, 'cyan');
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    log(`❌ Error: ${error.message}`, 'red');
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (rl) rl.close();
  }
}

export async function credentialCommand(options: Record<string, any>) {
  const rl =
    options['interactive'] !== false ? createReadlineInterface() : undefined;

  try {
    console.clear();
    header('Issue Employment Credential');

    let did = options['did'];
    let keyFile = options['keyFile'];

    // Interactive prompts for missing values
    if (rl) {
      if (!did) {
        did = await question(
          rl,
          'Enter issuer DID (e.g., did:web:example.com): ',
        );
      }
      if (!keyFile) {
        keyFile = await question(rl, 'Enter path to private-key.hex file: ');
      }
    }

    // Validate required inputs
    if (!did) {
      log(
        '❌ Issuer DID is required! Use --did flag or run in interactive mode.',
        'red',
      );
      if (rl) rl.close();
      return;
    }

    if (!keyFile) {
      log(
        '❌ Key file is required! Use --key-file flag or run in interactive mode.',
        'red',
      );
      if (rl) rl.close();
      return;
    }

    let outputPath = options['output'];
    if (!outputPath && rl) {
      const useCustomPath = await question(
        rl,
        'Use custom output directory? (y/N): ',
      );
      if (useCustomPath.toLowerCase() === 'y') {
        outputPath = await question(rl, 'Enter output directory path: ');
      }
    }

    log(''); // Add spacing before credential data collection

    const outputDir = createOutputDirectory(outputPath);
    const privateKeyHex = fs.readFileSync(keyFile, 'utf8').trim();
    const credentialData = await collectCredentialData(rl, options);

    await issueCredential(did, credentialData, privateKeyHex, outputDir);

    log('\n✅ Credential issued successfully!', 'green');
    log(`📁 Output directory: ${outputDir}`, 'cyan');
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    log(`❌ Error: ${error.message}`, 'red');
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (rl) rl.close();
  }
}

// Setup Commander CLI
export function setupCLI() {
  const program = new Command();

  program
    .name('main.js')
    .description(
      'DID Generator & Verifiable Credentials Issuer CLI Tool - Create DIDs and issue employment credentials',
    )
    .version('1.0.0');

  // Main command - generate everything
  program
    .command('generate')
    .description(
      'Generate keys, DID document, and issue an employment credential (interactive by default)',
    )
    .option(
      '-d, --domain <domain>',
      'Domain for the DID (e.g., yourcompany.com or localhost:3000)',
    )
    .option('-o, --output <directory>', 'Output directory for generated files')
    .option('-n, --name <name>', 'Employee name')
    .option('-r, --role <role>', 'Employee role/job title')
    .option('--department <department>', 'Employee department')
    .option('-e, --employee-id <id>', 'Employee ID')
    .option('-c, --company <company>', 'Company name')
    .option('-s, --start-date <date>', 'Start date (YYYY-MM-DD)')
    .option(
      '--subject-did <did>',
      'Subject DID (optional, auto-generated if not provided)',
    )
    .option(
      '--no-interactive',
      'Run in non-interactive mode (all options must be provided)',
    )
    .action(generateCommand);

  // Keys only command
  program
    .command('keys')
    .description('Generate only cryptographic keys (Ed25519)')
    .option('-o, --output <directory>', 'Output directory for generated files')
    .option('--no-interactive', 'Run in non-interactive mode')
    .action(keysCommand);

  // DID only command
  program
    .command('did')
    .description(
      'Generate DID document from existing keys (interactive by default)',
    )
    .option('-d, --domain <domain>', 'Domain for the DID')
    .option('-k, --key-file <file>', 'Path to public-key.jwk file')
    .option('-o, --output <directory>', 'Output directory for DID document')
    .option('--no-interactive', 'Run in non-interactive mode')
    .action(didCommand);

  // Credential only command
  program
    .command('credential')
    .description(
      'Issue a credential using existing DID and keys (interactive by default)',
    )
    .option('--did <did>', 'Issuer DID')
    .option('--key-file <file>', 'Path to private-key.hex file')
    .option('-o, --output <directory>', 'Output directory for credential')
    .option('-n, --name <name>', 'Employee name')
    .option('-r, --role <role>', 'Employee role/job title')
    .option('--department <department>', 'Employee department')
    .option('-e, --employee-id <id>', 'Employee ID')
    .option('-c, --company <company>', 'Company name')
    .option('-s, --start-date <date>', 'Start date (YYYY-MM-DD)')
    .option('--subject-did <did>', 'Subject DID (optional)')
    .option('--no-interactive', 'Run in non-interactive mode')
    .action(credentialCommand);

  return program;
}
