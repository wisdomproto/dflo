// scratchpad/blog-ar/{n}.json (에이전트 생성 아랍어) → marketing_articles.blog.ar.
//
// - n = sort_order. blog-src/{n}.json 에서 article id 를 얻고, DB 의 blog.en 에서 섹션
//   imageUrl 을 가져와 아랍어 섹션에 인덱스 정렬로 병합(섹션 이미지는 텍스트 없는 16:9,
//   전 언어 공통 — 아랍어 에이전트는 heading/html 만 생성하므로 여기서 채운다).
// - imagePrompt 도 en 것 유지. slug 는 에이전트가 en slug 를 그대로 복사(검증됨).
// - 쓰기는 service_role (marketing_articles UPDATE 는 RLS 로 anon 차단).
//
// 사용: node --import tsx scripts/merge-arabic-blog.mjs [--dry]

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
if (typeof process.loadEnvFile === 'function') {
  for (const f of ['../ai-server/.env', '.env.production', '.env.local']) {
    try { process.loadEnvFile(join(ROOT, f)); } catch { /* optional */ }
  }
}

const DRY = process.argv.includes('--dry');
const BASE = 'C:/Users/101024/AppData/Local/Temp/claude/c--projects-dflo-0-1--claude-worktrees-sad-wiles-b823c3/048e3c89-7040-44b8-826d-fea23db7920a/scratchpad';
const SRC = (n) => join(BASE, 'blog-src', `${n}.json`);
const AR = (n) => join(BASE, 'blog-ar', `${n}.json`);

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('SUPABASE_URL / SERVICE_ROLE_KEY 없음 (ai-server/.env 확인)'); process.exit(1); }
const sb = createClient(url, key);

const { data: rows, error } = await sb.from('marketing_articles').select('id, blog');
if (error) { console.error('marketing_articles 조회 실패:', error.message); process.exit(1); }
const byId = new Map((rows || []).map((r) => [r.id, r]));

let merged = 0, skipped = 0, warn = 0;
const problems = [];

for (let n = 1; n <= 60; n++) {
  if (!fs.existsSync(AR(n)) || !fs.existsSync(SRC(n))) { skipped++; problems.push(`${n}: 파일 없음`); continue; }
  let src, ar;
  try { src = JSON.parse(fs.readFileSync(SRC(n), 'utf8')); } catch (e) { skipped++; problems.push(`${n}: src 파싱실패`); continue; }
  try { ar = JSON.parse(fs.readFileSync(AR(n), 'utf8')); } catch (e) { skipped++; problems.push(`${n}: ar 파싱실패 ${e.message}`); continue; }

  const row = byId.get(src.id);
  if (!row) { skipped++; problems.push(`${n}: article ${src.id} 없음`); continue; }
  const en = row.blog?.en;
  if (!en) { skipped++; problems.push(`${n}: blog.en 없음`); continue; }

  const enSecs = en.sections || [];
  const arSecs = ar.sections || [];
  if (arSecs.length !== enSecs.length) { warn++; problems.push(`${n}: 섹션수 ar ${arSecs.length} != en ${enSecs.length}`); }

  const sections = arSecs.map((s, i) => ({
    heading: s.heading,
    html: s.html,
    imageUrl: enSecs[i]?.imageUrl,     // 전 언어 공통 섹션 이미지
    imagePrompt: enSecs[i]?.imagePrompt,
  }));

  const blogAr = {
    seoTitle: ar.seoTitle,
    metaDescription: ar.metaDescription,
    h1: ar.h1,
    slug: (ar.slug || en.slug || '').trim(),
    primaryKeyword: ar.primaryKeyword,
    secondaryKeywords: ar.secondaryKeywords || [],
    sections,
    faq: (ar.faq || []).map((f) => ({ q: f.q, a: f.a })),
  };

  if (DRY) { merged++; continue; }
  const newBlog = { ...(row.blog || {}), ar: blogAr };
  const { error: upErr } = await sb.from('marketing_articles').update({ blog: newBlog }).eq('id', src.id);
  if (upErr) { skipped++; problems.push(`${n}: update 실패 ${upErr.message}`); continue; }
  merged++;
}

console.log(`\n${DRY ? '[DRY] 병합 예정' : '병합 완료'}: ${merged} · 스킵 ${skipped} · 경고 ${warn}`);
if (problems.length) console.log('문제:\n  ' + problems.join('\n  '));
