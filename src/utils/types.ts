export interface Manifest {
  name: string;
  version: string;
  platform: 'desktop' | 'mobile';
  entry: string;
  permissions: string[];
  developer: string;
  description?: string;
  icon?: string;
}

export const REQUIRED_MANIFEST_FIELDS: (keyof Manifest)[] = [
  'name',
  'version',
  'platform',
  'entry',
  'permissions',
  'developer',
];

export type Platform = 'desktop' | 'mobile';

export const PACKAGE_EXTENSION: Record<Platform, string> = {
  desktop: '.glok',
  mobile: '.glk',
};
