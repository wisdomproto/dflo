import { existsSync } from 'node:fs';
import { join } from 'node:path';

// 렌더된 HTML에서 프로그램 이미지 참조 매칭. 렌더 후라 {{}} 없음.
const IMG_RE = /\/programs\/images\/([a-z0-9-]+)\/([a-z0-9._-]+\.(?:jpe?g|png|webp))/gi;

// fallback: 언어 폴더 → (비한국어) 영어판 → _common(한국어 기본본) → null
// ★_common 은 한글이 박힌 기본본이라, 비한국어에서 바로 떨어뜨리면 일본어 페이지에
//  "남자아이 중학교 2학년 이전" 같은 한글 이미지가 그대로 노출된다(ja/es 는 자체 폴더가
//  없어 전부 여기로 떨어졌다). 영어판을 한 단계 끼워 한글 노출을 막는다 — ko 는 제외
//  (한국어 페이지는 _common 이 정본).
export function resolveProgramImgPath(lang, slug, file, exists) {
  if (exists(`${lang}/${slug}/${file}`)) return `/programs/images/${lang}/${slug}/${file}`;
  if (lang !== 'ko' && exists(`en/${slug}/${file}`)) return `/programs/images/en/${slug}/${file}`;
  if (exists(`_common/${slug}/${file}`)) return `/programs/images/_common/${slug}/${file}`;
  return null;
}

// imagesRoot = v4/public/programs/images 절대경로
export function localizeProgramImages(html, lang, imagesRoot, warn = console.warn) {
  const exists = (rel) => existsSync(join(imagesRoot, rel));
  return html.replace(IMG_RE, (m, slug, file) => {
    const resolved = resolveProgramImgPath(lang, slug, file, exists);
    if (!resolved) {
      warn(`[i18n] 누락된 프로그램 이미지: ${slug}/${file} (lang=${lang})`);
      return m;
    }
    return resolved;
  });
}
