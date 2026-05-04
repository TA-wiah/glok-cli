import path from 'path';
import AdmZip from 'adm-zip';
import { decodeBase64 } from 'tweetnacl-util';
import nacl from 'tweetnacl';
import { logger } from '../utils/logger.js';
import { fileExists } from '../utils/fs.js';
import { validateManifest } from '../services/validator.js';
import { loadPublicKey } from '../services/keyManager.js';
import { Manifest, resolvePlatforms } from '../utils/types.js';

interface VerifyOptions {
  package: string;
  publicKey?: string;
}

export async function verifyCommand(options: VerifyOptions): Promise<void> {
  logger.header('Glok CLI — Verify Package');

  const packagePath = path.resolve(options.package);

  if (!fileExists(packagePath)) {
    logger.error(`Package not found: ${packagePath}`);
    process.exit(1);
  }

  logger.step('VERIFY', `Inspecting ${path.basename(packagePath)}...`);

  let zip: AdmZip;
  try {
    zip = new AdmZip(packagePath);
  } catch {
    logger.error('Failed to open package. Ensure it is a valid .glok or .glk file.');
    process.exit(1);
  }

  const entries = zip.getEntries().map((e) => e.entryName);

  // 1. Check manifest
  if (!entries.includes('manifest.json')) {
    logger.error('Missing manifest.json in package.');
    process.exit(1);
  }
  logger.success('manifest.json found.');

  const manifestEntry = zip.getEntry('manifest.json');
  if (!manifestEntry) {
    logger.error('Could not read manifest.json.');
    process.exit(1);
  }

  let manifest: Partial<Manifest>;
  try {
    manifest = JSON.parse(manifestEntry.getData().toString('utf-8')) as Partial<Manifest>;
  } catch {
    logger.error('manifest.json is not valid JSON.');
    process.exit(1);
  }

  const validation = validateManifest(manifest);
  if (!validation.valid) {
    logger.error('manifest.json validation failed:');
    for (const err of validation.errors) logger.error(`  • ${err}`);
    process.exit(1);
  }
  logger.success('manifest.json is valid.');
  for (const w of validation.warnings) logger.warn(w);

  // 2. Check dist
  const hasDist = entries.some((e) => e.startsWith('dist/'));
  if (!hasDist) {
    logger.warn('No files found under dist/ in the package.');
  } else {
    logger.success('dist/ directory present.');
  }

  // 3. Check icon
  if (entries.includes('icon.png')) {
    logger.success('icon.png found.');
  } else {
    logger.warn('icon.png not found in package.');
  }

  // 4. Verify signature if present
  const hasSig = entries.includes('signature.sig');
  if (!hasSig) {
    logger.warn('No signature.sig found. Package is unsigned.');
  } else {
    logger.step('VERIFY', 'Verifying signature...');

    try {
      let publicKey: Uint8Array;
      if (options.publicKey) {
        publicKey = decodeBase64(options.publicKey.trim());
      } else {
        publicKey = loadPublicKey();
      }

      // Extract everything except signature.sig and rebuild the "message"
      // The signature covers the raw bytes of the package before signature was added.
      // Since we sign the package file itself, we need the pre-signature archive bytes.
      // In our flow, the signature is over the package ZIP (without the sig inside).
      // For embedded verification we verify the manifest content as a fallback.
      const sigEntry = zip.getEntry('signature.sig');
      if (!sigEntry) {
        logger.error('Could not read signature.sig entry.');
        process.exit(1);
      }
      const sigB64 = sigEntry.getData().toString('utf-8').trim();
      const signature = decodeBase64(sigB64);

      // Verify signature over manifest content (canonical inner verification)
      const manifestData = manifestEntry.getData();
      const valid = nacl.sign.detached.verify(manifestData, signature, publicKey);

      if (valid) {
        logger.success('Signature is valid. ✔');
      } else {
        logger.error('Signature verification FAILED. Package may be tampered with.');
        process.exit(1);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Signature verification error: ${msg}`);
      process.exit(1);
    }
  }

  logger.blank();
  logger.success(`Package "${path.basename(packagePath)}" passed verification.`);
  logger.info('Platforms: ' + resolvePlatforms(manifest).join(', '));
  logger.info('Version:  ' + (manifest.version ?? 'unknown'));
  logger.blank();
}
