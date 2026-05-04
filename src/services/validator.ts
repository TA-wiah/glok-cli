import { Manifest, REQUIRED_MANIFEST_FIELDS } from '../utils/types.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateManifest(manifest: Partial<Manifest>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (manifest[field] === undefined || manifest[field] === null || manifest[field] === '') {
      errors.push(`Missing required field: "${field}"`);
    }
  }

  if (manifest.platform && !['desktop', 'mobile'].includes(manifest.platform)) {
    errors.push(`Invalid platform "${manifest.platform}". Must be "desktop" or "mobile".`);
  }

  if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
    errors.push(`Invalid version "${manifest.version}". Must follow semver (e.g., 1.0.0).`);
  }

  if (manifest.developer && manifest.developer.trim().length < 2) {
    errors.push('Developer identifier must be at least 2 characters.');
  }

  if (!manifest.description) {
    warnings.push('No description provided in manifest.json.');
  }

  if (!manifest.icon) {
    warnings.push('No icon specified in manifest.json. Using default icon.png.');
  }

  return { valid: errors.length === 0, errors, warnings };
}
