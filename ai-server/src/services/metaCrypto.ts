// Meta 토큰 암호화(at-rest). AES-256-GCM. 키는 META_TOKEN_ENC_KEY(base64 32바이트).
import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';

export function encrypt(plain: string, keyB64: string): string {
  const key = Buffer.from(keyB64, 'base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

export function decrypt(payload: string, keyB64: string): string {
  const key = Buffer.from(keyB64, 'base64');
  const [ivB64, tagB64, dataB64] = payload.split('.');
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

export function getEncKey(): string {
  const k = process.env.META_TOKEN_ENC_KEY;
  if (!k) throw new Error('META_TOKEN_ENC_KEY 환경변수가 필요합니다 (base64 32바이트).');
  return k;
}
