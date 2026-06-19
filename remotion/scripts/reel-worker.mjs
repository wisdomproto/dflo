// 릴 렌더 워커 — marketing_reel_jobs 폴링. --once(큐 소진 후 종료) / --watch(15s 상주).
// render 잡: DB script + R2 preview(전원격) → PresenterGeneric renderMedia → R2 업로드 → reels[lang].videoUrl.
// full 잡: TTS(gen-tts-short) → prep-lipsync + LatentSync 인퍼런스 → upload_preview(렌더보다 먼저) → mergeRuntime → 공통 render.
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import { execFileSync, spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ACTIVE_STATUSES, isStale, renderPrecondition, toLocalScriptJson, ttsTextSnapshot } from "./lib/reelWorkerLib.mjs";
import { assertEnv, rest, claimJob, updateJob, heartbeat, mergeRuntime, mergeReelsVideoUrl, uploadR2 } from "./lib/reelDb.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LS = "C:/Users/101024/lipsync/LatentSync"; // prep-lipsync.mjs:10 과 동일 상수
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

// 원장 영상 자연 길이(프레임) — 합성 길이와 다르면 PresenterShort 가 playbackRate 로 맞춤.
// 다국어 릴은 한국어 립싱크 영상을 재사용하는 경우가 있어(길이 불일치 → 멈춤) 실제 영상 길이를 측정해 넘긴다.
function probeVideoFrames(url) {
  try {
    const sec = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", url]).toString().trim());
    return sec > 0 ? Math.round(sec * 30) : undefined;
  } catch (e) { console.warn("  ffprobe videoFrames 실패(속도맞춤 생략, 1배):", e?.message); return undefined; }
}

async function renderStage(job, scriptDoc, runtime) {
  await updateJob(job.id, { status: "render", progress_note: "렌더 중" });
  const pv = runtime.preview[job.lang];
  const videoFrames = probeVideoFrames(pv.lipsyncUrl);
  // 에디터 프리뷰도 동일 속도로 맞추게 preview[lang].videoFrames 보존(립싱크URL/오디오 유지).
  if (videoFrames && pv.videoFrames !== videoFrames) {
    runtime = await mergeRuntime(job.article_id, job.lang, { preview: { ...pv, videoFrames } });
  }
  const inputProps = {
    script: scriptDoc.script, timing: runtime.timing[job.lang], lang: job.lang, slug: job.slug,
    assets: { videoSrc: pv.lipsyncUrl, audio: pv.audio, videoFrames },
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

// LatentSync 인퍼런스 — 블로킹 execFileSync 금지(수십 분 > stale 10분 → 다른 프로세스에 회수당함).
// spawn + Promise 로 exit 대기, 진행 중 60초마다 heartbeat(progress_note). interval 은 error/close 양 경로에서 반드시 clear.
function runLipsync(job) {
  const pythonPath = join(LS, ".venv", "Scripts", "python.exe");
  const args = ["-m", "scripts.inference", "--unet_config_path", "configs/unet/stage2.yaml",
    "--inference_ckpt_path", "checkpoints/latentsync_unet.pt", "--inference_steps", "20",
    "--guidance_scale", "1.5", "--enable_deepcache",
    "--video_path", `input/${job.slug}_${job.lang}_footage.mp4`,
    "--audio_path", `input/${job.slug}_${job.lang}.wav`,
    "--video_out_path", `output/${job.slug}_${job.lang}.mp4`];
  return new Promise((resolve, reject) => {
    const startMs = Date.now();
    const child = spawn(pythonPath, args, { stdio: "inherit", cwd: LS });
    const beat = setInterval(() => {
      const min = Math.round((Date.now() - startMs) / 60_000);
      updateJob(job.id, { progress_note: `인퍼런스 ${min}분 경과` }).catch(() => {});
    }, 60_000);
    child.on("error", (e) => { clearInterval(beat); reject(e); });
    child.on("close", (code) => {
      clearInterval(beat);
      if (code === 0) resolve();
      else reject(new Error(`LatentSync 인퍼런스 실패 (exit ${code})`));
    });
  });
}

async function processJob(job) {
  const art = (await (await rest(`marketing_articles?id=eq.${job.article_id}&select=reel_script,reel_runtime`)).json())[0];
  if (!art?.reel_script) throw new Error("reel_script 없음 — push-reel-script 온보딩 필요");
  const scriptDoc = art.reel_script;            // claim 시점 스냅샷
  let runtime = art.reel_runtime ?? {};
  // sync: 로컬 script.json 갱신 (full 경로의 기존 TTS 스크립트 + 스튜디오 프리뷰 일치용)
  writeFileSync(join(ROOT, "src", "shorts", job.slug, "script.json"), JSON.stringify(toLocalScriptJson(scriptDoc), null, 2));

  if (job.kind === "full") {
    // 3a. TTS (기존 스크립트 무수정 재사용 — sync 된 script.json 을 읽는다)
    await updateJob(job.id, { status: "tts", progress_note: "클론음성 생성 중" });
    execFileSync("node", [join(ROOT, "scripts", "gen-tts-short.mjs"), job.slug, job.lang], { stdio: "inherit", cwd: ROOT });
    const timing = JSON.parse(readFileSync(join(ROOT, "src", "shorts", job.slug, `timing-${job.lang}.json`), "utf8"));
    if (!timing.length) throw new Error(`이 언어(${job.lang}) 나레이션이 script 에 없음 — TTS 결과 0청크`); // gen-tts 는 전 청크 skip 시에도 exit 0
    // 3b. 립싱크 입력 준비 + LatentSync 인퍼런스 (GPU, 수십 분 가능)
    await updateJob(job.id, { status: "lipsync", progress_note: "립싱크 입력 준비" });
    execFileSync("node", [join(ROOT, "scripts", "prep-lipsync.mjs"), job.slug, job.lang], { stdio: "inherit", cwd: ROOT });
    await updateJob(job.id, { progress_note: "LatentSync 인퍼런스 중 (GPU)" });
    await runLipsync(job);
    const lsOut = join(LS, "output", `${job.slug}_${job.lang}.mp4`);
    if (!existsSync(lsOut)) throw new Error("LatentSync exit 0 인데 산출물 없음: " + lsOut);
    const localLip = join(ROOT, "public", "videos", `${job.slug}-presenter-lipsync-${job.lang}.mp4`);
    mkdirSync(dirname(localLip), { recursive: true });
    copyFileSync(lsOut, localLip); // 스튜디오/레거시 호환 배치
    // 4. upload_preview — 렌더(전원격)보다 먼저! (bundle 캐시 안전의 전제)
    await updateJob(job.id, { status: "upload_preview", progress_note: "미리보기 에셋 업로드" });
    const folder = `marketing/reels/preview/${job.article_id}/${job.lang}`; // ASCII folder — 한글 slug 금지(서버가 strip)
    const lipsyncUrl = await uploadR2(localLip, folder);
    const audio = {};
    for (const t of timing)
      audio[t.id] = await uploadR2(join(ROOT, "public", "audio", "shorts", job.slug, job.lang, `${t.id}.wav`), folder);
    runtime = await mergeRuntime(job.article_id, job.lang, {
      timing, preview: { lipsyncUrl, audio }, tts_text: ttsTextSnapshot(scriptDoc.script.chunks, job.lang),
    });
  }
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
