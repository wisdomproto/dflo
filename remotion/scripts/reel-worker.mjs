// 릴 렌더 워커 — marketing_reel_jobs 폴링. --once(큐 소진 후 종료) / --watch(15s 상주).
// render 잡: DB script + R2 preview(전원격) → PresenterGeneric renderMedia → R2 업로드 → reels[lang].videoUrl.
// full 잡: P3 에서 구현 (현재는 명시 failed).
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ACTIVE_STATUSES, isStale, renderPrecondition, toLocalScriptJson } from "./lib/reelWorkerLib.mjs";
import { assertEnv, rest, claimJob, updateJob, heartbeat, mergeReelsVideoUrl, uploadR2 } from "./lib/reelDb.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WATCH = process.argv.includes("--watch");
const POLL_MS = 15_000;

let serveUrl = null;
async function getServeUrl() {
  if (!serveUrl) {
    console.log("bundling… (1회, 잡 간 재사용 — 렌더 입력은 전원격이라 안전)");
    serveUrl = await bundle({ entryPoint: join(ROOT, "src", "index.ts"), onProgress: () => {} });
  }
  return serveUrl;
}

async function recoverStale() {
  const active = await (await rest(`marketing_reel_jobs?status=in.(${ACTIVE_STATUSES.join(",")})&select=id,status,updated_at`)).json();
  for (const j of active) if (isStale(j, Date.now()))
    await updateJob(j.id, { status: "queued", claimed_by: null, progress_note: "stale 회수 → 재대기" });
}

async function renderStage(job, scriptDoc, runtime) {
  await updateJob(job.id, { status: "render", progress_note: "렌더 중" });
  const pv = runtime.preview[job.lang];
  const inputProps = {
    script: scriptDoc.script, timing: runtime.timing[job.lang], lang: job.lang, slug: job.slug,
    assets: { videoSrc: pv.lipsyncUrl, audio: pv.audio },
  };
  const url = await getServeUrl();
  const composition = await selectComposition({ serveUrl: url, id: "PresenterGeneric", inputProps });
  const out = join(ROOT, "out", "shorts", job.slug, `${job.slug}-${job.lang}.mp4`);
  mkdirSync(dirname(out), { recursive: true });
  // 진행률 노트는 10% 단위로만 갱신(과도 PATCH 금지) + 60초 무변동 시 heartbeat(updated_at)로 stale 회수 방지.
  let lastDecile = -1;
  let lastWriteMs = Date.now();
  await renderMedia({
    composition, serveUrl: url, codec: "h264", outputLocation: out, inputProps,
    onProgress: ({ progress }) => {
      const decile = Math.floor(progress * 10);
      const nowMs = Date.now();
      if (decile !== lastDecile) {
        lastDecile = decile;
        lastWriteMs = nowMs;
        updateJob(job.id, { progress_note: `렌더 ${decile * 10}%` }).catch(() => {});
      } else if (nowMs - lastWriteMs > 60_000) {
        lastWriteMs = nowMs;
        updateJob(job.id, {}).catch(() => {}); // updated_at 만 갱신 = heartbeat
      }
    },
  });
  return out;
}

async function processJob(job) {
  const art = (await (await rest(`marketing_articles?id=eq.${job.article_id}&select=reel_script,reel_runtime`)).json())[0];
  if (!art?.reel_script) throw new Error("reel_script 없음 — push-reel-script 온보딩 필요");
  const scriptDoc = art.reel_script;            // claim 시점 스냅샷
  let runtime = art.reel_runtime ?? {};
  // sync: 로컬 script.json 갱신 (full 경로의 기존 TTS 스크립트 + 스튜디오 프리뷰 일치용)
  writeFileSync(join(ROOT, "src", "shorts", job.slug, "script.json"), JSON.stringify(toLocalScriptJson(scriptDoc), null, 2));

  if (job.kind === "full") throw new Error("full 파이프라인은 미구현(P3) — render 잡만 지원");
  const pre = renderPrecondition(runtime, job.lang);
  if (!pre.ok) throw new Error(pre.reason);

  const out = await renderStage(job, scriptDoc, runtime);
  await updateJob(job.id, { status: "upload", progress_note: "R2 업로드 중" });
  const videoUrl = await uploadR2(out, "marketing/reels/video"); // folder 만 전달 — 키({ts}-{rand})는 서버 생성이라 캐시 무효화 내장
  await mergeReelsVideoUrl(job.article_id, job.lang, videoUrl);
  await updateJob(job.id, { status: "done", finished_at: new Date().toISOString(), progress_note: "완료" });
  console.log(`✓ done ${job.slug}/${job.lang} → ${videoUrl}`);
}

async function pollOnce() {
  await heartbeat();
  const q = await (await rest("marketing_reel_jobs?status=eq.queued&order=requested_at.asc&limit=1")).json();
  if (!q.length) return false;
  const job = q[0];
  if (!(await claimJob(job.id))) return true;
  console.log(`▶ claim ${job.id} ${job.slug}/${job.lang} kind=${job.kind}`);
  try { await processJob(job); }
  catch (e) {
    console.error(`✗ failed: ${e?.message}`);
    await updateJob(job.id, { status: "failed", error: String(e?.stack || e).slice(0, 500) });
  }
  return true;
}

async function main() {
  assertEnv();
  await recoverStale();
  for (;;) {
    let worked = false;
    try { worked = await pollOnce(); } catch (e) { console.error("poll error:", e?.message); }
    if (!worked && !WATCH) break;
    if (!worked) await new Promise((r) => setTimeout(r, POLL_MS));
  }
  console.log("큐 비움 — 종료 (--watch 로 상주 가능)");
}
main();
