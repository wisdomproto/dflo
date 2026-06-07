// One-off: inspect marketing_articles (ko master) + dump pilot bodies.
// Reads creds from ai-server/.env. Run: node docs/blog/probe.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(__dirname, '..', '..', 'ai-server', '.env'), 'utf8');
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim();
const BASE = get('SUPABASE_URL') + '/rest/v1';
const KEY = get('SUPABASE_SERVICE_ROLE_KEY');
const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function q(path) {
  const r = await fetch(BASE + path, { headers: h });
  if (!r.ok) throw new Error(r.status + ' ' + (await r.text()).slice(0, 300));
  return r.json();
}

// 1) schema probe
const one = await q('/marketing_articles?select=*&limit=1');
console.log('COLUMNS:', Object.keys(one[0] || {}).join(', '));

// 2) full list (ko)
let list;
try {
  list = await q('/marketing_articles?select=id,topic_id,title,category,status,sort_order,language&order=sort_order.asc');
} catch (e) {
  console.error('order by sort_order failed:', e.message);
  list = await q('/marketing_articles?select=id,topic_id,title,category,status,language');
}
const ko = list.filter((a) => !a.language || a.language === 'ko');
console.log('\nTOTAL rows:', list.length, '| KO master:', ko.length);
const byCat = ko.reduce((m, a) => { m[a.category] = (m[a.category] || 0) + 1; return m; }, {});
console.log('BY CATEGORY:', JSON.stringify(byCat));
console.log('\n--- KO LIST ---');
console.log(ko.map((a) => `${a.sort_order ?? '?'}\t[${a.topic_id || a.category}]\t${a.title}\t(${a.status})`).join('\n'));

// 3) pilot bodies — pick by topic_id (A-01 science, C-02 case, D-01 howto), fallback to title match
const wantTopics = ['A-01', 'C-02', 'D-01'];
const wantTitleHints = ['유전 80', '성조숙증+비만', '깊은 잠'];
const pilots = [];
for (let i = 0; i < wantTopics.length; i++) {
  let row = ko.find((a) => a.topic_id === wantTopics[i]);
  if (!row) row = ko.find((a) => a.title && a.title.includes(wantTitleHints[i]));
  if (row) pilots.push(row);
}
console.log('\n--- PILOT BODIES ---');
for (const p of pilots) {
  const full = await q(`/marketing_articles?select=id,topic_id,title,category,keywords,body,translations&id=eq.${p.id}`);
  const a = full[0];
  const tr = a.translations && typeof a.translations === 'object' ? Object.keys(a.translations) : [];
  console.log(`\n===== ${a.topic_id || ''} | ${a.title} =====`);
  console.log('keywords:', JSON.stringify(a.keywords));
  console.log('translations langs:', JSON.stringify(tr));
  console.log('body length:', (a.body || '').length);
  console.log('--- BODY ---\n' + (a.body || '(empty)'));
}
