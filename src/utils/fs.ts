import fs from 'fs';
import path from 'path';

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

export function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function writeFile(filePath: string, content: string | Buffer): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function resolveHome(filePath: string): string {
  if (filePath.startsWith('~/') || filePath === '~') {
    return path.join(process.env['HOME'] ?? process.env['USERPROFILE'] ?? '', filePath.slice(2));
  }
  return filePath;
}
