// reservationNotify.ts — 예약(콜백) 접수 시 병원에 즉시 알림 팬아웃.
// 이메일 + 텔레그램 두 채널. 각 채널은 env 가 있을 때만 동작하고,
// 실패해도 접수 요청 자체는 성공시켜야 하므로 모든 에러는 삼킨다(로그만).
//
// env:
//   RESERVATION_EMAIL_TO         알림 수신 주소 (콤마로 여러 명)
//   SMTP_HOST / SMTP_PORT        SMTP 서버 (예: smtp.gmail.com / 465)
//   SMTP_USER / SMTP_PASS        SMTP 계정 (Gmail 은 앱 비밀번호)
//   SMTP_FROM                    발신 표기 (기본: SMTP_USER)
//   TELEGRAM_BOT_TOKEN           봇 토큰        ┐ 송신은 notify.ts 공용
//   TELEGRAM_CHAT_ID             수신 채팅/그룹 id ┘ (콤마로 여러 곳)
import { sendTelegram } from './notify.js';

export interface ReservationRow {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  contact_method?: string | null;
  message?: string | null;
  locale: string;
  referrer?: string | null;
  utm?: Record<string, unknown> | null;
}

const METHOD_LABEL: Record<string, string> = {
  phone: '전화상담',
  text: '문자상담',
};

function attributionLine(row: ReservationRow): string {
  const utm = row.utm || {};
  const parts = [utm.utm_source, utm.utm_medium, utm.utm_campaign].filter(Boolean);
  if (parts.length) return parts.join(' / ');
  if (row.referrer) {
    try { return new URL(row.referrer).hostname; } catch { return String(row.referrer); }
  }
  return '직접 유입';
}

function summarize(row: ReservationRow): { subject: string; text: string } {
  const method = METHOD_LABEL[row.contact_method || ''] || '전화상담';
  const at = new Date(row.created_at).toLocaleString('ko-KR');
  const subject = `[187 예약신청] ${row.name} (${row.phone})`;
  const lines = [
    '새 예약(콜백) 신청이 접수됐습니다.',
    '',
    `• 성명: ${row.name}`,
    `• 연락처: ${row.phone}`,
    `• 연락 방식: ${method}`,
  ];
  if (row.message && row.message.trim()) {
    lines.push(`• 상담 내용: ${row.message.trim()}`);
  }
  lines.push(
    `• 유입: ${attributionLine(row)}`,
    `• 접수시각: ${at}`,
    '',
    `남겨주신 번호로 ${method} 부탁드립니다.`,
  );
  return { subject, text: lines.join('\n') };
}

async function notifyEmail(row: ReservationRow): Promise<void> {
  const to = process.env.RESERVATION_EMAIL_TO;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!to || !host || !user || !pass) return; // 미설정 → 조용히 스킵

  // nodemailer 는 이메일 알림을 켤 때만 필요 → 동적 import (미설치/미사용 시 서버 부팅 무영향).
  const nodemailer = (await import('nodemailer')).default;
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  const { subject, text } = summarize(row);
  await transport.sendMail({
    from: process.env.SMTP_FROM || user,
    to,
    subject,
    text,
  });
}

async function notifyTelegram(row: ReservationRow): Promise<void> {
  await sendTelegram(summarize(row).text); // 송신은 notify.ts 공용(설문 알림과 같은 봇·채팅)
}

// 팬아웃 — 각 채널 독립 실패, 어느 것도 접수를 깨지 않음.
export async function notifyReservation(row: ReservationRow): Promise<void> {
  const results = await Promise.allSettled([notifyEmail(row), notifyTelegram(row)]);
  for (const r of results) {
    if (r.status === 'rejected') {
      console.warn('[reservation] notify channel failed:', r.reason);
    }
  }
}
