import * as ed from '@noble/ed25519';
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';

export async function generateKeyPair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

export function encryptPrivateKey(privateKey: Uint8Array): string {
  const key = crypto.createHash('sha256').update(process.env.JWT_SECRET!).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(privateKey)), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptPrivateKey(encrypted: string): Uint8Array {
  const data = Buffer.from(encrypted, 'base64');
  const iv = data.slice(0, 12);
  const tag = data.slice(12, 28);
  const ciphertext = data.slice(28);
  const key = crypto.createHash('sha256').update(process.env.JWT_SECRET!).digest();
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return new Uint8Array(decrypted);
}
