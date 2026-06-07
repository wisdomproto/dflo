// Google-tuned on-page SEO audit for generated blog articles (rule-based, language-aware).
// Differs from v4 seoScorer.ts (Naver-tuned: title 15-25 chars, no meta-length check).
// Keyword matching is TOKEN-based: tolerant of inserted stop words ("side effects IN children"),
// word reordering, and ko spacing variants ("키 성장" == "키성장"). Thai (no spaces) → chunk match.
// Article shape: { language, primaryKeyword, secondaryKeywords[], seoTitle, slug,
//                  metaDescription, h1, sections:[{heading,html,imagePrompt}], faq:[{q,a}] }

const stripHtml = (h) => String(h || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const normalize = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const noSpace = (s) => normalize(s).replace(/\s+/g, '');
const isWide = (lang) => lang === 'ko' || lang === 'th'; // wide glyphs → tighter SERP char limits
const gradeOf = (r) => (r >= 0.9 ? 'A' : r >= 0.8 ? 'B' : r >= 0.7 ? 'C' : r >= 0.6 ? 'D' : 'F');

const STOP = new Set(['in', 'of', 'to', 'for', 'the', 'a', 'an', 'and', 'or', 'vs', 'your', 'my', 'do', 'does', 'is', 'are', 'how', 'what', 'with', 'on', '&', '에', '의', '을', '를', '이', '가', '은', '는']);
function tokenize(kw) {
  const n = normalize(kw);
  if (!n) return [];
  const parts = n.split(' ').filter(Boolean);
  if (parts.length <= 1) return [noSpace(n)]; // single chunk (Thai / Korean compound)
  const sig = parts.filter((w) => !STOP.has(w) && w.length >= 2);
  return sig.length ? sig : parts;
}
// 0..1 — how fully the keyword is present (exact > spacing-variant > token coverage)
// longest contiguous chunk of kw found in text, as ratio of kw length (no-space scripts like Thai)
function lcsRatio(text, kw) {
  const t = noSpace(text), k = noSpace(kw);
  if (!k) return 0;
  const min = Math.ceil(k.length * 0.5);
  for (let len = k.length; len >= min; len--)
    for (let i = 0; i + len <= k.length; i++)
      if (t.includes(k.slice(i, i + len))) return len / k.length;
  return 0;
}
function kwCoverage(text, kw) {
  if (!kw) return 0;
  const ht = normalize(text);
  if (ht.includes(normalize(kw))) return 1;
  if (noSpace(text).includes(noSpace(kw))) return 1;
  const toks = tokenize(kw);
  const hns = noSpace(text);
  let cov = toks.length ? toks.filter((t) => ht.includes(t) || hns.includes(t)).length / toks.length : 0;
  if (toks.length <= 1) cov = Math.max(cov, lcsRatio(text, kw)); // Thai/no-space: credit partial contiguous overlap
  return cov;
}
const kwPresent = (text, kw, th = 0.75) => kwCoverage(text, kw) >= th;
function exactCount(text, kw) {
  const t = noSpace(text), k = noSpace(kw);
  if (!k) return 0;
  let c = 0, p = 0;
  while ((p = t.indexOf(k, p)) !== -1) { c++; p += k.length; }
  return c;
}

export function scoreArticle(a, lang) {
  const L = lang || a.language;
  const wide = isWide(L);
  const d = [];
  const push = (label, score, max, msg) => {
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
    let s = 0, m = [];
    const cov = kwCoverage(t, primary);
    if (cov >= 0.75) {
      s += 8; m.push(cov === 1 ? 'primary 포함' : 'primary 어구 포함');
      const pos = noSpace(t).indexOf(noSpace(tokenize(primary)[0] || primary));
      if (pos >= 0 && pos <= Math.floor(noSpace(t).length / 3)) { s += 4; m[m.length - 1] = m[m.length - 1].replace('포함', '앞쪽 포함'); }
    } else m.push('제목에 primary 약함');
    push('제목 키워드', s, 12, m.join(', '));
  }
  // 2) 제목 길이 (8) — 구글 SERP (ko/th 글자 폭 넓음)
  {
    const t = a.seoTitle || '', good = wide ? 40 : 60, warn = wide ? 50 : 70;
    let s, msg;
    if (!t.length) { s = 0; msg = '제목 없음'; }
    else if (t.length <= good) { s = 8; msg = `${t.length}자 (≤${good} 양호)`; }
    else if (t.length <= warn) { s = 5; msg = `${t.length}자 (권장 ≤${good})`; }
    else { s = 1; msg = `${t.length}자 (김, ≤${good} 권장)`; }
    push('제목 길이', s, 8, msg);
  }
  // 3) 메타 설명 (14) — 존재 + 키워드 + 길이
  {
    const md = a.metaDescription || '';
    if (!md) push('메타 설명', 0, 14, 'meta 없음');
    else {
      let s = 4, m = [];
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
    let s, msg;
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
    let s, msg;
    if (!h1) { s = 0; msg = 'H1 없음'; }
    else if (kwPresent(h1, primary)) { s = 8; msg = 'primary 포함'; }
    else { s = 3; msg = 'H1에 primary 약함'; }
    push('H1', s, 8, msg);
  }
  // 6) 첫 문단 키워드 (10)
  {
    const first = body.slice(0, 200);
    let s, msg;
    if (first.length < 50) { s = 0; msg = '도입부 짧음'; }
    else if (kwPresent(first, primary, 0.7)) { s = 10; msg = '첫 문단에 primary'; }
    else if (kwCoverage(first, primary) >= 0.4) { s = 6; msg = '첫 문단에 일부'; }
    else { s = 3; msg = '첫 문단에 primary 권장'; }
    push('첫 문단', s, 10, msg);
  }
  // 7) 키워드 사용 (12) — 정확 반복 우선, 없으면 어구 커버리지
  {
    let s, msg;
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
  // 8) 보조 키워드 사용 (8)
  {
    let s, msg;
    if (!secondary.length) { s = 4; msg = '보조 키워드 없음'; }
    else {
      const used = secondary.filter((k) => kwPresent(body, k, 0.7) || kwPresent(headings, k, 0.7)).length;
      s = Math.round((used / secondary.length) * 8); msg = `${used}/${secondary.length} 사용`;
    }
    push('보조 키워드', s, 8, msg);
  }
  // 9) 구조화 (12) — H2 개수 + 리스트
  {
    const h2 = (a.sections || []).length, hasList = /<(ul|ol)[\s>]/i.test(bodyHtml);
    let s = 0, m = [];
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

// Cross-article cannibalization: same primaryKeyword on 2+ topics within a language.
// input: { ko:[{n,primaryKeyword}], en:[...], th:[...], vi:[...] }
export function findCannibalization(mappingsByLang) {
  const out = {};
  for (const lang of Object.keys(mappingsByLang)) {
    const groups = {};
    for (const m of mappingsByLang[lang] || []) {
      const k = noSpace(m.primaryKeyword || '');
      if (!k) continue;
      (groups[k] = groups[k] || []).push(m.n);
    }
    out[lang] = Object.entries(groups).filter(([, ns]) => ns.length > 1).map(([keyword, topics]) => ({ keyword, topics }));
  }
  return out;
}
