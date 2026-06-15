// 순수: 발행 준비 토픽 선별 + 하루 1개 날짜 배정. DB I/O 없음.

// blog[lang] 한 언어가 본문+이미지 모두 완료인지(blogCell 'complete' + 본문 공란 가드).
export function isLangReady(blogForLang) {
  if (!blogForLang) return false;
  const sections = blogForLang.sections ?? [];
  if (sections.length === 0) return false;
  return sections.every((s) => s.imageUrl && s.html && String(s.html).trim());
}

// 대상 언어 전부 준비된 토픽만, sortOrder asc.
export function selectReadyTopics(articles, langs) {
  return articles
    .filter((a) => langs.every((l) => isLangReady(a.blog?.[l])))
    .slice()
    .sort((x, y) => (x.sortOrder ?? 0) - (y.sortOrder ?? 0));
}

// 'YYYY-MM-DD' + 'HH:mm' (tz 분 오프셋, KST=540) → UTC ISO.
export function buildScheduledAtIso(dateStr, time, tzOffsetMin) {
  const [Y, Mo, D] = dateStr.split('-').map(Number);
  const [h, m] = time.split(':').map(Number);
  const utcMs = Date.UTC(Y, Mo - 1, D, h, m) - tzOffsetMin * 60000;
  return new Date(utcMs).toISOString();
}

// 'YYYY-MM-DD' + n일 → 'YYYY-MM-DD'.
function addDays(dateStr, n) {
  const [Y, Mo, D] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(Y, Mo - 1, D + n));
  return d.toISOString().slice(0, 10);
}

// 준비 토픽에 하루 1개(기본) scheduled_at 배정. skipArticleIds 는 이미 예약/발행된 토픽.
export function planSchedule(readyTopics, { startDate, time = '09:00', tzOffsetMin = 540, perDay = 1, skipArticleIds = new Set() }) {
  const pending = readyTopics.filter((a) => !skipArticleIds.has(a.id));
  return pending.map((a, i) => ({
    articleId: a.id,
    sortOrder: a.sortOrder,
    scheduledAtIso: buildScheduledAtIso(addDays(startDate, Math.floor(i / perDay)), time, tzOffsetMin),
  }));
}
