import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';

// '@reel' = remotion 컴포지션 단일 소스 공유. 로컬은 ../remotion/src 실소스, Railway 배포 빌드는
// root dir=v4 라 ../remotion 이 컨텍스트에 없음 → 커밋된 src/reel-vendor 폴백(prebuild 가 실소스에서 동기화).
// 우선순위: REEL_STUBS=1(안내 스텁·비상) > REEL_VENDOR=1(vendor 강제·검증용) > 실소스 > vendor(없으면 스텁).
const remotionSrc = path.resolve(__dirname, '../remotion/src');
const reelStubs = path.resolve(__dirname, 'src/reel-stubs');
const reelVendor = path.resolve(__dirname, 'reel-vendor');
const reelFallback = fs.existsSync(reelVendor) ? reelVendor : reelStubs;
const reelAlias = process.env.REEL_STUBS === '1'
  ? reelStubs
  : process.env.REEL_VENDOR !== '1' && fs.existsSync(remotionSrc)
    ? remotionSrc
    : reelFallback;

// SEO 서버측 리다이렉트 (Railway 가 `vite preview` 로 서빙하므로 여기서 처리):
// - `/` → `/ko/` 301 — 구글이 루트에서 빈 SPA 셸 대신 정적 한국어 홈을 보게 한다
//   (x-default hreflang 도 ko 라서 일관). 쿼리스트링(fbclid·utm)은 보존.
// - apex `dr187growup.com` → `www` 301 — canonical/hreflang/sitemap 이 전부 www 기준.
//   apex 도메인이 Railway 에 다시 연결되는 즉시 효력이 생긴다.
// 정적 자산 캐시 헤더 (Railway = `vite preview`, 기본값이 전부 no-cache 라 재방문·페이지 이동마다
// 자산을 다시 받는다. 서버가 도쿄 단일 리전이라 원거리 사용자에겐 이 왕복이 누적). 파일 확장자로 분류:
// - 불변 자산(이미지·webp·폰트): 1년 immutable (콘텐츠 바뀌면 파일명이 바뀌는 정적본이라 안전)
// - CSS/JS(_shell.*): 하루 + must-revalidate (자주 안 바뀌지만 파일명이 고정이라 무한캐시는 위험)
// - HTML/sitemap/robots: no-cache 유지 (콘텐츠·redirect 갱신이 즉시 반영돼야 함)
const IMMUTABLE_EXT = /\.(webp|avif|jpg|jpeg|png|gif|svg|ico|woff2?|ttf|otf|mp4|webm)$/i;
const CODE_EXT = /\.(css|js|mjs)$/i;
const cacheHeaders = (): Plugin => ({
  name: 'cache-headers',
  configurePreviewServer(server) {
    server.middlewares.use((req, res, next) => {
      const path = (req.url ?? '').split('?')[0];
      if (IMMUTABLE_EXT.test(path)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (CODE_EXT.test(path) || path === '/cases-data.json') {
        // 치료사례 스냅샷은 거의 안 바뀜 → 엣지·브라우저 1일 캐시(변경 시 Cloudflare purge). CODE 와 동일.
        res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
      }
      next();
    });
  },
});

const seoRedirects = (): Plugin => ({
  name: 'seo-redirects',
  configurePreviewServer(server) {
    server.middlewares.use((req, res, next) => {
      const host = req.headers.host ?? '';
      if (host === 'dr187growup.com') {
        res.statusCode = 301;
        res.setHeader('Location', `https://www.dr187growup.com${req.url ?? '/'}`);
        res.end();
        return;
      }
      const [pathname, query] = (req.url ?? '').split('?');
      if (pathname === '/') {
        res.statusCode = 301;
        res.setHeader('Location', query ? `/ko/?${query}` : '/ko/');
        res.end();
        return;
      }
      // `/{lang}` (트레일링 슬래시 없음) → `/{lang}/` 301.
      // 슬래시 없는 주소는 정적 다국어 페이지가 아니라 한국어 SPA 셸로 떨어져, 공유/광고 미리보기(OG)·
      // SEO 가 한글로 노출된다. 슬래시를 붙여 정적 페이지로 보낸다. 쿼리(fbclid·utm) 보존.
      if (/^\/(zh-hant|zh-hans|ko|th|vi|en|ar|ja|es)$/.test(pathname)) {
        res.statusCode = 301;
        res.setHeader('Location', query ? `${pathname}/?${query}` : `${pathname}/`);
        res.end();
        return;
      }
      // `/{lang}/clinic.html` → 메인 병원 소개 섹션 301 (2026-07-24 페이지 병합).
      // 구글 검색광고 랜딩·블로그 유입·옛 북마크가 죽지 않도록 URL 은 살려 둔다.
      const clinicHit = pathname.match(/^\/(zh-hant|zh-hans|ko|th|vi|en|ar|ja|es)\/clinic\.html$/);
      if (clinicHit) {
        res.statusCode = 301;
        const to = `/${clinicHit[1]}/index.html#clinic`;
        res.setHeader('Location', query ? `/${clinicHit[1]}/index.html?${query}#clinic` : to);
        res.end();
        return;
      }
      next();
    });
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), cacheHeaders(), seoRedirects()],
  // 멀티 엔트리: SPA(index.html) + 경량 calc 페이지(calc.html).
  // calc.html 은 HeightCalculator 폼만 마운트(calc-main.tsx) → Supabase/router/admin 부팅 번들 미포함.
  // iframe(calculator.html)·팝업(_shell.js)이 /calc.html 을 로드. /calc-embed React 라우트는 하위호환으로 유지.
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        calc: path.resolve(__dirname, 'calc.html'),
        'cases-embed': path.resolve(__dirname, 'cases-embed.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@reel': reelAlias, // 컴포지션 단일 소스 공유 (remotion 부재 시 커밋된 reel-vendor)
    },
    // 크로스 import 1순위 실패 모드 방지: ../remotion/src 소스의 import "remotion"/"react"가
    // remotion/node_modules로 해석돼 이중 인스턴스가 되면 Invalid hook call / 프레임 0 고정.
    dedupe: ['react', 'react-dom', 'remotion', '@remotion/gif'],
  },
  optimizeDeps: {
    include: ['remotion', '@remotion/player'],
  },
  server: {
    host: true,
    fs: { allow: [path.resolve(__dirname, '..')] }, // ../remotion/src 서빙 허용
  },
  preview: {
    host: true,
    allowedHosts: [
      'dflo-production.up.railway.app',
      'www.dr187growup.com',
      'dr187growup.com',
    ],
  },
});
