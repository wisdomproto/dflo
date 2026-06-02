// scripts/extract-marketing-data.mjs
// One-time extractor: parses domestic-strategy.html <script> arrays (kwData/topics/ytRows)
// into committed JSON. Pure Node (no cheerio). Re-run after the source HTML changes.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(process.cwd());
const SRC_HTML = resolve(ROOT, 'public/marketing/strategy/domestic-strategy.html');
const OUT_DIR = resolve(ROOT, 'src/features/marketing/data');

// 8-doc viewer manifest (filenames fixed by Task 1.1).
export const STRATEGY_INDEX = [
  { file: 'domestic-strategy.html', title: '국내 마케팅 마스터', description: '키워드·주제·예산·채널·퍼널·KPI 종합', group: '국내', order: 1 },
  { file: 'global-market.html', title: '글로벌 시장 분석 (10개국)', description: '검색량·CPC·골든키워드 국가별 매트릭스', group: '글로벌', order: 2 },
  { file: 'global-strategy.html', title: '글로벌 실행 전략', description: 'hub-spoke·퍼널·24개월 로드맵', group: '글로벌', order: 3 },
  { file: 'th-operations.html', title: '태국 작전', description: '페르소나·키워드·예산·90일 캘린더', group: '국가별 작전', order: 4 },
  { file: 'vn-operations.html', title: '베트남 작전', description: 'Zalo·TikTok 중심', group: '국가별 작전', order: 5 },
  { file: 'en-operations.html', title: '영어 4시장 작전', description: 'US·IN·PH·MY', group: '국가별 작전', order: 6 },
  { file: 'us-korean-operations.html', title: '미국 한인 작전', description: '디아스포라 Meta 리드젠', group: '국가별 작전', order: 7 },
  { file: 'youtube-analysis.html', title: '유튜브 채널 분석', description: '@187growup 성과 분석', group: '채널분석', order: 8 },
];

// Bracket-depth scanner (string/escape aware) → JSON.parse a `const NAME=[ ... ];` array.
function extractArray(html, name) {
  const start = html.indexOf('const ' + name + '=');
  if (start < 0) throw new Error(`array not found: ${name}`);
  let i = html.indexOf('[', start);
  let depth = 0, inStr = false, q = '', out = '';
  for (; i < html.length; i++) {
    const c = html[i];
    out += c;
    if (inStr) { if (c === q && html[i - 1] !== '\\') inStr = false; continue; }
    if (c === '"' || c === "'") { inStr = true; q = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) break; }
  }
  return JSON.parse(out);
}

function categoryMap(html) {
  const re = /<div class="cycle-letter"[^>]*>([A-E])<\/div><div class="cycle-name">([^<]+)<\/div>/g;
  const map = {};
  let m;
  while ((m = re.exec(html))) map[m[1]] = m[2].trim();
  return map;
}

function toCompetition(s) {
  if (s === '높음') return 'high';
  if (s === '낮음') return 'low';
  return 'medium';
}

// Pure transform — used by tests. Input: HTML string. Output: { keywords, topics }.
export function extractDomestic(html) {
  const kwData = extractArray(html, 'kwData');   // [kw, pc, mobile, total, comp, tag]
  const topics = extractArray(html, 'topics');   // [id, cat, title, angle, kwStr, source]
  const ytRows = extractArray(html, 'ytRows');   // [id, status, title, note]
  const catNames = categoryMap(html);

  const keywords = kwData.map((r) => {
    const tag = String(r[5] ?? '');
    return {
      keyword: String(r[0] ?? ''),
      pcSearch: Number(r[1]) || 0,
      mobileSearch: Number(r[2]) || 0,
      totalSearch: Number(r[3]) || 0,
      competition: toCompetition(String(r[4] ?? '')),
      category: tag,
      isGolden: tag.includes('gold'),
    };
  }).filter((k) => k.keyword);

  const statusById = new Map(ytRows.map((r) => [String(r[0]), String(r[1] || 'new')]));

  const topicsOut = topics.map((r) => {
    const id = String(r[0] ?? '');
    const cat = String(r[1] ?? '');
    const raw = statusById.get(id) ?? 'new';
    const status = raw === 'done' || raw === 'similar' ? raw : 'new';
    return {
      id,
      category: cat,
      categoryName: catNames[cat] ?? cat,
      title: String(r[2] ?? ''),
      angle: String(r[3] ?? ''),
      keywords: String(r[4] ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      source: String(r[5] ?? ''),
      status,
    };
  }).filter((t) => t.title && t.category);

  return { keywords, topics: topicsOut };
}

function validate(keywords, topics) {
  const errs = [];
  if (keywords.length !== 72) errs.push(`keywords=${keywords.length} (expected 72)`);
  if (keywords.filter((k) => k.isGolden).length !== 4) errs.push('golden != 4');
  if (topics.length !== 78) errs.push(`topics=${topics.length} (expected 78)`);
  if (errs.length) throw new Error('extract validation failed: ' + errs.join('; '));
}

function writeJson(name, data) {
  const p = resolve(OUT_DIR, name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`[extract] wrote ${name} (${Array.isArray(data) ? data.length : '?'} rows)`);
}

function main() {
  const html = readFileSync(SRC_HTML, 'utf8');
  const { keywords, topics } = extractDomestic(html);
  validate(keywords, topics);
  writeJson('keywords.json', keywords);
  writeJson('topics.json', topics);
  writeJson('strategy-index.json', STRATEGY_INDEX);
  console.log('[extract] done.');
}

// Run main only when invoked directly (not when imported by tests). Cross-platform safe.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
