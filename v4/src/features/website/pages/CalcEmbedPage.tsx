// CalcEmbedPage — Standalone page that reuses the main HeightCalculator React module
// in `embedded` mode (no InfoModal overlay — renders inline as a page).
// /test/calculator.html iframes this so the original Chart.js graph + animations are reused.

import { useEffect } from 'react';
import { HeightCalculator } from '../components/HeightCalculator';

export default function CalcEmbedPage() {
  useEffect(() => {
    document.title = '예상키 측정';
  }, []);

  // embedded=true 면 InfoModal 우회 → 페이지 자체로 렌더.
  return (
    <div className="min-h-screen bg-white">
      <HeightCalculator isOpen={true} onClose={() => { /* no-op: page-level, nothing to close */ }} embedded />
    </div>
  );
}
