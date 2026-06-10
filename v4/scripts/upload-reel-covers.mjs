// 372장 릴스 커버(remotion/out/marketing/thumbs/{n}-{lang}.png)를 R2에 올리고
// marketing_articles(sort_order=n).reels[lang].coverUrl 에 연결.
//   업로드: ai-server POST /api/r2/upload (PIN), 쓰기: txirmof service_role PostgREST PATCH.
//   기존 reels(videoUrl 등) 비파괴 병합. 시크릿은 ai-server/.env 에서 읽고 출력 안 함.
// 사용: node scripts/upload-reel-covers.mjs --check   (전제조건만 점검, 무변경)
//       node scripts/upload-reel-covers.mjs            (전체 업로드+연결)
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");                 // 프로젝트 루트
const thumbsDir = join(root, "remotion", "out", "marketing", "thumbs");

function parseEnv(p) {
  const out = {};
  if (!existsSync(p)) return out;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
const srv = parseEnv(join(root, "ai-server", ".env"));
const SUPABASE_URL = srv.SUPABASE_URL;
const SERVICE_KEY = srv.SUPABASE_SERVICE_ROLE_KEY;
const AI_BASE = "http://localhost:" + (srv.PORT || "4000");
const PIN = srv.WEBSITE_ADMIN_PIN || "8054";
const LANGS = ["ko", "th", "vi", "en", "cn", "ch"];
const CHECK = process.argv.includes("--check");

const rest = (path, opts = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("ai-server/.env 에 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음");

  // 1) reels 컬럼 존재 + 매핑
  const r = await rest("marketing_articles?select=id,sort_order,reels&order=sort_order.asc");
  if (!r.ok) {
    const t = await r.text();
    if (/reels/.test(t) && /column/.test(t)) throw new Error("reels 컬럼 없음 → migration 046 먼저 적용 필요");
    throw new Error(`articles 조회 실패 ${r.status}: ${t.slice(0, 200)}`);
  }
  const articles = await r.json();
  console.log(`articles: ${articles.length}개 (sort_order ${articles[0]?.sort_order}..${articles[articles.length - 1]?.sort_order})`);
  const withReels = articles.filter((a) => a.reels && Object.keys(a.reels).length).length;
  console.log(`reels 컬럼 OK. 기존 reels 있는 행: ${withReels}`);

  // 2) ai-server 살아있나
  let aiOk = false;
  try { const p = await fetch(`${AI_BASE}/api/r2/public-url`); aiOk = p.ok; } catch { /* down */ }
  console.log(`ai-server(${AI_BASE}): ${aiOk ? "OK" : "응답 없음"}`);

  // 3) 커버 파일 수
  const files = existsSync(thumbsDir) ? readdirSync(thumbsDir).filter((f) => /^\d+-(ko|th|vi|en|cn|ch)\.png$/.test(f)) : [];
  console.log(`커버 PNG: ${files.length}장 (기대 ${articles.length * LANGS.length})`);

  if (process.argv.includes("--verify")) {
    const v = await (await rest("marketing_articles?select=sort_order,reels&order=sort_order.asc")).json();
    const withCover = v.filter((a) => a.reels && LANGS.every((l) => a.reels[l]?.coverUrl)).length;
    console.log(`\n[--verify] 6언어 커버 모두 연결된 행: ${withCover}/${v.length}`);
    const sample = v.find((a) => a.sort_order === 1);
    console.log(`#1 reels.ko.coverUrl: ${sample?.reels?.ko?.coverUrl}`);
    const url = sample?.reels?.ko?.coverUrl;
    if (url) { const h = await fetch(url, { method: "HEAD" }); console.log(`HEAD ${h.status} ${h.headers.get("content-type")}`); }
    return;
  }
  if (CHECK) { console.log("\n[--check] 무변경 종료."); return; }
  if (!aiOk) throw new Error("ai-server 미실행 → `cd ai-server && npm run dev` 후 재시도");

  // 4) 업로드 + 연결
  const byOrder = new Map(articles.map((a) => [a.sort_order, a]));
  let up = 0, fail = 0, patched = 0;
  for (let n = 1; n <= 62; n++) {
    const a = byOrder.get(n);
    if (!a) { console.log(`#${n}: article 없음, skip`); continue; }
    const reels = { ...(a.reels || {}) };
    for (const lang of LANGS) {
      const f = join(thumbsDir, `${n}-${lang}.png`);
      if (!existsSync(f)) { fail++; console.log(`  miss ${n}-${lang}`); continue; }
      try {
        const fd = new FormData();
        fd.append("file", new Blob([readFileSync(f)], { type: "image/png" }), `${n}-${lang}.png`);
        fd.append("folder", "marketing/reels/covers");
        const ur = await fetch(`${AI_BASE}/api/r2/upload`, { method: "POST", headers: { "x-admin-pin": PIN }, body: fd });
        const b = await ur.json();
        if (!ur.ok || !b.success) throw new Error(b.error || `upload ${ur.status}`);
        reels[lang] = { videoUrl: reels[lang]?.videoUrl ?? null, coverUrl: b.url };
        up++;
      } catch (e) { fail++; console.log(`  FAIL ${n}-${lang}: ${e.message}`); }
    }
    const pr = await rest(`marketing_articles?id=eq.${a.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ reels }) });
    if (pr.ok) patched++; else console.log(`  PATCH FAIL #${n}: ${pr.status} ${(await pr.text()).slice(0, 120)}`);
    if (n % 10 === 0) console.log(`… #${n} (uploaded ${up}, patched ${patched}, fail ${fail})`);
  }
  console.log(`\nDONE: uploaded ${up}, patched ${patched} rows, fail ${fail}`);
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
