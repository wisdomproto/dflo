// 텔레그램 알림 송신 — 예약·설문 등 여러 접수 경로가 공유한다.
// 미설정(env 없음)이면 조용히 스킵하고, 실패해도 절대 접수를 깨지 않는다(호출부가 삼킨다).
//
// env:
//   TELEGRAM_BOT_TOKEN   봇 토큰
//   TELEGRAM_CHAT_ID     수신 채팅/그룹 id (콤마로 여러 곳)

export async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = (process.env.TELEGRAM_CHAT_ID || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!token || chatIds.length === 0) return; // 미설정 → 조용히 스킵

  await Promise.all(
    chatIds.map((chat_id) =>
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id, text, disable_web_page_preview: true }),
      }),
    ),
  );
}
