import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { logger } from '../utils/logger.js';
import { readJson, fileExists } from '../utils/fs.js';
import { validateManifest } from '../services/validator.js';
import { Manifest } from '../utils/types.js';

interface BuildOptions {
  script?: string;
}

export async function buildCommand(options: BuildOptions): Promise<void> {
  logger.header('Glok CLI — Build');

  const projectDir = process.cwd();
  const manifestPath = path.join(projectDir, 'manifest.json');

  if (!fileExists(manifestPath)) {
    logger.error('manifest.json not found. Run `glok init` first.');
    process.exit(1);
  }

  const manifest = readJson<Partial<Manifest>>(manifestPath);
  const validation = validateManifest(manifest);

  if (!validation.valid) {
    logger.error('manifest.json is invalid:');
    for (const err of validation.errors) logger.error(`  • ${err}`);
    process.exit(1);
  }

  for (const w of validation.warnings) logger.warn(w);

  const buildScript = options.script;

  if (buildScript) {
    logger.step('BUILD', `Running custom build script: ${buildScript}`);
    try {
      execSync(buildScript, { cwd: projectDir, stdio: 'inherit' });
      logger.success('Build script completed.');
    } catch {
      logger.error('Build script failed.');
      process.exit(1);
    }
  } else {
    // Auto-detect build tool
    const pkgPath = path.join(projectDir, 'package.json');
    if (fileExists(pkgPath)) {
      const pkg = readJson<{ scripts?: Record<string, string> }>(pkgPath);
      if (pkg.scripts?.build) {
        logger.step('BUILD', 'Running npm run build...');
        try {
          execSync('npm run build', { cwd: projectDir, stdio: 'inherit' });
          logger.success('Build completed.');
        } catch {
          logger.error('Build failed.');
          process.exit(1);
        }
      } else {
        logger.warn('No build script found in package.json. Skipping build step.');
        logger.info('Ensure your compiled output is in the dist/ directory.');
      }
    } else {
      logger.warn('No package.json found. Skipping automated build step.');
      logger.info('Ensure your compiled output is in the dist/ directory.');
    }
  }

  // Verify dist directory exists
  const distDir = path.join(projectDir, 'dist');
  if (!fs.existsSync(distDir) || fs.readdirSync(distDir).filter((f) => f !== '.gitkeep').length === 0) {
    logger.warn('dist/ directory is empty. Make sure your build outputs files to dist/.');
  } else {
    logger.success('dist/ directory contains build artifacts.');
  }

  logger.blank();
  logger.success('Build step complete. Run `glok package` to create your package.');
  logger.blank();
}
