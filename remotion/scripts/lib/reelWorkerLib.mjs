// 릴 워커/온보딩 순수 함수 — IO 금지 (테스트: reelWorkerLib.test.mjs).
export const ACTIVE_STATUSES = ["queued", "claimed", "tts", "lipsync", "upload_preview", "render", "upload"];

/** stale 판정: heartbeat(updated_at) 10분 미갱신 + 진행 중(claimed~upload). queued 는 대기일 뿐 stale 아님. */
export function isStale(job, nowMs, staleMs = 10 * 60 * 1000) {
  if (!ACTIVE_STATUSES.includes(job.status) || job.status === "queued") return false;
  return nowMs - Date.parse(job.updated_at) > staleMs;
}

/** render 잡 전제조건 — 전원격 렌더라 preview 립싱크 URL + timing 필수. */
export function renderPrecondition(runtime, lang) {
  if (!runtime?.preview?.[lang]?.lipsyncUrl) return { ok: false, reason: `preview.lipsyncUrl 없음(${lang}) — full 필요` };
  if (!Array.isArray(runtime?.timing?.[lang]) || runtime.timing[lang].length === 0)
    return { ok: false, reason: `timing 없음(${lang}) — full 필요` };
  return { ok: true };
}

/** 로컬 script.json(평탄) → DB reel_script doc. insert 로컬 경로는 reel_assets URL 로 치환(실패 = throw). */
export function buildPushDoc(localJson, reelAssets) {
  const { slug, fps: _fps, ...rest } = localJson;
  const chunks = (rest.chunks ?? []).map((c) => {
    if (!c.insert || /^https?:\/\//.test(c.insert)) return c;
    const m = c.insert.match(/\/(ig\d+)\.\w+$/);
    const url = m && reelAssets?.infographics?.[m[1]];
    if (!url) throw new Error(`insert 매칭 실패: ${c.insert} (${m ? m[1] : "?"}) — InfographicAssetsPanel 에 먼저 업로드`);
    return { ...c, insert: url };
  });
  return { slug, script: { ...rest, chunks } };
}

/** DB reel_script doc → 로컬 script.json(평탄, 기존 스크립트 호환). */
export function toLocalScriptJson(doc) {
  return { slug: doc.slug, fps: 30, ...doc.script };
}

/** 청크 나레이션 → tts_text 스냅샷 ({chunkId: 원문}) — preview 업로드 언어에만 시드. */
export function ttsTextSnapshot(chunks, lang) {
  const out = {};
  for (const c of chunks ?? []) if (typeof c[lang] === "string") out[c.id] = c[lang];
  return out;
}
