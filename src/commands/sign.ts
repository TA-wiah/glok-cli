import path from 'path';
import { logger } from '../utils/logger.js';
import { readJson, writeFile, fileExists } from '../utils/fs.js';
import { keysExist, generateKeyPair, loadKeyPair, getPublicKeyPath } from '../services/keyManager.js';
import { signFile } from '../services/signer.js';
import { Manifest, PACKAGE_EXTENSION, resolvePlatforms } from '../utils/types.js';

interface SignOptions {
  package?: string;
  regenerate?: boolean;
}

export async function signCommand(options: SignOptions): Promise<void> {
  logger.header('Glok CLI — Sign Package');

  // Key management
  if (!keysExist() || options.regenerate) {
    if (options.regenerate && keysExist()) {
      logger.warn('Regenerating key pair. The old keys will be overwritten.');
    } else {
      logger.info('No key pair found. Generating new Ed25519 key pair...');
    }
    const { publicKeyB64 } = generateKeyPair();
    logger.success('Key pair generated.');
    logger.info(`Public key:  ${getPublicKeyPath()}`);
    logger.info(`Public key value (share with Glok Store):`);
    logger.blank();
    console.log(publicKeyB64);
    logger.blank();
  } else {
    logger.info('Using existing key pair from ~/.glok/keys/');
  }

  // Determine which file to sign
  const projectDir = process.cwd();
  let targetFile: string;

  if (options.package) {
    targetFile = path.resolve(options.package);
  } else {
    // Auto-detect package file
    const manifestPath = path.join(projectDir, 'manifest.json');
    if (!fileExists(manifestPath)) {
      logger.error('manifest.json not found. Run `glok init` first, or specify --package <file>.');
      process.exit(1);
    }
    const manifest = readJson<Partial<Manifest>>(manifestPath);
    const platform = resolvePlatforms(manifest)[0];
    const ext = PACKAGE_EXTENSION[platform];
    const safeName = (manifest.name ?? 'app').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
    const version = manifest.version ?? '1.0.0';
    targetFile = path.join(projectDir, `${safeName}-${version}${ext}`);
  }

  if (!fileExists(targetFile)) {
    // If no package file yet, sign the raw dist/ bundle by signing manifest as a proxy
    // and write a detached signature for the packager to include
    logger.warn(`Package file not found at: ${targetFile}`);
    logger.info('Signing manifest.json as a pre-package signature...');

    const manifestPath = path.join(projectDir, 'manifest.json');
    if (!fileExists(manifestPath)) {
      logger.error('manifest.json not found.');
      process.exit(1);
    }

    const keyPair = loadKeyPair();
    const sigB64 = signFile(manifestPath, keyPair.secretKey);
    const sigPath = path.join(projectDir, 'signature.sig');
    writeFile(sigPath, sigB64);
    logger.success(`Signature written to: ${sigPath}`);
    logger.info('Run `glok package` to bundle the signature into your package.');
    logger.blank();
    return;
  }

  logger.step('SIGN', `Signing ${path.basename(targetFile)}...`);
  const keyPair = loadKeyPair();
  const sigB64 = signFile(targetFile, keyPair.secretKey);

  // Write detached signature alongside the package
  const sigPath = `${targetFile}.sig`;
  writeFile(sigPath, sigB64);

  logger.blank();
  logger.success(`Package signed.`);
  logger.info(`Signature file: ${sigPath}`);
  logger.info('Run `glok verify` to confirm the signature is valid.');
  logger.blank();
}
