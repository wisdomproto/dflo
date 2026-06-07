// Dump all 62 ko master articles → docs/blog/_src/{n}.json + topics.json (source corpus).
// Reusable by both the pilot workflow and the later bulk run. Run: node docs/blog/fetch-sources.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(__dirname, '..', '..', 'ai-server', '.env'), 'utf8');
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim();
const BASE = get('SUPABASE_URL') + '/rest/v1';
const KEY = get('SUPABASE_SERVICE_ROLE_KEY');
const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const SRC = join(__dirname, '_src');
mkdirSync(SRC, { recursive: true });

async function q(path) {
  const r = await fetch(BASE + path, { headers: h });
  if (!r.ok) throw new Error(r.status + ' ' + (await r.text()).slice(0, 300));
  return r.json();
}

const CAT = { 'A. 성장과학': 'A', 'B. 생활습관': 'B', 'C. 부모공감': 'C', 'D. 기타/트렌드': 'D' };

const rows = await q('/marketing_articles?select=id,topic_id,title,category,keywords,body,translations,sort_order&language=eq.ko&order=sort_order.asc');
const topics = [];
for (const a of rows) {
  const n = a.sort_order;
  const cat = CAT[a.category] || a.category;
  writeFileSync(join(SRC, `${n}.json`), JSON.stringify({
    n, id: a.id, title: a.title, category: a.category, cat,
    koKeywords: a.keywords || [],
    body: a.body || '',
    thBody: a.translations?.th?.body || '',
  }, null, 2), 'utf8');
  topics.push({ n, title: a.title, cat, categoryName: a.category, koKeywords: a.keywords || [] });
}
writeFileSync(join(SRC, 'topics.json'), JSON.stringify(topics, null, 2), 'utf8');
console.log(`Wrote ${rows.length} source files + topics.json to ${SRC}`);
console.log('Bodies present:', rows.filter((a) => (a.body || '').length > 500).length, '/', rows.length);
console.log('Existing th translations:', rows.filter((a) => a.translations?.th?.body).length);
