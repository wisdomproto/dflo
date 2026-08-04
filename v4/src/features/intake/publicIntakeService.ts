import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import { growthStandardOf } from '@/shared/data/countries';
import type { IntakeFormState, IntakeLang, UploadMeta } from './types';

const AI_SERVER = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';

function randomToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
}

const ALLOWED = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'pdf'];
const MAX_BYTES = 10 * 1024 * 1024;

function ext(name: string): string {
  return (name.split('.').pop() ?? '').toLowerCase();
}

/** Returns null if valid, otherwise an error code ('unsupported' | 'too_large'). */
export function validateFile(f: File): string | null {
  if (!ALLOWED.includes(ext(f.name))) return 'unsupported';
  if (f.size > MAX_BYTES) return 'too_large';
  return null;
}

/**
 * 파일 한 개를 intake-uploads 에 올린다. `slot` 이 파일명을 정하므로 호출부가 충돌을 책임진다 —
 * 공개 설문은 0,1,2… / 어드민 추가 업로드는 접수 후라 겹치지 않는 키를 쓴다(`adminUploadFile`).
 */
export async function uploadOne(
  token: string,
  kind: 'xray' | 'lab',
  file: File,
  slot: string | number,
): Promise<UploadMeta> {
  const path = `${token}/${kind}-${slot}.${ext(file.name)}`;
  const { error } = await supabase.storage.from('intake-uploads').upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) {
    logger.error('intake upload failed', error);
    throw new Error('upload_failed');
  }
  return { kind, path, filename: file.name, size: file.size, contentType: file.type };
}

/** birthYear/Month/Day → 'YYYY-MM-DD' (undefined if any part empty). */
function composeBirth(s: IntakeFormState): string | undefined {
  if (!s.birthYear || !s.birthMonth || !s.birthDay) return undefined;
  const p = (v: string, n: number) => v.padStart(n, '0');
  return `${p(s.birthYear, 4)}-${p(s.birthMonth, 2)}-${p(s.birthDay, 2)}`;
}

function num(v: string): number | undefined {
  const t = v.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isNaN(n) ? undefined : n;
}

/** Uploads files to the intake-uploads bucket then inserts the staging row. */
export async function submitIntake(lang: IntakeLang, s: IntakeFormState): Promise<void> {
  const token = randomToken();
  const uploads: UploadMeta[] = [];
  let i = 0;
  for (const f of s.xrayFiles) uploads.push(await uploadOne(token, 'xray', f, i++));
  i = 0;
  for (const f of s.labFiles) uploads.push(await uploadOne(token, 'lab', f, i++));

  const payload = {
    token,
    lang,
    country: s.country || null,
    status: 'pending',
    name: s.name || null,
    name_en: s.name_en || null,
    gender: s.gender || null,
    birth_date: composeBirth(s) ?? null,
    father_height: num(s.father_height) ?? null,
    mother_height: num(s.mother_height) ?? null,
    desired_height: num(s.desired_height) ?? null,
    current_height: num(s.current_height) ?? null,
    current_weight: num(s.current_weight) ?? null,
    grade: s.grade || null,
    class_height_rank: s.class_height_rank || null,
    phone: s.phone || null,
    email: s.email || null,
    address: s.address || null,
    // 성장 기준 국가는 JSONB 안에 둔다(컬럼 추가 없이). 고른 나라와 그 나라가 뜻하는
    // 성장 표준을 함께 굳혀 저장한다 — 매핑 규칙이 나중에 바뀌어도 접수 당시 기준이 남는다.
    intake_survey: {
      ...s.survey,
      growth_ref_country: s.growth_ref || s.country || null,
      growth_standard: growthStandardOf(s.growth_ref || s.country),
      updated_at: new Date().toISOString(),
    },
    uploads,
  };
  const { error } = await supabase.from('intake_submissions').insert(payload);
  if (error) {
    logger.error('intake submit failed', error);
    throw new Error('submit_failed');
  }
  notifySubmission(token);
}

/** 병원 텔레그램 알림 트리거. 토큰만 넘기고 본문은 서버가 DB 에서 다시 읽는다(위조 방지).
 *  fire-and-forget — 알림이 안 가도 접수는 이미 끝났으므로 사용자에게 실패를 보이지 않는다. */
function notifySubmission(token: string): void {
  void fetch(`${AI_SERVER}/api/intake/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
    keepalive: true, // 완료 화면으로 넘어가며 언마운트돼도 요청이 살아남게
  }).catch(() => {});
}
