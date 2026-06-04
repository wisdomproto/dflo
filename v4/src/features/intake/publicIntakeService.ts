import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type { IntakeFormState, IntakeLang, UploadMeta } from './types';

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

async function uploadOne(
  token: string,
  kind: 'xray' | 'lab',
  file: File,
  idx: number,
): Promise<UploadMeta> {
  const path = `${token}/${kind}-${idx}.${ext(file.name)}`;
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
    grade: s.grade || null,
    class_height_rank: s.class_height_rank || null,
    phone: s.phone || null,
    email: s.email || null,
    address: s.address || null,
    intake_survey: { ...s.survey, updated_at: new Date().toISOString() },
    uploads,
  };
  const { error } = await supabase.from('intake_submissions').insert(payload);
  if (error) {
    logger.error('intake submit failed', error);
    throw new Error('submit_failed');
  }
}
