import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

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
      '@reel': path.resolve(__dirname, '../remotion/src'), // 컴포지션 단일 소스 공유
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
