// 릴 라이트 에디터 오케스트레이터. P1: Player + 청크 스트립 + 시킹 (편집은 P2~).
// 데이터: article.reelScript(웹 소유) / article.reelRuntime(워커 소유, 읽기만).
// 훅은 전부 EditorInner 안에서만 — reelScript null↔non-null 전환 시 훅 개수 불일치 원천 차단.
import { useEffect, useRef, useState } from 'react';
import type { PlayerRef } from '@remotion/player';
import type { MarketingArticle, ReelLang, ReelScriptDoc } from '../../../types';
import {
  FALLBACK_CHUNK_FRAMES, chunkDurations, chunkStarts, chunkTtsDirty, totalFrames,
} from '../../../utils/reelEditor';
import PresenterBridge from './PresenterBridge';
import { ChunkStrip } from './ChunkStrip';

interface Props {
  article: MarketingArticle;
  language: string;
  onPatch?: (partial: Partial<MarketingArticle>) => void; // P2(편집·저장)부터 사용
}

export default function ReelEditorPanel({ article, language }: Props) {
  const doc = article.reelScript;
  // 빈 상태 — reelScript 없음(미온보딩 콘텐츠 또는 migration 057 미적용)
  if (!doc || (doc.script.chunks?.length ?? 0) === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-8 text-center text-gray-400">
        <div className="text-3xl">✂️</div>
        <p className="mt-2 text-sm font-semibold text-gray-500">이 콘텐츠는 에디터 미지원</p>
        <p className="mt-1 max-w-sm text-xs leading-relaxed">
          스토리보드 파이프라인으로 생산된 릴스만 편집할 수 있어요. 온보딩:{' '}
          <code className="rounded bg-gray-100 px-1">push-reel-script.mjs</code> 실행 후 다시 열어주세요.
          (migration 057 미적용 시에도 이 화면이 표시됩니다)
        </p>
      </div>
    );
  }
  return <EditorInner article={article} doc={doc} language={language} />;
}

function EditorInner({ article, doc, language }: { article: MarketingArticle; doc: ReelScriptDoc; language: string }) {
  const [selected, setSelected] = useState(0);
  const playerRef = useRef<PlayerRef>(null);

  // 콘텐츠/언어 전환 시 선택 청크 리셋
  useEffect(() => { setSelected(0); }, [article.id, language]);

  const lang = language as ReelLang;
  const chunks = doc.script.chunks;
  const runtime = article.reelRuntime;
  const timing = runtime?.timing?.[lang];
  const durs = chunkDurations(timing, chunks);
  const starts = chunkStarts(durs);
  const total = totalFrames(durs);
  // Player 용 합성 timing 폴백 — PresenterShort 는 chunks[ctaIdx].durFrames 를 즉시 접근하므로
  // 빈 timing 배열이면 TypeError. 스트립 폭 계산(chunkDurations)과 동일한 110f 균등 가정으로 합성.
  const timingForPlayer = timing && timing.length
    ? timing
    : chunks.map((c) => ({ id: c.id, durFrames: FALLBACK_CHUNK_FRAMES, origStartF: 0, rate: 1 }));
  const preview = runtime?.preview?.[lang];
  const assets = { videoSrc: preview?.lipsyncUrl ?? '', audio: preview?.audio ?? {} };

  const sel = Math.min(selected, chunks.length - 1); // 전환 직후 effect 전 1렌더 out-of-range 가드
  const selChunk = chunks[sel];
  const rawNarr = selChunk[lang];
  const narration = typeof rawNarr === 'string' ? rawNarr : '';
  const items = chunks.map((c, i) => ({ id: c.id, durFrames: durs[i], dirty: chunkTtsDirty(c, lang, runtime) }));

  return (
    <div className="space-y-3">
      {/* 제한 모드 배너 — preview(음성·립싱크) 미생성 언어 */}
      {!preview && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
          ⚠️ 이 언어는 음성·영상 미생성 — 미리보기 제한 모드(원장 영상 placeholder · 무음 재생)
          {!timing && ' · 타이밍은 청크당 110프레임 균등 가정'}
        </div>
      )}

      <div className="grid grid-cols-[minmax(280px,420px)_1fr] gap-4">
        {/* 좌: 실시간 미리보기 Player */}
        <PresenterBridge
          ref={playerRef}
          doc={doc}
          timing={timingForPlayer}
          lang={language}
          assets={assets}
          durationInFrames={total}
        />

        {/* 우: 안내 패널 — P2에서 자막/인서트 인스펙터로 교체될 자리 */}
        <div className="min-w-0 space-y-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
            <div className="mb-1 text-xs font-semibold text-gray-500">
              선택 청크 — {selChunk.id} · {(durs[sel] / 30).toFixed(1)}초
            </div>
            <p className="whitespace-pre-wrap rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700">
              {narration || '— (이 언어 나레이션 없음)'}
            </p>
          </div>
          <p className="text-[11px] text-gray-400">
            ✂️ 지금은 읽기 전용 미리보기 단계예요. 하단 청크를 클릭하면 해당 구간으로 이동합니다.
            자막·헤더/CTA·인서트·스티커 편집과 렌더 요청은 다음 단계에서 열립니다.
          </p>
        </div>
      </div>

      {/* 하단: 청크 스트립 (길이 비례 폭 · 클릭=시킹) */}
      <ChunkStrip
        items={items}
        selected={sel}
        onSelect={(i) => { setSelected(i); playerRef.current?.seekTo(starts[i]); }}
      />
    </div>
  );
}
