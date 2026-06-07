// Import 248 SEO blog articles → marketing_articles.blog JSONB (migration 045 required).
// Matches our topic n (1..62) to the existing ko master row by sort_order. Non-destructive:
// only the `blog` column is written; title/body/translations untouched.
// Idempotent: preserves any already-uploaded section imageUrl (merged by index).
// Run: node docs/blog/import-to-db.mjs
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(__dirname, '..', '..', 'ai-server', '.env'), 'utf8');
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim();
const BASE = get('SUPABASE_URL') + '/rest/v1';
const KEY = get('SUPABASE_SERVICE_ROLE_KEY');
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const ART = join(__dirname, 'articles');
const LANGS = ['ko', 'en', 'th', 'vi'];

async function q(path, opts = {}) {
  const r = await fetch(BASE + path, { headers: H, ...opts });
  if (!r.ok) throw new Error(r.status + ' ' + (await r.text()).slice(0, 300));
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

function toBlogLang(a, existing) {
  return {
    seoTitle: a.seoTitle || '',
    slug: a.slug || '',
    metaDescription: a.metaDescription || '',
    h1: a.h1 || '',
    primaryKeyword: a.primaryKeyword || '',
    secondaryKeywords: a.secondaryKeywords || [],
    sections: (a.sections || []).map((s, i) => ({
      heading: s.heading || '',
      html: s.html || '',
      imagePrompt: s.imagePrompt || '',
      imageUrl: existing?.sections?.[i]?.imageUrl ?? null, // preserve uploaded image
    })),
    faq: (a.faq || []).map((f) => ({ q: f.q || '', a: f.a || '' })),
  };
}

let ok = 0, skip = 0;
const fail = [];
for (let n = 1; n <= 62; n++) {
  // existing row (id + blog) by sort_order
  const rows = await q(`/marketing_articles?select=id,blog,title&language=eq.ko&sort_order=eq.${n}`);
  if (!rows || !rows.length) { fail.push(`#${n} (행 없음)`); continue; }
  const { id, blog: existing } = rows[0];
  const blog = {};
  let haveAll = true;
  for (const L of LANGS) {
    const fp = join(ART, `${n}-${L}.json`);
    if (!existsSync(fp)) { haveAll = false; continue; }
    const a = JSON.parse(readFileSync(fp, 'utf8'));
    blog[L] = toBlogLang(a, existing?.[L]);
  }
  if (!Object.keys(blog).length) { skip++; continue; }
  await q(`/marketing_articles?id=eq.${id}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ blog }) });
  ok++;
  if (!haveAll) console.log(`  ⚠ #${n}: 일부 언어 파일 누락 (있는 것만 import)`);
}
console.log(`\nDONE: ${ok}개 행에 blog import · skip ${skip} · 실패 ${fail.length}`);
if (fail.length) console.log('실패:', fail.join(', '));

// verify one
const check = await q('/marketing_articles?select=sort_order,blog&language=eq.ko&sort_order=eq.1');
const b1 = check?.[0]?.blog || {};
console.log('검증 #1 언어:', Object.keys(b1).join(', '), '| ko 섹션:', b1.ko?.sections?.length, '| ko slug:', b1.ko?.slug);
