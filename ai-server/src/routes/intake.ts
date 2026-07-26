// routes/intake.ts — 셀프 설문 접수 알림.
// 마운트: app.use('/api/intake', ...)  (공개 — 설문 자체는 클라가 anon 으로 insert 한다)
//   POST /notify { token }   그 설문 행을 service_role 로 읽어 텔레그램 알림
//
// 설문 insert 를 서버로 옮기지 않은 이유: 파일 업로드(스토리지)가 섞여 있어 클라 경유가 자연스럽고,
// 옮기면 기존 동작 전체를 다시 검증해야 한다. 대신 알림 본문은 **DB 에서 다시 읽어** 만들어
// 요청자가 준 값을 그대로 쓰지 않는다(위조 불가).
import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { notifyIntake, type IntakeRow } from '../services/intakeNotify.js';

const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false } },
);

export const intakeRouter = Router();

const notifyLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false },
});

// 같은 토큰으로 반복 호출해도 한 번만 보낸다(재시도·새로고침·장난 요청).
// 프로세스 메모리라 재시작하면 비지만, 아래 '최근 접수만' 조건이 남아 있어 피해가 없다.
const notified = new Set<string>();
const FRESH_MS = 10 * 60 * 1000;

intakeRouter.post('/notify', notifyLimit, async (req: Request, res: Response) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token || token.length > 64) return res.json({ ok: true }); // 조용히 무시
    if (notified.has(token)) return res.json({ ok: true });

    const { data, error } = await sb
      .from('intake_submissions')
      .select('token, created_at, lang, country, name, name_en, gender, birth_date, phone, email, current_height, father_height, mother_height, desired_height, uploads')
      .eq('token', token)
      .maybeSingle();
    if (error) {
      console.error('[intake] notify lookup failed:', error.message);
      return res.json({ ok: true }); // 접수는 이미 끝났다 — 알림 실패를 클라에 떠넘기지 않는다
    }
    if (!data) return res.json({ ok: true }); // 없는 토큰

    // 방금 들어온 접수만 알린다 — 옛 토큰을 긁어 알림을 되쏘는 걸 막는다.
    const age = Date.now() - new Date((data as IntakeRow).created_at || 0).getTime();
    if (!(age >= 0 && age < FRESH_MS)) return res.json({ ok: true });

    notified.add(token);
    await notifyIntake(data as IntakeRow).catch((e) => console.warn('[intake] telegram failed:', e));
    return res.json({ ok: true });
  } catch (e) {
    console.error('[intake] notify error:', e);
    return res.json({ ok: true });
  }
});
