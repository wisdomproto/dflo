import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from '@/app/App';

// 새 배포로 lazy chunk URL 이 무효화되면 (옛 해시 → 404) Vite 가
// `vite:preloadError` 이벤트를 발사한다. 사용자가 겪는 "빈 화면" —
// 새로고침해야 보이는 — 케이스를 자동 reload 로 해결.
//
// 무한 reload 방지: 한 세션당 한 번만. 같은 세션에서 또 발생하면
// 그건 캐시 외 다른 문제이므로 사용자가 직접 디버깅할 수 있게 그대로 둠.
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem('did-preload-reload') === '1') return;
  sessionStorage.setItem('did-preload-reload', '1');
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
