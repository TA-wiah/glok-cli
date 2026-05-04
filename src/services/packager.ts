import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { ensureDir } from '../utils/fs.js';

export interface PackageOptions {
  projectDir: string;
  outputPath: string;
  distDir: string;
  manifestPath: string;
  iconPath?: string;
  signaturePath?: string;
}

export async function createPackage(options: PackageOptions): Promise<void> {
  const { projectDir, outputPath, distDir, manifestPath, iconPath, signaturePath } = options;

  ensureDir(path.dirname(outputPath));

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    output.on('error', reject);
    archive.on('error', reject);
    archive.on('warning', (err) => {
      if (err.code !== 'ENOENT') reject(err);
    });

    archive.pipe(output);

    // Add manifest
    archive.file(manifestPath, { name: 'manifest.json' });

    // Add dist directory
    if (fs.existsSync(distDir)) {
      archive.directory(distDir, 'dist');
    }

    // Add icon if present
    const resolvedIcon = iconPath ?? path.join(projectDir, 'icon.png');
    if (fs.existsSync(resolvedIcon)) {
      archive.file(resolvedIcon, { name: 'icon.png' });
    }

    // Add signature if present
    if (signaturePath && fs.existsSync(signaturePath)) {
      archive.file(signaturePath, { name: 'signature.sig' });
    }

    archive.finalize();
  });
}
