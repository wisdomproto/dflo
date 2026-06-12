// 릴 콘텐츠 온보딩: 로컬 script.json(+timing/음성/립싱크) → DB reel_script/reel_runtime + R2 preview.
// 사용: node scripts/push-reel-script.mjs <slug> --article <sortOrder> [--check] [--force]
// preflight: ① reel_script 기존재 시 --force 요구(웹 편집본 파괴 경로) ② active 잡 존재 시 거부 ③ insert 매칭 실패 시 중단.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ACTIVE_STATUSES, buildPushDoc, ttsTextSnapshot } from "./lib/reelWorkerLib.mjs";
import { assertEnv, rest, uploadR2 } from "./lib/reelDb.mjs";

const REMOTION = join(dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["ko", "th", "vi", "en", "cn", "ch"];

function parseArgs(argv) {
  const a = argv.slice(2);
  const flags = { check: a.includes("--check"), force: a.includes("--force") };
  const ai = a.indexOf("--article");
  const article = ai >= 0 ? a[ai + 1] : undefined;
  const slug = a.find((x) => !x.startsWith("--") && x !== article);
  return { slug, article, ...flags };
}

/** 언어별 보유 자산 탐지: timing-{lang}.json + 립싱크 mp4 + 청크 wav 전부. */
function detectLang(slug, lang, chunks) {
  const timingPath = join(REMOTION, "src", "shorts", slug, `timing-${lang}.json`);
  const videoPath = join(REMOTION, "public", "videos", `${slug}-presenter-lipsync-${lang}.mp4`);
  const audioDir = join(REMOTION, "public", "audio", "shorts", slug, lang);
  if (!existsSync(timingPath)) return { lang, ok: false, reason: `timing-${lang}.json 없음` };
  if (!existsSync(videoPath)) return { lang, ok: false, reason: `립싱크 mp4 없음` };
  const wavs = chunks.map((c) => join(audioDir, `${c.id}.wav`));
  const missing = chunks.filter((_, i) => !existsSync(wavs[i])).map((c) => c.id);
  if (missing.length) return { lang, ok: false, reason: `청크 음성 누락: ${missing.join(",")}` };
  return { lang, ok: true, timingPath, videoPath, audioDir };
}

async function main() {
  const { slug, article, check, force } = parseArgs(process.argv);
  if (!slug || !article) throw new Error("사용법: node scripts/push-reel-script.mjs <slug> --article <sortOrder> [--check] [--force]");
  assertEnv();

  // 1) 로컬 script.json 로드
  const scriptPath = join(REMOTION, "src", "shorts", slug, "script.json");
  if (!existsSync(scriptPath)) throw new Error(`script.json 없음: ${scriptPath}`);
  const local = JSON.parse(readFileSync(scriptPath, "utf8"));
  const chunks = local.chunks ?? [];
  console.log(`▶ ${slug} (sort_order=${article}) — 청크 ${chunks.length}개`);

  // 2) article 조회
  const rows = await (await rest(`marketing_articles?sort_order=eq.${article}&select=id,reel_script,reel_assets`)).json();
  if (!rows.length) throw new Error(`sort_order=${article} 인 콘텐츠 없음`);
  const { id: articleId, reel_script: existing, reel_assets: reelAssets } = rows[0];
  console.log(`  article id=${articleId}, reel_assets infographics: ${Object.keys(reelAssets?.infographics ?? {}).length}개`);

  // 3) preflight
  if (existing) {
    const msg = `이미 reel_script 가 있습니다 — 웹 편집본을 덮어씁니다. 강제하려면 --force.`;
    if (!check && !force) { console.error(`✗ ${msg}`); process.exit(1); }
    console.log(`  ⚠ ${msg}${check ? " (--check)" : " (--force)"}`);
  }
  const active = await (await rest(`marketing_reel_jobs?article_id=eq.${articleId}&status=in.(${ACTIVE_STATUSES.join(",")})&select=id,status`)).json();
  if (active.length) {
    const msg = `진행 중인 잡 ${active.length}건(${active.map((j) => j.status).join(",")}) — 완료/실패 후 재시도.`;
    if (!check) { console.error(`✗ ${msg}`); process.exit(1); }
    console.log(`  ⚠ ${msg} (--check)`);
  }

  // 4) reel_script doc 구성 (insert 매칭 실패 시 throw)
  const doc = buildPushDoc(local, reelAssets);
  console.log(`  reel_script 구성 OK — insert 인서트 ${doc.script.chunks.filter((c) => c.insert).length}개 치환`);

  // 5) 언어 탐지
  const detected = LANGS.map((l) => detectLang(slug, l, chunks));
  for (const d of detected) console.log(`  [${d.lang}] ${d.ok ? "보유 ✓" : "미보유 — " + d.reason}`);
  const ready = detected.filter((d) => d.ok);

  if (check) {
    console.log(`\n[--check] 무변경 종료. 시드 가능 언어: ${ready.map((d) => d.lang).join(", ") || "(없음)"}`);
    return;
  }

  // 6) 언어별 preview 업로드 → runtime 구성
  const runtime = { timing: {}, preview: {}, tts_text: {} };
  for (const d of ready) {
    console.log(`  ↥ [${d.lang}] preview 업로드…`);
    const folder = `marketing/reels/preview/${articleId}/${d.lang}`;
    const timing = JSON.parse(readFileSync(d.timingPath, "utf8"));
    const lipsyncUrl = await uploadR2(d.videoPath, folder);
    const audio = {};
    for (const c of chunks) audio[c.id] = await uploadR2(join(d.audioDir, `${c.id}.wav`), folder);
    runtime.timing[d.lang] = timing;
    runtime.preview[d.lang] = { lipsyncUrl, audio };
    runtime.tts_text[d.lang] = ttsTextSnapshot(chunks, d.lang);
  }

  // 7) PATCH (시드 = 전체 작성이라 단순 set)
  await rest(`marketing_articles?id=eq.${articleId}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ reel_script: doc, reel_runtime: runtime, updated_at: new Date().toISOString() }),
  });

  // 8) 요약
  console.log(`\n✓ 저장 완료 — reel_script + reel_runtime`);
  console.log(`  lang | timing | preview | tts_text`);
  for (const l of LANGS) {
    const has = (o) => (o[l] ? "✓" : "·");
    console.log(`  ${l.padEnd(4)} |   ${has(runtime.timing)}    |    ${has(runtime.preview)}    |    ${has(runtime.tts_text)}`);
  }
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
