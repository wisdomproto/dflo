// URL 경로에서 로케일을 뽑는 순수 로직. analytics.ts 의 픽셀·gtag 주입은 import.meta.env 에
// 의존해 node --test 로 못 불러오므로(모듈 로드 시점에 undefined 접근 크래시), 이 순수 부분만
// 분리해 회귀 테스트가 가능하게 한다. analytics.ts 가 여기서 import 해 재-export 한다.

export const SUPPORTED_LOCALES = ['ko', 'vn', 'th', 'en', 'zh', 'ja', 'zh-hant', 'zh-hans', 'ar', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** URL pathname 에서 locale 추출. `/vn/...` → 'vn', `/zh-hant/...` → 'zh-hant', 기본 'ko'.
 *  ★2글자만 잡던 정규식은 하이픈 로케일(zh-hant/zh-hans)을 놓쳐 'ko' 로 떨어뜨렸다 →
 *   중국어 페이지에서 한국 광고 픽셀이 발사됐다. 하이픈 꼬리를 허용한다. */
export function getLocale(pathname: string): Locale {
  const m = pathname.match(/^\/([a-z]{2}(?:-[a-z]+)?)(?:\/|$)/);
  if (m && (SUPPORTED_LOCALES as readonly string[]).includes(m[1])) {
    return m[1] as Locale;
  }
  return 'ko';
}
