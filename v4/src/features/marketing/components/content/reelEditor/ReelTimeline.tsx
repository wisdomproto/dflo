// 하단 멀티트랙 타임라인 — 영상/자막/인서트/스티커/오디오 5트랙 + 공유 시간축 + 플레이헤드.
// 데이터는 doc.script.chunks + durs/starts/total + runtime 파생(읽기). 클릭=선택+시킹.
// 플레이헤드는 PlayerRef frameupdate 를 imperative 로 갱신(리렌더 0). P1: 스티커 칩 읽기전용(드래그는 P2).
import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { PlayerRef } from '@remotion/player';
import type { ReelChunk, ReelLang, ReelRuntimeDoc, ReelStickerItem } from '../../../types';
import { chunkFracRange, laneXToFrame, stickerTimelineRange, pseudoWaveform, chunkTtsDirty } from '../../../utils/reelEditor';

const ACCENT = '#4A2D6B';
const GUTTER = 64;

interface Props {
  playerRef: RefObject<PlayerRef | null>;
  chunks: ReelChunk[];
  durs: number[];
  starts: number[];
  total: number;
  selected: number;
  onSelectChunk: (i: number) => void;
  language: ReelLang;
  runtime: ReelRuntimeDoc | null;
  hasPreview: boolean; // 오디오 레인: 파형 vs "음성 미생성"
}

const pct = (f: number) => `${f * 100}%`;

