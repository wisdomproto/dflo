// Meta 데이터 삭제 콜백 — Facebook 이 보내는 signed_request 검증(앱 시크릿 HMAC) + 확인 코드 생성.
// 순수 함수만(crypto). 라우트(routes/metaAuth.ts)에서 사용.
import crypto from 'node:crypto';

function base64urlToBuffer(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

// signed_request = "<base64url(sig)>.<base64url(payload json)>". 유효하면 payload, 아니면 null.
export function parseSignedRequest(signed: string, appSecret: string): Record<string, unknown> | null {
  if (!signed || !appSecret || !signed.includes('.')) return null;
  const dot = signed.indexOf('.');
  const encSig = signed.slice(0, dot);
  const encPayload = signed.slice(dot + 1);
  if (!encSig || !encPayload) return null;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(base64urlToBuffer(encPayload).toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }

  const expected = crypto.createHmac('sha256', appSecret).update(encPayload).digest();
  let sig: Buffer;
  try {
    sig = base64urlToBuffer(encSig);
  } catch {
    return null;
  }
  if (sig.length !== expected.length || !crypto.timingSafeEqual(sig, expected)) return null;
  return payload;
}

export function deletionConfirmationCode(userId: string, salt: string): string {
  return crypto.createHash('sha256').update(`${userId}:${salt}`).digest('hex').slice(0, 16);
}

// 테스트·도구용: 주어진 payload 로 유효한 signed_request 문자열 생성.
export function buildSignedRequest(payload: Record<string, unknown>, appSecret: string): string {
  const encPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', appSecret).update(encPayload).digest('base64url');
  return `${sig}.${encPayload}`;
}
