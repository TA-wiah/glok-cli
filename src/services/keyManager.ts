import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import path from 'path';
import fs from 'fs';
import { ensureDir, resolveHome, fileExists } from '../utils/fs.js';
import { logger } from '../utils/logger.js';

const KEYS_DIR = resolveHome('~/.glok/keys');
const PRIVATE_KEY_FILE = path.join(KEYS_DIR, 'private.key');
const PUBLIC_KEY_FILE = path.join(KEYS_DIR, 'public.key');

export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export function keysExist(): boolean {
  return fileExists(PRIVATE_KEY_FILE) && fileExists(PUBLIC_KEY_FILE);
}

export function generateKeyPair(): { publicKeyB64: string; privateKeyB64: string } {
  const keyPair = nacl.sign.keyPair();
  const publicKeyB64 = encodeBase64(keyPair.publicKey);
  const privateKeyB64 = encodeBase64(keyPair.secretKey);

  ensureDir(KEYS_DIR);

  // Restrict private key to owner-only read/write (Unix)
  fs.writeFileSync(PRIVATE_KEY_FILE, privateKeyB64, { encoding: 'utf-8', mode: 0o600 });
  fs.writeFileSync(PUBLIC_KEY_FILE, publicKeyB64, { encoding: 'utf-8', mode: 0o644 });

  logger.success(`Keys saved to ${KEYS_DIR}`);
  return { publicKeyB64, privateKeyB64 };
}

export function loadKeyPair(): KeyPair {
  if (!keysExist()) {
    throw new Error(
      'No key pair found. Run `glok sign` to generate keys first.',
    );
  }
  const privateKeyB64 = fs.readFileSync(PRIVATE_KEY_FILE, 'utf-8').trim();
  const publicKeyB64 = fs.readFileSync(PUBLIC_KEY_FILE, 'utf-8').trim();
  return {
    secretKey: decodeBase64(privateKeyB64),
    publicKey: decodeBase64(publicKeyB64),
  };
}

export function loadPublicKey(): Uint8Array {
  if (!fileExists(PUBLIC_KEY_FILE)) {
    throw new Error('No public key found. Run `glok sign` to generate keys first.');
  }
  const publicKeyB64 = fs.readFileSync(PUBLIC_KEY_FILE, 'utf-8').trim();
  return decodeBase64(publicKeyB64);
}

export function getPublicKeyPath(): string {
  return PUBLIC_KEY_FILE;
}
