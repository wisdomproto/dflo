// 카드뉴스 ch(번체) 원본을 cn(간체) 변환 소스로 export.
// 출력: docs/cardnews/_cn/src/{idx}.json = { idx, cardnewsId, captionCh, hashtagsCh, slides:[비어있지않은 ch 슬라이드] }
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const env = {};
for (const l of readFileSync(join(root, "ai-server", ".env"), "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }
const U = env.SUPABASE_URL, K = env.SUPABASE_SERVICE_ROLE_KEY;
const rest = (p) => fetch(`${U}/rest/v1/${p}`, { headers: { apikey: K, Authorization: `Bearer ${K}` } });

const srcDir = join(here, "_cn", "src");
mkdirSync(srcDir, { recursive: true });

const cards = await (await rest("marketing_cardnews?select=id,content_id,captions,hashtags_i18n&order=id.asc")).json();
const slides = await (await rest("marketing_cardnews_slides?select=id,cardnews_id,sort_order,role,is_cta,texts")).json();
const byCard = new Map();
for (const s of slides) { if (!byCard.has(s.cardnews_id)) byCard.set(s.cardnews_id, []); byCard.get(s.cardnews_id).push(s); }

let idx = 0, totalSlides = 0, nonEmpty = 0;
for (const c of cards) {
  idx++;
  const ss = (byCard.get(c.id) || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const slideOut = [];
  for (const s of ss) {
    totalSlides++;
    const ch = s.texts?.ch || {};
    const has = (ch.headline || "").trim() || (ch.subtext || "").trim();
    if (!has) continue;
    nonEmpty++;
    slideOut.push({ slideId: s.id, sort_order: s.sort_order, role: s.role, isCta: s.is_cta, ch: { headline: ch.headline || "", subtext: ch.subtext || "" } });
  }
  writeFileSync(join(srcDir, `${idx}.json`), JSON.stringify({
    idx, cardnewsId: c.id,
    captionCh: c.captions?.ch || "",
    hashtagsCh: c.hashtags_i18n?.ch || "",
    slides: slideOut,
  }, null, 1), "utf8");
}
console.log(`exported ${idx} cardnews → ${srcDir}`);
console.log(`슬라이드 총 ${totalSlides}개 중 비어있지 않은 ch ${nonEmpty}개 (나머지는 import 시 cn 빈값)`);
