// 빌드 산출 HTML 의 <img src="….jpg|.jpeg|.png"> 를, 같은 경로에 .webp 가 존재하면 .webp 로 치환.
// next-gen 포맷으로 모바일 LCP/전송량 개선. webp 가 없거나 외부/데이터 URL 이면 원본 유지(무회귀).
// build-i18n 후처리 체인에서 localizeProgramImages·logo swap 다음, lazifyImages 앞/뒤 어디서나 안전(src 만 건드림).
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const IMG_SRC = /(<img\b[^>]*?\bsrc=")([^"]+?\.(?:jpg|jpeg|png))(")/gi;

/** @param {string} html  @param {string} publicRoot  v4/public 절대경로 */
export function swapToWebp(html, publicRoot) {
  return html.replace(IMG_SRC, (m, pre, src, post) => {
    if (/^https?:|^data:/i.test(src)) return m; // 외부/inline 은 스킵
    const webp = src.replace(/\.(?:jpg|jpeg|png)$/i, '.webp');
    const rel = webp.replace(/^\//, '').split('?')[0]; // 쿼리스트링 제거 후 FS 확인
    return existsSync(join(publicRoot, rel)) ? pre + webp + post : m;
  });
}
