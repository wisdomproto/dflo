// 보라 프레임 재배포 릴스를 기존 marketing_articles(custom)의 reels.ko 에 교체 등록.
// - 렌더 37개: out/shorts/repurpose-ko-purple/_manifest.json
// - 완성본 4개: Downloads 폴더(v1→#1016, v2→#1012, v3→#1018 교체 / v4→신규 #1043)
// 매칭: sort_order = 1002 + (구 repurpose-ko manifest 내 index). reels.th 는 보존(비파괴 병합).
// ⚠️ R2 업로드는 ai-server(:4000) /api/r2/upload 경유 — `cd ai-server && npm run dev` 선행.
// 사용:
//   node scripts/register-purple-reels.mjs --dry   # 매칭·계획만
//   node scripts/register-purple-reels.mjs         # 실제 업로드 + 교체
import { rest, uploadR2, assertEnv, AI_BASE } from "./lib/reelDb.mjs";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const purpleDir = join(root, "out", "shorts", "repurpose-ko-purple");
const coverDir = join(root, "out", "_work", "covers-purple");
mkdirSync(coverDir, { recursive: true });

const DRY = process.argv.includes("--dry");
const HASHTAGS = "#키성장 #아이키 #성장클리닉 #187growup #키크는법";
const DOWNLOADS = "C:/Users/101024/Downloads";

assertEnv();

// 구 매니페스트(40) → id별 sort_order(1002 + index)
const prevManifest = JSON.parse(readFileSync(join(root, "out", "shorts", "repurpose-ko", "_manifest.json"), "utf8"));
const sortOrderById = new Map(prevManifest.map((r, i) => [r.id, 1002 + i]));

// 완성본 4개 (Downloads) — id·파일명·신규여부
const COMPLETED = [
  { id: "LXGI2XrPfOI", file: "170cm 이하라고 믿기 힘든 무대 장악력 남자 가수 10.mp4", kicker: "170cm 이하라고 믿기 힘든", title: "무대 장악력 남자 가수 10" },
  { id: "B9y6RmYQtj8", file: "키를 키우는 호르몬 오히려 아이 키를 멈춥니다.mp4", kicker: "키를 키우는 호르몬?", title: "오히려 아이 키를 멈춥니다" },
  { id: "9C7PIn1Bub0", file: "비율때문에 다들 속는 160cm이하 여배우 10.mp4", kicker: "비율 때문에 다들 속는", title: "160cm 이하 여배우 10" },
  { id: "__golden__", file: "연예인도 말한 황금 키 지금이 골든타임입니다!.mp4", kicker: "연예인도 말한 황금 키", title: "지금이 골든타임입니다!", isNew: true, newSortOrder: 1043 },
];

// 작업 목록 구성
const work = [];
// 렌더 37개
const rendered = JSON.parse(readFileSync(join(purpleDir, "_manifest.json"), "utf8"));
for (const r of rendered) {
  const so = sortOrderById.get(r.id);
  if (!so) { console.log(`  ⚠️ ${r.id}: 구 매니페스트에 없음 — skip`); continue; }
  work.push({ id: r.id, mp4: join(purpleDir, r.file), sortOrder: so, kicker: r.kicker, title: r.title });
}
// 완성본 4개
for (const c of COMPLETED) {
  const mp4 = join(DOWNLOADS, c.file);
  const so = c.isNew ? c.newSortOrder : sortOrderById.get(c.id);
  work.push({ id: c.id, mp4, sortOrder: so, kicker: c.kicker, title: c.title, isNew: !!c.isNew });
}

// 기존 custom 조회 (sort_order → row)
const existing = await (await rest(`marketing_articles?kind=eq.custom&select=id,title,sort_order,reels`)).json();
const bySort = new Map(existing.map((a) => [a.sort_order, a]));

console.log(`작업 ${work.length}개 (렌더 ${rendered.length} + 완성본 ${COMPLETED.length}), 기존 custom ${existing.length}개\n`);

// 계획 검토 (매칭·파일 존재)
let missing = 0;
for (const w of work) {
  const art = w.isNew ? null : bySort.get(w.sortOrder);
  const fileOk = existsSync(w.mp4);
  if (!fileOk) missing++;
  if (!w.isNew && !art) missing++;
  if (DRY) {
    const tag = w.isNew ? "NEW" : `#${w.sortOrder}`;
    const artT = art ? ` ↔ "${(art.title || "").slice(0, 26)}"` : (w.isNew ? " (신규 insert)" : " ❌매칭실패");
    console.log(`  ${tag} [${w.id.slice(0, 8)}] "${w.kicker} / ${w.title}"${artT}${fileOk ? "" : "  ❌파일없음: " + w.mp4}`);
  }
}
if (DRY) { console.log(`\n--dry: 업로드/교체 안 함. (파일없음/매칭실패 ${missing}건)`); process.exit(missing ? 1 : 0); }
if (missing) { console.error(`❌ 파일없음/매칭실패 ${missing}건 — 중단(--dry 로 확인).`); process.exit(1); }

// ai-server 확인
try { await fetch(`${AI_BASE}/api/r2/upload`, { method: "POST" }); }
catch { console.error(`❌ ai-server 미응답(${AI_BASE}) — R2 업로드 불가. cd ai-server && npm run dev`); process.exit(1); }

let done = 0, fail = 0;
for (const w of work) {
  const t0 = Date.now();
  try {
    const jpg = join(coverDir, `${w.sortOrder}.jpg`);
    if (!existsSync(jpg)) execFileSync("ffmpeg", ["-v", "error", "-ss", "0.5", "-i", w.mp4, "-frames:v", "1", "-y", jpg]);
    const videoUrl = await uploadR2(w.mp4, "marketing/reels");
    const coverUrl = await uploadR2(jpg, "marketing/reels/covers");
    const caption = `${w.kicker} ${w.title}`;
    const koReel = { videoUrl, coverUrl, coverAuto: true, caption, hashtags: HASHTAGS };
    if (w.isNew) {
      const row = {
        title: `${w.kicker} ${w.title}`, kind: "custom", language: "ko", status: "draft",
        body: "", category: "", keywords: [], sort_order: w.sortOrder,
        reels: { ko: koReel },
      };
      await rest("marketing_articles", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(row) });
    } else {
      const art = bySort.get(w.sortOrder);
      const reels = { ...(art.reels || {}), ko: { ...((art.reels || {}).ko || {}), ...koReel } }; // th 보존
      await rest(`marketing_articles?id=eq.${art.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ reels }) });
    }
    done++;
    console.log(`✅ [${done + fail}/${work.length}] ${w.isNew ? "NEW" : "#" + w.sortOrder} ${w.title}  (${Math.round((Date.now() - t0) / 1000)}s)`);
  } catch (e) {
    fail++;
    console.log(`❌ [${done + fail}/${work.length}] ${w.title}: ${e.message}`);
  }
}
console.log(`\nDONE: ${done} 등록, ${fail} 실패`);
