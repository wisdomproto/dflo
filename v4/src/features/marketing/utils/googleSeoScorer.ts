// docs/blog/lib/seo-check.mjs 의 구글 기준 on-page SEO 점수기를 클라이언트 TS로 포팅.
// 입력은 BlogSeoArticle. 순수 함수(Node 의존 없음). 점수 영구 저장 안 함.
import type { BlogSeoArticle } from '../types';

export type SeoStatus = 'good' | 'warn' | 'bad';
export interface SeoDetail { label: string; score: number; max: number; status: SeoStatus; msg: string }
export interface SeoResult { score: number; max: number; grade: string; details: SeoDetail[] }

const stripHtml = (h: string) => String(h || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const normalize = (s: string) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const noSpace = (s: string) => normalize(s).replace(/\s+/g, '');
const isWide = (lang: string) => lang === 'ko' || lang === 'th';
const gradeOf = (r: number) => (r >= 0.9 ? 'A' : r >= 0.8 ? 'B' : r >= 0.7 ? 'C' : r >= 0.6 ? 'D' : 'F');

const STOP = new Set(['in', 'of', 'to', 'for', 'the', 'a', 'an', 'and', 'or', 'vs', 'your', 'my', 'do', 'does', 'is', 'are', 'how', 'what', 'with', 'on', '&', '에', '의', '을', '를', '이', '가', '은', '는']);

function tokenize(kw: string): string[] {
  const n = normalize(kw);
  if (!n) return [];
  const parts = n.split(' ').filter(Boolean);
  if (parts.length <= 1) return [noSpace(n)];
  const sig = parts.filter((w) => !STOP.has(w) && w.length >= 2);
  return sig.length ? sig : parts;
}
function lcsRatio(text: string, kw: string): number {
  const t = noSpace(text), k = noSpace(kw);
  if (!k) return 0;
  const min = Math.ceil(k.length * 0.5);
  for (let len = k.length; len >= min; len--)
    for (let i = 0; i + len <= k.length; i++)
      if (t.includes(k.slice(i, i + len))) return len / k.length;
  return 0;
}
function kwCoverage(text: string, kw: string): number {
  if (!kw) return 0;
  const ht = normalize(text);
  if (ht.includes(normalize(kw))) return 1;
  if (noSpace(text).includes(noSpace(kw))) return 1;
  const toks = tokenize(kw);
  const hns = noSpace(text);
  let cov = toks.length ? toks.filter((t) => ht.includes(t) || hns.includes(t)).length / toks.length : 0;
  if (toks.length <= 1) cov = Math.max(cov, lcsRatio(text, kw));
  return cov;
}
const kwPresent = (text: string, kw: string, th = 0.75) => kwCoverage(text, kw) >= th;
function exactCount(text: string, kw: string): number {
  const t = noSpace(text), k = noSpace(kw);
  if (!k) return 0;
  let c = 0, p = 0;
  while ((p = t.indexOf(k, p)) !== -1) { c++; p += k.length; }
  return c;
}

export function scoreArticle(a: BlogSeoArticle, lang: string): SeoResult {
  const wide = isWide(lang);
  const d: SeoDetail[] = [];
  const push = (label: string, score: number, max: number, msg: string) => {
    const r = max ? score / max : 0;
    d.push({ label, score, max, status: r >= 0.85 ? 'good' : r >= 0.5 ? 'warn' : 'bad', msg });
  };
  const bodyHtml = (a.sections || []).map((s) => s.html || '').join(' ');
  const body = stripHtml(bodyHtml);
  const headings = (a.sections || []).map((s) => s.heading || '').join(' ');
  const primary = a.primaryKeyword || '';
  const secondary = a.secondaryKeywords || [];

  // 1) 제목 키워드 + 앞쪽 배치 (12)
  {
    const t = a.seoTitle || '';
    let s = 0; const m: string[] = [];
    const cov = kwCoverage(t, primary);
    if (cov >= 0.75) {
      s += 8; m.push(cov === 1 ? 'primary 포함' : 'primary 어구 포함');
      const pos = noSpace(t).indexOf(noSpace(tokenize(primary)[0] || primary));
      if (pos >= 0 && pos <= Math.floor(noSpace(t).length / 3)) { s += 4; m[m.length - 1] = m[m.length - 1].replace('포함', '앞쪽 포함'); }
    } else m.push('제목에 primary 약함');
    push('제목 키워드', s, 12, m.join(', '));
  }
  // 2) 제목 길이 (8)
  {
    const t = a.seoTitle || '', good = wide ? 40 : 60, warn = wide ? 50 : 70;
    let s: number, msg: string;
    if (!t.length) { s = 0; msg = '제목 없음'; }
    else if (t.length <= good) { s = 8; msg = `${t.length}자 (≤${good} 양호)`; }
    else if (t.length <= warn) { s = 5; msg = `${t.length}자 (권장 ≤${good})`; }
    else { s = 1; msg = `${t.length}자 (김, ≤${good} 권장)`; }
    push('제목 길이', s, 8, msg);
  }
  // 3) 메타 설명 (14)
  {
    const md = a.metaDescription || '';
    if (!md) push('메타 설명', 0, 14, 'meta 없음');
    else {
      let s = 4; const m: string[] = [];
      if (kwPresent(md, primary)) { s += 5; m.push('primary 포함'); } else m.push('primary 약함');
      const lo = wide ? 50 : 110, hi = wide ? 120 : 160, hardHi = wide ? 135 : 175;
      if (md.length >= lo && md.length <= hi) { s += 5; m.push(`${md.length}자 OK`); }
      else if (md.length < lo) { s += 2; m.push(`${md.length}자 짧음(≥${lo})`); }
      else if (md.length <= hardHi) { s += 3; m.push(`${md.length}자 약간 김`); }
      else { s += 1; m.push(`${md.length}자 김(≤${hi})`); }
      push('메타 설명', s, 14, m.join(', '));
    }
  }
  // 4) Slug (6)
  {
    const sl = a.slug || '', ok = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sl), words = sl.split('-').length;
    let s: number, msg: string;
    if (!sl) { s = 0; msg = 'slug 없음'; }
    else if (ok && words <= 7) { s = 6; msg = sl; }
    else if (ok && words <= 10) { s = 5; msg = `${sl} (${words}단어, 약간 김)`; }
    else if (ok) { s = 3; msg = `${sl} (${words}단어, 김)`; }
    else { s = 2; msg = `${sl} (소문자-하이픈 권장)`; }
    push('Slug', s, 6, msg);
  }
  // 5) H1 키워드 (8)
  {
    const h1 = a.h1 || '';
    let s: number, msg: string;
    if (!h1) { s = 0; msg = 'H1 없음'; }
    else if (kwPresent(h1, primary)) { s = 8; msg = 'primary 포함'; }
    else { s = 3; msg = 'H1에 primary 약함'; }
    push('H1', s, 8, msg);
  }
  // 6) 첫 문단 키워드 (10)
  {
    const first = body.slice(0, 200);
    let s: number, msg: string;
    if (first.length < 50) { s = 0; msg = '도입부 짧음'; }
    else if (kwPresent(first, primary, 0.7)) { s = 10; msg = '첫 문단에 primary'; }
    else if (kwCoverage(first, primary) >= 0.4) { s = 6; msg = '첫 문단에 일부'; }
    else { s = 3; msg = '첫 문단에 primary 권장'; }
    push('첫 문단', s, 10, msg);
  }
  // 7) 키워드 사용 (12)
  {
    let s: number, msg: string;
    if (!primary) { s = 0; msg = 'primary 없음'; }
    else {
      const c = exactCount(body, primary), cov = kwCoverage(body, primary);
      if (c >= 2) { s = 12; msg = `정확 ${c}회`; }
      else if (c === 1) { s = 10; msg = '정확 1회 + 본문 사용'; }
      else if (cov >= 0.85) { s = 9; msg = '어구 분산 사용(변형 포함)'; }
      else if (cov >= 0.5) { s = 6; msg = '어구 일부만 사용'; }
      else { s = 0; msg = '본문에 primary 거의 없음'; }
    }
    push('키워드 사용', s, 12, msg);
  }
  // 8) 보조 키워드 (8)
  {
    let s: number, msg: string;
    if (!secondary.length) { s = 4; msg = '보조 키워드 없음'; }
    else {
      const used = secondary.filter((k) => kwPresent(body, k, 0.7) || kwPresent(headings, k, 0.7)).length;
      s = Math.round((used / secondary.length) * 8); msg = `${used}/${secondary.length} 사용`;
    }
    push('보조 키워드', s, 8, msg);
  }
  // 9) 구조화 (12)
  {
    const h2 = (a.sections || []).length, hasList = /<(ul|ol)[\s>]/i.test(bodyHtml);
    let s = 0; const m: string[] = [];
    if (h2 >= 3) { s += 8; m.push(`H2 ${h2}개`); } else if (h2 >= 2) { s += 5; m.push(`H2 ${h2}개(≥3 권장)`); } else { s += 2; m.push(`H2 ${h2}개`); }
    if (hasList) { s += 4; m.push('리스트'); } else m.push('리스트 없음');
    push('구조화', Math.min(12, s), 12, m.join(', '));
  }
  // 10) FAQ (5)
  {
    const f = (a.faq || []).length;
    push('FAQ', f >= 2 ? 5 : f === 1 ? 3 : 0, 5, `${f}개`);
  }
  // 11) 섹션 이미지 프롬프트 (5)
  {
    const secs = a.sections || [], withImg = secs.filter((s) => s.imagePrompt && s.imagePrompt.trim()).length;
    push('이미지 프롬프트', secs.length && withImg === secs.length ? 5 : Math.round((withImg / Math.max(1, secs.length)) * 5), 5, `${withImg}/${secs.length} 섹션`);
  }

  const score = d.reduce((x, y) => x + y.score, 0);
  const max = d.reduce((x, y) => x + y.max, 0);
  return { score, max, grade: gradeOf(max ? score / max : 0), details: d };
}
