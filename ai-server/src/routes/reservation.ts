// routes/reservation.ts — 예약(콜백) 접수 + 조회/삭제.
// 마운트: app.use('/api/reservations', ...)  (marketingAuth 밖 — 공개 접수 + PIN 게이트 조회)
//   POST   /                공개 폼 접수 (인증 없음, 허니팟 + rate limit)
//   GET    /                예약 로그 조회 (x-admin-pin 게이트) — 마케팅 예약 로그
//   DELETE /:id             예약 1건 삭제 (x-admin-pin 게이트)
//
// PII(실명·실전화) 보호: reservations 테이블은 anon 정책이 없다(068). service_role 로만 접근.
import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { notifyReservation, type ReservationRow } from '../services/reservationNotify.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const ADMIN_PIN = process.env.WEBSITE_ADMIN_PIN || '8054';
const ALLOWED_METHODS = new Set(['phone', 'text']);

export const reservationRouter = Router();

// 접수는 스팸 방지용으로 IP당 분당 소량 제한.
const submitLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
});

function requirePin(req: Request, res: Response): boolean {
  if (req.headers['x-admin-pin'] === ADMIN_PIN) return true;
  res.status(401).json({ ok: false, error: '권한이 없습니다.' });
  return false;
}

// ── 접수 (공개) ─────────────────────────────────────────────
reservationRouter.post('/', submitLimit, async (req: Request, res: Response) => {
  try {
    const b = req.body || {};

    // 허니팟: 채워졌으면 봇 → 성공한 척 조용히 무시(스팸 봇에 힌트 안 줌).
    if (typeof b.hp === 'string' && b.hp.trim() !== '') {
      return res.json({ ok: true });
    }

    const name = typeof b.name === 'string' ? b.name.trim() : '';
    const phoneRaw = typeof b.phone === 'string' ? b.phone.trim() : '';
    const digits = phoneRaw.replace(/[^0-9]/g, '');
    const consent = b.consent === true;
    const contactMethod = ALLOWED_METHODS.has(b.contactMethod) ? b.contactMethod : 'phone';
    const message = typeof b.message === 'string' ? b.message.trim().slice(0, 1000) : '';

    if (!name) return res.status(400).json({ ok: false, error: '성명을 입력해 주세요.' });
    if (digits.length < 9 || digits.length > 11) {
      return res.status(400).json({ ok: false, error: '휴대전화번호를 정확히 입력해 주세요.' });
    }
    if (!consent) return res.status(400).json({ ok: false, error: '필수 약관에 동의해 주세요.' });

    const utm =
      b.utm && typeof b.utm === 'object' && !Array.isArray(b.utm) ? b.utm : null;
    const locale = typeof b.locale === 'string' ? b.locale.slice(0, 8) : 'ko';
    const referrer = typeof b.referrer === 'string' ? b.referrer.slice(0, 2000) : null;

    const { data, error } = await sb
      .from('reservations')
      .insert({
        name: name.slice(0, 100),
        phone: phoneRaw.slice(0, 40),
        contact_method: contactMethod,
        message: message || null,
        locale,
        consent,
        referrer,
        utm,
      })
      .select()
      .single();

    if (error) {
      console.error('[reservation] insert failed:', error);
      return res.status(500).json({ ok: false, error: '접수 중 문제가 발생했습니다.' });
    }

    // 알림은 접수 성공을 막지 않도록 await 하되 실패는 삼킨다.
    await notifyReservation(data as ReservationRow).catch(() => {});

    return res.json({ ok: true, id: (data as { id: string }).id });
  } catch (e) {
    console.error('[reservation] error:', e);
    return res.status(500).json({ ok: false, error: '접수 중 문제가 발생했습니다.' });
  }
});

// ── 조회 (마케팅 예약 로그, PIN 게이트) ──────────────────────
reservationRouter.get('/', async (req: Request, res: Response) => {
  if (!requirePin(req, res)) return;
  const limit = Math.min(Number(req.query.limit) || 500, 1000);
  const { data, error } = await sb
    .from('reservations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.json({ ok: true, rows: data ?? [] });
});

// ── 삭제 (PIN 게이트) ───────────────────────────────────────
reservationRouter.delete('/:id', async (req: Request, res: Response) => {
  if (!requirePin(req, res)) return;
  const { error } = await sb.from('reservations').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.json({ ok: true });
});
