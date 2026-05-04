export interface Manifest {
  name: string;
  version: string;
  /** Preferred: list of target platforms. Replaces the legacy single-value `platform` field. */
  platforms: Platform[];
  /** @deprecated Use `platforms` (array) instead. Kept for backward compatibility with old manifests. */
  platform?: Platform;
  entry: string;
  permissions: string[];
  developer: string;
  description?: string;
  icon?: string;
}

export const REQUIRED_MANIFEST_FIELDS: (keyof Manifest)[] = [
  'name',
  'version',
  'entry',
  'permissions',
  'developer',
];

export type Platform = 'desktop' | 'mobile';

export const PACKAGE_EXTENSION: Record<Platform, string> = {
  desktop: '.glok',
  mobile: '.glk',
};

/** Resolve a manifest's target platforms, supporting both the new `platforms` array
 *  and the legacy single-value `platform` field. */
export function resolvePlatforms(manifest: Partial<Manifest>): Platform[] {
  if (manifest.platforms && manifest.platforms.length > 0) {
    return manifest.platforms;
  }
  if (manifest.platform) {
    return [manifest.platform];
  }
  return ['desktop'];
}