export function ReelTimeline({ playerRef, chunks, durs, starts, total, selected, onSelectChunk, language, runtime, hasPreview }: Props) {
  const playheadRef = useRef<HTMLDivElement>(null);

  // 플레이헤드 — frameupdate(재생/시킹 모두 발화)로 left% 만 imperative 갱신.
  useEffect(() => {
    const p = playerRef.current;
    const head = playheadRef.current;
    if (!p || !head) return;
    const onFrame = (e: { detail: { frame: number } }) => {
      head.style.left = total > 0 ? `${Math.min(100, (e.detail.frame / total) * 100)}%` : '0%';
    };
    p.addEventListener('frameupdate', onFrame);
    return () => p.removeEventListener('frameupdate', onFrame);
  }, [playerRef, total]);

  // 빈 레인 클릭 = 포인터 프레임 시킹(선택 불변). 클립 클릭 = 선택 + 청크 시작 시킹.
  const seekToPointer = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    playerRef.current?.seekTo(laneXToFrame(e.clientX - r.left, r.width, total));
  };
  const onClipClick = (i: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectChunk(i);
    playerRef.current?.seekTo(starts[i]);
  };

  // 한 행 = [거터(아이콘+라벨) | 레인]. children 은 레인 안 절대배치 클립들.
  const Row = ({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) => (
    <div className="grid h-[30px] items-center" style={{ gridTemplateColumns: `${GUTTER}px 1fr` }}>
      <div className="flex items-center gap-1 pl-2 text-[11px] text-gray-500"><i className={`ti ${icon} text-[15px]`} aria-hidden />{label}</div>
      <div className="relative h-[22px] cursor-pointer" onClick={seekToPointer}>{children}</div>
    </div>
  );

  return (
    <div className="relative select-none rounded-lg border border-gray-200 bg-white py-2">
      {/* 룰러 */}
      <div className="grid h-5 items-center" style={{ gridTemplateColumns: `${GUTTER}px 1fr` }}>
        <div />
        <div className="relative h-full cursor-pointer" onClick={seekToPointer}>
          {chunks.map((c, i) => (
            <div key={c.id} className="absolute top-0 h-full border-l border-gray-200 pl-0.5 font-mono text-[10px] text-gray-400" style={{ left: pct(chunkFracRange(i, starts, durs, total).leftFrac) }}>{c.id}</div>
          ))}
        </div>
      </div>

      {/* 🎬 영상 — 전체폭 읽기전용 */}
      <Row icon="ti-movie" label="영상">
        <div className="absolute inset-0 flex items-center rounded bg-gray-100 pl-2 text-[10px] text-gray-400">원장 립싱크 (연속 · 읽기전용)</div>
      </Row>

      {/* 💬 자막 — 청크당 1칸(선택 강조 + 🎙 dirty) */}
      <Row icon="ti-text" label="자막">
        {chunks.map((c, i) => {
          const { leftFrac, widthFrac } = chunkFracRange(i, starts, durs, total);
          const dirty = chunkTtsDirty(c, language, runtime);
          return (
            <button key={c.id} type="button" onClick={onClipClick(i)}
              className={`absolute top-0 h-full overflow-hidden rounded border text-[10px] ${i === selected ? 'border-2 bg-[#4A2D6B]/5 font-semibold' : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'}`}
              style={{ left: pct(leftFrac), width: pct(widthFrac), ...(i === selected ? { borderColor: ACCENT, color: ACCENT } : {}) }}
              title={`${c.id} · ${(durs[i] / 30).toFixed(1)}초`}>
              <span className="block truncate px-1">{c.id}</span>
              {dirty && <span className="absolute right-0 top-0 text-[9px]">🎙</span>}
            </button>
          );
        })}
      </Row>

      {/* 🖼 인서트 — insert 있는 청크만 */}
      <Row icon="ti-photo" label="인서트">
        {chunks.map((c, i) => {
          if (typeof c.insert !== 'string' || !c.insert) return null;
          const { leftFrac, widthFrac } = chunkFracRange(i, starts, durs, total);
          return (
            <button key={c.id} type="button" onClick={onClipClick(i)}
              className="absolute top-0 h-full overflow-hidden rounded border border-gray-300 bg-white text-[10px] text-gray-500 hover:border-gray-400"
              style={{ left: pct(leftFrac), width: pct(widthFrac) }} title={`${c.id} 인서트`}>
              <span className="flex h-full items-center justify-center">🖼</span>
            </button>
          );
        })}
      </Row>

      {/* ✨ 스티커 — 청크별 stickers, fromFrac/durFrac 위치. P1: 읽기전용(클릭=선택), 드래그는 P2 */}
      <Row icon="ti-mood-smile" label="스티커">
        {chunks.flatMap((c, i) => {
          const list = Array.isArray(c.stickers) ? (c.stickers as ReelStickerItem[]) : [];
          return list.map((s) => {
            const { leftFrac, widthFrac } = stickerTimelineRange(s, starts[i], durs[i], total);
            return (
              <button key={s.id} type="button" onClick={onClipClick(i)}
                className="absolute top-0 h-full overflow-hidden rounded border border-pink-400 bg-pink-50 text-[9px] text-pink-700"
                style={{ left: pct(leftFrac), width: pct(widthFrac) }} title={`스티커 (${c.id})`}>
                <span className="flex h-full items-center justify-center truncate">✨</span>
              </button>
            );
          });
        })}
      </Row>

      {/* 🔊 오디오 — 청크당 파형(or placeholder) + BGM 전체폭 */}
      <Row icon="ti-volume" label="오디오">
        {hasPreview ? chunks.map((c, i) => {
          const { leftFrac, widthFrac } = chunkFracRange(i, starts, durs, total);
          const bars = pseudoWaveform(c.id, 10);
          return (
            <div key={c.id} className="absolute top-0 flex h-full items-center justify-around gap-px overflow-hidden rounded bg-teal-50 px-0.5" style={{ left: pct(leftFrac), width: pct(widthFrac) }}>
              {bars.map((h, k) => <span key={k} className="w-px bg-teal-400" style={{ height: `${Math.round(h * 100)}%` }} />)}
            </div>
          );
        }) : <div className="absolute inset-0 flex items-center rounded border border-dashed border-gray-200 pl-2 text-[10px] text-gray-400">음성 미생성</div>}
      </Row>

      {/* 플레이헤드 — 레인 영역(거터 제외) 오버레이. left:GUTTER right:0 = 레인 셀 폭과 정확히 일치(컨테이너 좌우 패딩 없음 → 클립 left%와 안 어긋남) */}
      <div className="pointer-events-none absolute top-1 bottom-1 z-10" style={{ left: GUTTER, right: 0 }}>
        <div ref={playheadRef} className="absolute top-0 bottom-0" style={{ left: 0, width: 2, background: '#D85A30' }}>
          <div className="absolute -top-1" style={{ left: -4, width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '7px solid #D85A30' }} />
        </div>
      </div>
    </div>
  );
}
