// intakeNotify.ts — 셀프 설문(`intake_submissions`) 접수 시 텔레그램 알림.
// 예약(reservationNotify)과 같은 봇·채팅을 쓰되(notify.ts), 설문은 **텔레그램만** 보낸다.
//
// 설문은 클라이언트가 anon 키로 직접 insert 하므로(파일 업로드가 섞여 있어 서버 경유가 아니다)
// 서버는 token 만 받아 **service_role 로 그 행을 다시 읽어** 알림을 만든다.
// → 알림 내용이 요청자가 준 값이 아니라 DB 실제 값이라 위조가 불가능하다.

export interface IntakeRow {
  token: string;
  created_at?: string | null;
  lang?: string | null;
  country?: string | null;
  name?: string | null;
  name_en?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  email?: string | null;
  current_height?: number | null;
  father_height?: number | null;
  mother_height?: number | null;
  desired_height?: number | null;
  uploads?: Array<{ kind?: string }> | null;
}

const GENDER_LABEL: Record<string, string> = { male: '남', female: '여' };
const SITE = (process.env.GSC_SITE_URL || 'https://www.dr187growup.com/').replace(/\/$/, '');

/** 생년월일 → 만나이. 형식이 이상하면 null(알림이 죽지 않게). */
export function ageFrom(birth: string | null | undefined, now = new Date()): number | null {
  if (!birth) return null;
  const d = new Date(birth);
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

/** 알림 본문. 순수 함수 — 단위 테스트 대상. */
export function summarizeIntake(row: IntakeRow, now = new Date()): string {
  const name = row.name || row.name_en || '(이름 없음)';
  const who = [GENDER_LABEL[row.gender || ''] , ageFrom(row.birth_date, now) != null ? `만 ${ageFrom(row.birth_date, now)}세` : null]
    .filter(Boolean).join(' · ');
  const lines = [`📋 새 설문이 접수됐습니다.`, '', `• 이름: ${name}${who ? ` (${who})` : ''}`];

  const locale = [row.lang, row.country].filter(Boolean).join(' / ');
  if (locale) lines.push(`• 언어/국가: ${locale}`);
  if (row.current_height) lines.push(`• 현재 키: ${row.current_height}cm`);

  const parents = [row.father_height && `부 ${row.father_height}`, row.mother_height && `모 ${row.mother_height}`]
    .filter(Boolean).join(' · ');
  if (parents) lines.push(`• 부모 키: ${parents}cm`);
  if (row.desired_height) lines.push(`• 희망 키: ${row.desired_height}cm`);

  const contact = [row.phone, row.email].filter(Boolean).join(' / ');
  lines.push(`• 연락처: ${contact || '미입력'}`);

  const files = row.uploads?.length ?? 0;
  if (files > 0) {
    const xray = row.uploads?.filter((u) => u.kind === 'xray').length ?? 0;
    const lab = files - xray;
    lines.push(`• 첨부: ${[xray && `엑스레이 ${xray}`, lab && `검사지 ${lab}`].filter(Boolean).join(' · ')}`);
  }
  if (row.created_at) lines.push(`• 접수시각: ${new Date(row.created_at).toLocaleString('ko-KR')}`);
  lines.push('', `${SITE}/admin/intake`);
  return lines.join('\n');
}

export async function notifyIntake(row: IntakeRow): Promise<void> {
  const { sendTelegram } = await import('./notify.js');
  await sendTelegram(summarizeIntake(row));
}
