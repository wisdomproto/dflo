// PostgREST + R2 업로드 + heartbeat IO 헬퍼. 시크릿은 ai-server/.env 에서만 읽고 출력하지 않는다.
import { readFileSync, existsSync } from "node:fs";
import { hostname } from "node:os";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const REMOTION = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PROJ = join(REMOTION, "..");
function parseEnv(p) {
  // upload-reel-covers.mjs:15-23 동일 — KEY=VALUE 한 줄 파싱.
  const out = {};
  if (!existsSync(p)) return out;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
const srv = parseEnv(join(PROJ, "ai-server", ".env"));
export const SUPABASE_URL = srv.SUPABASE_URL;
const KEY = srv.SUPABASE_SERVICE_ROLE_KEY;
const PORT = srv.PORT || "4000";
export const AI_BASE = "http://localhost:" + PORT;
const PIN = srv.WEBSITE_ADMIN_PIN || "8054";
export const HOST = hostname();
const now = () => new Date().toISOString();

export function assertEnv() {
  if (!SUPABASE_URL || !KEY) throw new Error("ai-server/.env 에 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
}
export async function rest(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`${path.split("?")[0]} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res;
}
/** 원자 claim — 조건부 PATCH, 빈 배열 = 경쟁 패배. */
export async function claimJob(id) {
  const r = await rest(`marketing_reel_jobs?id=eq.${id}&status=eq.queued`, {
    method: "PATCH", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "claimed", claimed_by: HOST, started_at: now(), updated_at: now() }),
  });
  return (await r.json()).length > 0;
}
export async function updateJob(id, patch) {
  await rest(`marketing_reel_jobs?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ ...patch, updated_at: now() }) });
}
export async function heartbeat() {
  await rest(`marketing_reel_worker?on_conflict=id`, {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ id: 1, hostname: HOST, last_seen: now() }),
  });
}
/** reel_runtime 의 lang 키만 read-merge-write (워커 단일 프로세스 전제). partial = {timing?, preview?, tts_text?} 의 lang 값. */
export async function mergeRuntime(articleId, lang, partial) {
  const cur = (await (await rest(`marketing_articles?id=eq.${articleId}&select=reel_runtime`)).json())[0]?.reel_runtime ?? {};
  const next = { ...cur };
  for (const [k, v] of Object.entries(partial)) next[k] = { ...(cur[k] ?? {}), [lang]: v };
  await rest(`marketing_articles?id=eq.${articleId}`, { method: "PATCH", body: JSON.stringify({ reel_runtime: next }) });
  return next;
}
/** reels[lang].videoUrl 비파괴 병합 (다른 lang/필드 보존). */
export async function mergeReelsVideoUrl(articleId, lang, videoUrl) {
  const cur = (await (await rest(`marketing_articles?id=eq.${articleId}&select=reels`)).json())[0]?.reels ?? {};
  const next = { ...cur, [lang]: { ...(cur[lang] ?? {}), videoUrl } };
  await rest(`marketing_articles?id=eq.${articleId}`, { method: "PATCH", body: JSON.stringify({ reels: next }) });
}

// 확장자 → MIME (R2 업로드 Blob 타입). 미지원은 octet-stream.
const MIME = { ".mp4": "video/mp4", ".wav": "audio/wav", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

/**
 * 로컬 파일 → ai-server /api/r2/upload (PIN) → 공개 URL 반환.
 * folder 는 ASCII 만 — 서버가 최종 키(images/{folder}/{ts}-{rand}.{ext})를 생성하며 비ASCII strip.
 * 최종 키/URL 의 정본 = 서버 반환값(b.url). 요청 형식은 upload-reel-covers.mjs:86-92 미러.
 */
export async function uploadR2(localPath, folder) {
  if (!existsSync(localPath)) throw new Error(`업로드 파일 없음: ${localPath}`);
  const name = basename(localPath);
  const type = MIME[extname(localPath).toLowerCase()] || "application/octet-stream";
  const fd = new FormData();
  fd.append("file", new Blob([readFileSync(localPath)], { type }), name);
  fd.append("folder", folder);
  let ur;
  try {
    ur = await fetch(`${AI_BASE}/api/r2/upload`, { method: "POST", headers: { "x-admin-pin": PIN }, body: fd });
  } catch (e) {
    if (e?.cause?.code === "ECONNREFUSED" || /ECONNREFUSED|fetch failed/.test(String(e?.message)))
      throw new Error(`ai-server(localhost:${PORT}) 미응답 — 로컬 ai-server 실행 필요`);
    throw e;
  }
  const b = await ur.json();
  if (!ur.ok || !b.success) throw new Error(b.error || `R2 업로드 실패 ${ur.status}`);
  return b.url;
}
