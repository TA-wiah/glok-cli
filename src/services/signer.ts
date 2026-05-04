import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import fs from 'fs';

export function signFile(filePath: string, secretKey: Uint8Array): string {
  const data = fs.readFileSync(filePath);
  const signature = nacl.sign.detached(data, secretKey);
  return encodeBase64(signature);
}

export function verifyFile(
  filePath: string,
  signatureB64: string,
  publicKey: Uint8Array,
): boolean {
  const data = fs.readFileSync(filePath);
  const signature = decodeBase64(signatureB64);
  return nacl.sign.detached.verify(data, signature, publicKey);
}
