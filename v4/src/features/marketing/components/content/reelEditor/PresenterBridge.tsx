// @reel(remotion/src) 컴포지션을 v4에서 재생하는 브리지.
// 모듈 로드 시 1회 리졸버 교체 — 고정 에셋(로고·BGM)을 v4 public 에서 서빙.
import { forwardRef } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { PresenterShort } from '@reel/shorts/_shared/PresenterShort';
import { setAssetResolver } from '@reel/lib/assets';
import type { ReelScriptDoc, ReelTimingEntry } from '../../../types';

setAssetResolver((p) => '/' + p);

// Player 컴포지션이 throw 하면 에러 박스로 표시(빈 화면 + 래치 방지) + 콘솔에 전체 스택.
function PlayerError({ error }: { error: Error }) {
  // eslint-disable-next-line no-console
  console.error('[ReelEditor Player]', error);
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#1a1320', color: '#ffd6d6', padding: 16, overflow: 'auto', fontFamily: 'monospace', fontSize: 11 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>⚠️ 미리보기 렌더 에러</div>
      <div style={{ whiteSpace: 'pre-wrap' }}>{error.message}</div>
      <pre style={{ whiteSpace: 'pre-wrap', opacity: 0.7, marginTop: 8 }}>{error.stack}</pre>
    </div>
  );
}

export interface BridgeAssets { videoSrc: string; audio: Record<string, string> }
interface Props {
  doc: ReelScriptDoc; timing: ReelTimingEntry[]; lang: string;
  assets: BridgeAssets; durationInFrames: number;
}
// Player의 component는 참조 안정성이 필요 — inputProps 만 바뀌게 분리.
const Comp: React.FC<{ doc: ReelScriptDoc; timing: ReelTimingEntry[]; lang: string; assets: BridgeAssets }> = (p) => (
  <PresenterShort script={p.doc.script as never} timing={p.timing} lang={p.lang} slug={p.doc.slug} videoSrc={p.assets.videoSrc} assets={p.assets} />
);

const PresenterBridge = forwardRef<PlayerRef, Props>(function PresenterBridge({ doc, timing, lang, assets, durationInFrames }, ref) {
  return (
    <div className="w-full" style={{ aspectRatio: '9 / 16' }}> {/* 레터박스 방지 — 좌표 환산 전제 */}
      <Player
        ref={ref}
        component={Comp}
        inputProps={{ doc, timing, lang, assets }}
        durationInFrames={Math.max(1, durationInFrames)}
        compositionWidth={1080}
        compositionHeight={1920}
        fps={30}
        controls
        loop
        errorFallback={PlayerError}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
});
export default PresenterBridge;
