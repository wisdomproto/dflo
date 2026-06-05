import { existsSync } from 'node:fs';
import { join } from 'node:path';

// 렌더된 HTML에서 프로그램 이미지 참조 매칭. 렌더 후라 {{}} 없음.
const IMG_RE = /\/programs\/images\/([a-z0-9-]+)\/([a-z0-9._-]+\.(?:jpe?g|png|webp))/gi;

// 1단계 fallback: 언어 폴더 우선 → _common(한국어 기본본) → null
export function resolveProgramImgPath(lang, slug, file, exists) {
  if (exists(`${lang}/${slug}/${file}`)) return `/programs/images/${lang}/${slug}/${file}`;
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
