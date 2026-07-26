import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { render } from './render.mjs';

function formatDate(iso, lang) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const fmt = new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : lang, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  return fmt.format(d);
}

// 참고문헌 헤딩은 전 로케일 영어 "References"(인용 항목이 영어라 헤딩만 현지어면 뒤죽박죽, 사용자 지정).

// 저자(원장) byline — E-E-A-T/GEO 권위 신호. 화면 노출 + author 스키마와 짝.
// 키 = locale.meta.lang (zh-hant/zh-hans/ar). 이름 표기는 각 로케일 director.name 관례를 따름
// (중국어·아랍어 로케일은 로마자 'Chae Yong-hyun', 태국어는 태국어 표기). 화자=남성 의사라
// 태국어 존칭 นพ.(남성 의사)·베트남어 BS. 사용.
// ★자격 표기 주의: 원장은 소아청소년과 '전문의'가 아니다(과거 표기 오류). 실제 = 호르몬 진료
// 전문 + 소아 성장 치료 15년+. 보드 전문과목을 단정하지 말고 진료 경력으로만 표기한다.
const BYLINE = {
  ko:        '글·의학 감수: 채용현 원장 · 호르몬·성장 치료 전문 (15년+)',
  en:        'Written and medically reviewed by Dr. Chae Yong-hyun — hormone & child-growth specialist (15+ years)',
  th:        'เขียนและตรวจสอบทางการแพทย์โดย นพ. แชยงฮยอน — ผู้เชี่ยวชาญด้านฮอร์โมนและการเจริญเติบโตในเด็ก (15+ ปี)',
  vi:        'Được viết và kiểm duyệt y khoa bởi BS. Chae Yong-hyun — chuyên gia nội tiết & tăng trưởng ở trẻ (hơn 15 năm)',
  'zh-hant': '由 Chae Yong-hyun 醫師撰寫並審閱 — 荷爾蒙與兒童生長診療專家（15年以上）',
  'zh-hans': '由 Chae Yong-hyun 医师撰写并审阅 — 荷尔蒙与儿童生长诊疗专家（15年以上）',
  ar:        'كتبه وراجعه طبياً الدكتور Chae Yong-hyun — أخصائي الهرمونات ونمو الأطفال (خبرة أكثر من 15 عامًا)',
};

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 아티클 단위 참고문헌 → <section> HTML. 빈 배열·undefined 면 '' (캐시 렌더 경로에서 inert).
export function renderReferencesHtml(references, lang) {
  if (!Array.isArray(references) || references.length === 0) return '';
  const heading = 'References';
  const items = references.map((r) => {
    const cite = [escapeHtml(r.title), [escapeHtml(r.journal), r.year ? escapeHtml(r.year) : ''].filter(Boolean).join('. ')]
      .filter(Boolean).join(' ');
    const links = [];
    if (r.url) links.push(`<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener nofollow">PubMed</a>`);
    if (r.doi) links.push(`<a href="https://doi.org/${escapeHtml(r.doi)}" target="_blank" rel="noopener nofollow">DOI</a>`);
    const tail = links.length ? ` <span class="ref-links">${links.join(' · ')}</span>` : '';
    return `<li>${cite}.${tail}</li>`;
  }).join('');
  return `<section class="post-references"><h2 class="post-references-title">${escapeHtml(heading)}</h2><ol class="post-references-list">${items}</ol></section>`;
}

export function renderPost({ post, template, locale, messenger, seoHead }) {
  const lang = locale.meta.lang;
  const data = {
    ...locale,
    messenger,
    seo_head: seoHead,
    post: {
      ...post,
      published_at_display: formatDate(post.published_at, lang),
      author_byline: BYLINE[lang] || BYLINE.en,
      references_html: renderReferencesHtml(post.references, lang),
    },
  };
  return render(template, data);
}

// 조립된 본문에서 첫 이미지 src 추출(카드 썸네일용). 없으면 '' → 템플릿이 브랜드 그라데이션 fallback.
function firstImageSrc(html) {
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html || '');
  return m ? m[1] : '';
}

export function renderIndex({ posts, template, locale, seoHead }) {
  const data = {
    ...locale,
    seo_head: seoHead,
    lang: locale.meta.lang,
    posts: posts.map((p) => {
      const thumb = firstImageSrc(p.body_html);
      return {
        lang: locale.meta.lang,
        slug: p.slug,
        title: p.title,
        meta_description: p.meta_description || '',
        published_at_display: formatDate(p.published_at, locale.meta.lang),
        // {{#if}} 미지원 미니 렌더러 → 인라인 style 문자열로 분기. 있으면 이미지가 그라데이션을 덮음.
        thumb_style: thumb ? `background-image:url('${thumb}')` : '',
      };
    }),
  };
  return render(template, data);
}

export function loadCachedPosts(cacheDir, lang) {
  const dir = join(cacheDir, lang);
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  return files.map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
}
