import path from 'path';
import AdmZip from 'adm-zip';
import { logger } from '../utils/logger.js';
import { readJson, fileExists } from '../utils/fs.js';
import { getPublicKeyPath } from '../services/keyManager.js';
import { Manifest, PACKAGE_EXTENSION, resolvePlatforms } from '../utils/types.js';
import fs from 'fs';
import { encodeBase64 } from 'tweetnacl-util';

interface SubmitOptions {
  package?: string;
}

export async function submitCommand(options: SubmitOptions): Promise<void> {
  logger.header('Glok CLI — Submit (Preview)');

  const projectDir = process.cwd();
  const manifestPath = path.join(projectDir, 'manifest.json');

  if (!fileExists(manifestPath)) {
    logger.error('manifest.json not found. Run `glok init` first.');
    process.exit(1);
  }

  const manifest = readJson<Partial<Manifest>>(manifestPath);
  const platforms = resolvePlatforms(manifest);
  const platform = platforms[0];
  const ext = PACKAGE_EXTENSION[platform];
  const safeName = (manifest.name ?? 'app').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
  const version = manifest.version ?? '1.0.0';

  if (platforms.length > 1 && !options.package) {
    logger.warn(
      `Multiple platforms detected (${platforms.join(', ')}). ` +
      `Submitting the ${platform} package (${ext}). ` +
      `Use --package <file> to specify a different platform's package.`,
    );
  }

  const packagePath = path.resolve(options.package ?? path.join(projectDir, `${safeName}-${version}${ext}`));

  if (!fileExists(packagePath)) {
    logger.error(`Package not found: ${packagePath}`);
    logger.info('Run `glok package` first.');
    process.exit(1);
  }

  // Read package stats
  const stats = fs.statSync(packagePath);
  const packageSizeKb = Math.round(stats.size / 1024);

  // Read signature if present
  const sigPath = `${packagePath}.sig`;
  let signatureB64: string | null = null;
  if (fileExists(sigPath)) {
    signatureB64 = fs.readFileSync(sigPath, 'utf-8').trim();
  } else {
    // Check inside zip
    try {
      const zip = new AdmZip(packagePath);
      const sigEntry = zip.getEntry('signature.sig');
      if (sigEntry) {
        signatureB64 = sigEntry.getData().toString('utf-8').trim();
      }
    } catch {
      // ignore
    }
  }

  // Read public key
  let publicKeyB64: string | null = null;
  const pkPath = getPublicKeyPath();
  if (fileExists(pkPath)) {
    publicKeyB64 = fs.readFileSync(pkPath, 'utf-8').trim();
  }

  // Compute package checksum (SHA-256 via Node crypto)
  const { createHash } = await import('crypto');
  const packageBytes = fs.readFileSync(packagePath);
  const checksumHex = createHash('sha256').update(packageBytes).digest('hex');
  const checksumB64 = encodeBase64(Buffer.from(checksumHex, 'hex'));

  const payload = {
    name: manifest.name,
    version: manifest.version,
    platforms: platforms,
    developer: manifest.developer,
    description: manifest.description ?? '',
    permissions: manifest.permissions ?? [],
    packageFile: path.basename(packagePath),
    packageSizeKb,
    checksum: { algorithm: 'sha256', hex: checksumHex, base64: checksumB64 },
    signature: signatureB64 ?? null,
    publicKey: publicKeyB64 ?? null,
    submittedAt: new Date().toISOString(),
  };

  logger.blank();
  logger.success('Submission payload (copy this for Glok Store API):');
  logger.blank();
  console.log(JSON.stringify(payload, null, 2));
  logger.blank();
  logger.info('Glok Store API endpoint (future): POST https://api.glok.store/v1/apps/submit');
  logger.blank();
}
