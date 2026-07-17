// 빌드 상수의 단일 소스 — 의존성 0 인 리프 모듈.
// seo.mjs 가 이걸 import 해서 그대로 re-export 하므로 기존 `from './seo.mjs'` 소비자는 무변경.
// sitemap.mjs·jsonld.mjs 는 여기서 직접 가져온다 — seo.mjs 는 jsonld.mjs 를 import 하므로
// jsonld → seo 로 되돌아가면 순환 참조가 되고, 지금은 모든 교차 참조가 함수 본문 안이라
// 우연히 동작할 뿐이라 누가 top-level 코드를 하나만 추가해도 TDZ 로 깨진다.

export const ORIGIN = 'https://www.dr187growup.com';
export const PATH_PREFIX = process.env.SITE_PATH_PREFIX ?? '';  // promoted to root in Phase 6 (override with /test for staging)
// Languages we actually BUILD pages for. hreflang/sitemap must only point at these —
// emitting ja/id (planned but not yet built) creates 404 hreflang targets that
// invalidate the whole cluster in Search Console. Add a lang here only once its pages ship.
export const ACTIVE_LANGS = ['ko', 'th', 'vi', 'en'];
export const ALL_LANGS = ['ko', 'th', 'vi', 'en', 'ja', 'id'];
export const HREFLANG_MAP = { ko: 'ko', th: 'th', vi: 'vi', en: 'en', ja: 'ja', id: 'id' };
export const OG_LOCALE_MAP = { ko: 'ko_KR', th: 'th_TH', vi: 'vi_VN', en: 'en_US', ja: 'ja_JP', id: 'id_ID' };
