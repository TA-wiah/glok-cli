import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger.js';
import { writeJson, writeFile, ensureDir } from '../utils/fs.js';
import { Manifest, Platform } from '../utils/types.js';

interface InitAnswers {
  name: string;
  version: string;
  description: string;
  platform: Platform;
  entry: string;
  developer: string;
}

export async function initCommand(): Promise<void> {
  logger.header('Glok CLI — Initialize Project');

  const answers = await inquirer.prompt<InitAnswers>([
    {
      type: 'input',
      name: 'name',
      message: 'App name:',
      validate: (v: string) => v.trim().length >= 1 || 'App name is required.',
    },
    {
      type: 'input',
      name: 'version',
      message: 'Version:',
      default: '1.0.0',
      validate: (v: string) =>
        /^\d+\.\d+\.\d+/.test(v.trim()) || 'Version must follow semver (e.g. 1.0.0).',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Description (optional):',
    },
    {
      type: 'list',
      name: 'platform',
      message: 'Target platform:',
      choices: [
        { name: 'Desktop (.glok)', value: 'desktop' },
        { name: 'Mobile / Web (.glk)', value: 'mobile' },
      ],
    },
    {
      type: 'input',
      name: 'entry',
      message: 'Entry point (relative to dist/):',
      default: 'index.js',
    },
    {
      type: 'input',
      name: 'developer',
      message: 'Developer ID (your username or org):',
      validate: (v: string) => v.trim().length >= 2 || 'Developer ID must be at least 2 characters.',
    },
  ]);

  const manifest: Manifest = {
    name: answers.name.trim(),
    version: answers.version.trim(),
    platform: answers.platform,
    entry: `dist/${answers.entry.trim()}`,
    permissions: [],
    developer: answers.developer.trim(),
    description: answers.description.trim() || undefined,
    icon: 'icon.png',
  };

  const projectDir = process.cwd();

  // Write manifest
  writeJson(path.join(projectDir, 'manifest.json'), manifest);
  logger.success('manifest.json created.');

  // Create dist placeholder
  ensureDir(path.join(projectDir, 'dist'));
  writeFile(
    path.join(projectDir, 'dist', '.gitkeep'),
    '# Place your compiled application files in this directory\n',
  );
  logger.success('dist/ directory created.');

  // Create icon placeholder only if missing
  const iconPath = path.join(projectDir, 'icon.png');
  if (!fs.existsSync(iconPath)) {
    // Write a 1×1 transparent PNG (minimal valid PNG bytes)
    const minimalPng = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489000000' +
        '0a49444154789c6260000000020001e221bc330000000049454e44ae426082',
      'hex',
    );
    writeFile(iconPath, minimalPng);
    logger.success('icon.png placeholder created (replace with your app icon).');
  }

  // Create .gitignore
  const gitignorePath = path.join(projectDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    writeFile(
      gitignorePath,
      'node_modules/\n*.glok\n*.glk\n*.sig\nprivate.key\n',
    );
    logger.success('.gitignore created.');
  }

  logger.blank();
  logger.success(`Project "${manifest.name}" initialized!`);
  logger.info(`Next steps:`);
  logger.info(`  1. Add your compiled app files to ./dist/`);
  logger.info(`  2. Run: glok build`);
  logger.info(`  3. Run: glok package`);
  logger.info(`  4. Run: glok sign`);
  logger.blank();
}
