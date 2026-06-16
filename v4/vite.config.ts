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
      next();
    });
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), seoRedirects()],
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
