import path from 'path';
import { logger } from '../utils/logger.js';
import { readJson, fileExists } from '../utils/fs.js';
import { validateManifest } from '../services/validator.js';
import { createPackage } from '../services/packager.js';
import { Manifest, PACKAGE_EXTENSION } from '../utils/types.js';

interface PackageOptions {
  output?: string;
  noSign?: boolean;
}

export async function packageCommand(options: PackageOptions): Promise<void> {
  logger.header('Glok CLI — Package');

  const projectDir = process.cwd();
  const manifestPath = path.join(projectDir, 'manifest.json');

  if (!fileExists(manifestPath)) {
    logger.error('manifest.json not found. Run `glok init` first.');
    process.exit(1);
  }

  const manifest = readJson<Partial<Manifest>>(manifestPath);
  const validation = validateManifest(manifest);

  if (!validation.valid) {
    logger.error('manifest.json validation failed:');
    for (const err of validation.errors) logger.error(`  • ${err}`);
    process.exit(1);
  }

  for (const w of validation.warnings) logger.warn(w);

  const fullManifest = manifest as Manifest;
  const ext = PACKAGE_EXTENSION[fullManifest.platform];
  const safeName = fullManifest.name.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
  const outputFileName = options.output ?? `${safeName}-${fullManifest.version}${ext}`;
  const outputPath = path.resolve(projectDir, outputFileName);

  const distDir = path.join(projectDir, 'dist');
  const signaturePath = path.join(projectDir, 'signature.sig');
  const includeSignature = !options.noSign && fileExists(signaturePath);

  logger.step('PACKAGE', `Building ${outputFileName}...`);
  logger.info(`  Platform: ${fullManifest.platform}`);
  logger.info(`  Format:   ${ext}`);
  logger.info(`  Signed:   ${includeSignature ? 'yes' : 'no'}`);

  await createPackage({
    projectDir,
    outputPath,
    distDir,
    manifestPath,
    iconPath: path.join(projectDir, 'icon.png'),
    signaturePath: includeSignature ? signaturePath : undefined,
  });

  logger.blank();
  logger.success(`Package created: ${outputPath}`);

  if (!includeSignature) {
    logger.warn('Package was created without a signature. Run `glok sign` then repackage.');
  } else {
    logger.success('Package includes signature.sig.');
  }

  logger.info('Run `glok verify` to validate the package before submitting.');
  logger.blank();
}
