import path from 'path';
import { logger } from '../utils/logger.js';
import { readJson, fileExists } from '../utils/fs.js';
import { validateManifest } from '../services/validator.js';
import { createPackage } from '../services/packager.js';
import { Manifest, PACKAGE_EXTENSION, resolvePlatforms } from '../utils/types.js';

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
  const platforms = resolvePlatforms(fullManifest);
  const safeName = fullManifest.name.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();

  const distDir = path.join(projectDir, 'dist');
  const signaturePath = path.join(projectDir, 'signature.sig');
  const includeSignature = !options.noSign && fileExists(signaturePath);

  // If a custom output path is provided, only build for the first platform
  const targetPlatforms = options.output ? [platforms[0]] : platforms;
  if (options.output && platforms.length > 1) {
    logger.warn(
      `Custom output path provided; packaging only the first platform (${platforms[0]}). ` +
      `Remove --output to generate packages for all platforms: ${platforms.join(', ')}.`,
    );
  }

  for (const platform of targetPlatforms) {
    const ext = PACKAGE_EXTENSION[platform];
    const outputFileName = options.output ?? `${safeName}-${fullManifest.version}${ext}`;
    const outputPath = path.resolve(projectDir, outputFileName);

    logger.step('PACKAGE', `Building ${outputFileName}...`);
    logger.info(`  Platform: ${platform}`);
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

    logger.success(`Package created: ${outputPath}`);

    if (!includeSignature) {
      logger.warn('Package was created without a signature. Run `glok sign` then repackage.');
    } else {
      logger.success('Package includes signature.sig.');
    }
  }

  logger.blank();
  logger.info('Run `glok verify` to validate each package before submitting.');
  logger.blank();
}
