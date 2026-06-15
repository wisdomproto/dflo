# 릴 에디터 멀티트랙 타임라인 UI 구현 플랜

> **상태: ✅ 구현 완료 (2026-06-14)** — P1(ReelTimeline·플레이헤드)·P2(StickerClip 시간 드래그/트림) 전부. 4커밋(9eb004f·9c03f3f·4534378·67dddfb), v4 tsc -b 0·드래그 4케이스 PASS·ChunkStrip 삭제. 브라우저 수동 검증만 사용자 몫.

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 릴 라이트 에디터 하단의 단순 `ChunkStrip`을 캡컷류 **멀티트랙 타임라인**(영상/자막/인서트/스티커/오디오 5트랙 + 공유 시간축 + 플레이헤드)으로 교체하고, 스티커의 시간(등장/길이)을 타임라인에서 직접 편집한다.

**Architecture:** 데이터 모델 불변(청크-락) — 타임라인은 기존 `doc.script.chunks` + `runtime.timing` 파생 뷰. 플레이헤드는 `PlayerRef`의 `frameupdate` 이벤트를 imperative(ref)로 받아 리렌더 0. 스티커 시간 편집은 `CanvasDragLayer`(공간 x/y/w)와 상보적으로 같은 `chunk.stickers`의 `fromFrac/durFrac`만 패치.

**Tech Stack:** React 19 + TypeScript, Tailwind, `@remotion/player`(PlayerRef `frameupdate`/`seekTo`), 기존 `utils/reelEditor.ts` 순수 helper 컨벤션.

**Spec:** `docs/superpowers/specs/2026-06-14-reel-timeline-ui-design.md` — 모호하면 스펙 우선.

**핵심 사실(현 코드, 검증됨):**
- `ReelEditorPanel.tsx` `EditorInner`: `selected`(청크 idx), `playerRef=useRef<PlayerRef>(null)`, `sel=Math.min(selected,len-1)`, `durs`/`starts`/`total` 계산됨(line 93-95), `patchSelChunk(idx,patch)`(line 77), 하단 `<ChunkStrip items selected onSelect={(i)=>{setSelected(i);playerRef.current?.seekTo(starts[i]);}}/>`(line 172-176), `CanvasDragLayer onCommitStickers={(stickers)=>patchSelChunk(sel,{stickers})}`(line 142).
- `ChunkStrip.tsx`: import 처 = `ReelEditorPanel` 단 하나(삭제 안전).
- `utils/reelEditor.ts`: `chunkDurations`/`chunkStarts`/`totalFrames`/`pxToCanvasFrac`/`pxToPanelFrac` 존재. **React/IO 금지** 헤더. v4 FE 테스트 러너 없음(tsc만).
- `types.ts`: `ReelStickerItem{ id,src,kind,x,y,w,rot,fromFrac:number,durFrac:number|null,anim,loop? }`, `ReelChunk.stickers?: ReelStickerItem[]`.
- `@remotion/player` `PlayerRef`: `addEventListener('frameupdate', (e)=>e.detail.frame)` + `removeEventListener` + `seekTo(frame)` — 전부 실재(타입 검증됨).
- `remotion StickerLayer.stickerFrames(fromFrac,durFrac,durFrames)` = 렌더용(비율→프레임). 타임라인은 반대방향(px↔비율) — 중복 아님.

**전제:** migration/데이터 변경 없음. Player 시킹 빈화면은 이미 해결(오디오 durationInFrames). dev 서버·브라우저 검증은 사용자 몫(preview 툴 금지) — 코드는 `tsc -b`로 검증.

**⚠️ v4 타입 게이트 = `cd /c/projects/dflo_0.1/v4 && npx tsc -b --noEmit`** (plain `tsc --noEmit`는 solution tsconfig라 no-op). `git add -A` 금지(워킹트리에 무관 미커밋 다수).

## 파일 구조

```
v4/src/features/marketing/utils/reelEditor.ts        # 수정 — 타임라인 순수 helper 추가
v4/src/features/marketing/components/content/reelEditor/
  ReelTimeline.tsx     # 신규 — 룰러 + 5트랙 렌더 + 플레이헤드(frameupdate) + 클릭=선택/시킹
  StickerClip.tsx      # 신규(P2) — 타임라인 스티커 칩(본체 드래그=이동 / 양끝=트림)
  ReelEditorPanel.tsx  # 수정 — ChunkStrip → ReelTimeline, onCommitStickers(i,…)
  ChunkStrip.tsx       # 삭제(P1 마지막)
```

`ReelTimeline`이 ~200줄 넘으면 한 트랙 행을 `TrackLane` 헬퍼로 분리(구현 중 판단). 스티커 칩은 P2에서 `StickerClip`으로 처음부터 분리.

---

## Chunk 1: P1 — 타임라인 뷰 + 선택/시킹 + 플레이헤드

### Task 1: 타임라인 순수 helper (reelEditor.ts)

**Files:**
- Modify: `v4/src/features/marketing/utils/reelEditor.ts`

순수 함수만(React/IO 금지). v4 FE 러너 없음 → tsc + Task 7 수동 검증. 각 함수 단순 유지.

- [ ] **Step 1: helper 추가** (파일 끝, `updateChunk` 아래)

```ts
// ── 타임라인(멀티트랙) 좌표 — 시간축 위 위치는 전부 분수(0..1), px 매핑은 컴포넌트가 폭 곱함 ──
/** 청크 i 가 전체 시간축에서 차지하는 범위(분수). */
export function chunkFracRange(i: number, starts: number[], durs: number[], total: number): { leftFrac: number; widthFrac: number } {
  if (total <= 0) return { leftFrac: 0, widthFrac: 0 };
  return { leftFrac: starts[i] / total, widthFrac: durs[i] / total };
}
/** 레인 내 px → 전체 프레임(빈영역 클릭 시킹용). laneWidth=시간축(거터 제외) px. */
export function laneXToFrame(px: number, laneWidth: number, total: number): number {
  if (laneWidth <= 0) return 0;
  return Math.round(clamp01(px / laneWidth) * total);
}
/** durFrac=null(끝까지)을 (1-fromFrac)로 정규화. */
export function stickerFracRange(s: { fromFrac: number; durFrac: number | null }): { fromFrac: number; durFrac: number } {
  const fromFrac = clamp01(s.fromFrac);
  const durFrac = s.durFrac == null ? Math.max(0, 1 - fromFrac) : clamp01(s.durFrac);
  return { fromFrac, durFrac };
}
/** 스티커를 전체 시간축에서 어디에 그릴지(분수). chunkStart/chunkDur=프레임. */
export function stickerTimelineRange(
  s: { fromFrac: number; durFrac: number | null }, chunkStart: number, chunkDur: number, total: number,
): { leftFrac: number; widthFrac: number } {
  if (total <= 0) return { leftFrac: 0, widthFrac: 0 };
  const { fromFrac, durFrac } = stickerFracRange(s);
  return { leftFrac: (chunkStart + fromFrac * chunkDur) / total, widthFrac: (durFrac * chunkDur) / total };
}
export const STICKER_MIN_FRAC = 0.05; // 타임라인 최소 길이
/** 스티커 시간 드래그/트림 — 순수·결정적. pointerFracInChunk=청크 내 0..1(클램프 전 원시). */
export function resolveStickerTimeDrag(
  mode: 'move' | 'trim-left' | 'trim-right',
  pointerFracInChunk: number,
  orig: { fromFrac: number; durFrac: number },  // durFrac 은 호출 전 stickerFracRange 로 정규화된 값
  grabOffset: number,                            // move 전용: (pointerFracInChunk - fromFrac) at down. trim 무시
): { fromFrac: number; durFrac: number } {
  const p = clamp01(pointerFracInChunk);
  if (mode === 'move') {
    const from = Math.min(Math.max(0, p - grabOffset), 1 - orig.durFrac);
    return { fromFrac: from, durFrac: orig.durFrac };
  }
  if (mode === 'trim-left') {
    const end = orig.fromFrac + orig.durFrac;              // 오른쪽 끝 고정
    const from = Math.min(Math.max(0, p), end - STICKER_MIN_FRAC);
    return { fromFrac: from, durFrac: end - from };
  }
  // trim-right: 왼쪽 끝 고정
  const dur = Math.min(Math.max(STICKER_MIN_FRAC, p - orig.fromFrac), 1 - orig.fromFrac);
  return { fromFrac: orig.fromFrac, durFrac: dur };
}
/** 결정적 스키매틱 파형 — 청크 id 시드(0..1 막대 높이 bars 개). */
export function pseudoWaveform(chunkId: string, bars: number): number[] {
  let seed = 0;
  for (const ch of chunkId) seed = (seed * 31 + ch.charCodeAt(0)) % 100000;
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    out.push(0.25 + (seed % 1000) / 1000 * 0.7); // 0.25~0.95
  }
  return out;
}
```

- [ ] **Step 2: 드래그 수학 4케이스 자가 검증** (throwaway, tsx 1회) — 스펙 검증 오라클

```bash
cd /c/projects/dflo_0.1/v4 && cat > /tmp/t.ts <<'EOF'
import { resolveStickerTimeDrag as r } from './src/features/marketing/utils/reelEditor';
const eq=(a:any,b:any,m:string)=>{const ok=Math.abs(a.fromFrac-b.fromFrac)<1e-9&&Math.abs(a.durFrac-b.durFrac)<1e-9;console.log(ok?'PASS':'FAIL',m,JSON.stringify(a));};
eq(r('move',0.45,{fromFrac:0.2,durFrac:0.5},0.1),{fromFrac:0.35,durFrac:0.5},'move');
eq(r('trim-left',0.4,{fromFrac:0.2,durFrac:0.5},0),{fromFrac:0.4,durFrac:0.3},'trim-left');
eq(r('trim-right',0.5,{fromFrac:0.2,durFrac:0.5},0),{fromFrac:0.2,durFrac:0.3},'trim-right');
eq(r('trim-left',0.68,{fromFrac:0.2,durFrac:0.5},0),{fromFrac:0.65,durFrac:0.05},'min-clamp');
EOF
npx tsx /tmp/t.ts; rm /tmp/t.ts
```
Expected: `PASS move`, `PASS trim-left`, `PASS trim-right`, `PASS min-clamp` (4 PASS). tsx 미설치면 npx가 자동 패치(네트워크). 정 안 되면 4 예시를 손으로 대조(스펙 검증 오라클).

- [ ] **Step 3: 타입 게이트**

Run: `cd /c/projects/dflo_0.1/v4 && npx tsc -b --noEmit`
Expected: 0 에러.

- [ ] **Step 4: Commit**

```bash
cd /c/projects/dflo_0.1 && git add v4/src/features/marketing/utils/reelEditor.ts && git commit -m "feat(reel-editor): timeline pure helpers (chunk/sticker frac ranges, drag math, waveform)"
```

### Task 2: ReelTimeline 컴포넌트 (룰러 + 5트랙 + 플레이헤드 + 클릭=선택/시킹)

**Files:**
- Create: `v4/src/features/marketing/components/content/reelEditor/ReelTimeline.tsx`

P1 범위 = 뷰 + 선택/시킹 + 플레이헤드. 스티커는 이 단계에선 **읽기 전용 칩**(P2에서 드래그). 정렬 핵심: 모든 행이 `grid-cols-[64px_1fr]`, 플레이헤드 오버레이는 `left:64px right:0`이라 레인 폭과 1:1. 클릭 px 환산은 클릭된 레인 셀의 `getBoundingClientRect()`(폭=레인 폭).

- [ ] **Step 1: 컴포넌트 작성**

```tsx
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
```
주의: 플레이헤드 오버레이는 `left:GUTTER right:0` — 레인 셀(grid col 2)과 좌우 동일(컨테이너 좌우 패딩 0)이라 left% 정렬 일치. tabler 아이콘(`ti ti-*`)은 admin에서 이미 로드됨(미로드면 라벨 텍스트로 충분, 회귀 아님). 자막/인서트/스티커 클립의 `onClipClick`은 `e.stopPropagation()`으로 레인 `seekToPointer` 버블 차단(클릭=청크 시작 시킹만).

- [ ] **Step 2: 타입 게이트**

Run: `cd /c/projects/dflo_0.1/v4 && npx tsc -b --noEmit`
Expected: 0 에러. (마운트 검증은 Task 3 배선 후.)

- [ ] **Step 3: Commit**

```bash
cd /c/projects/dflo_0.1 && git add v4/src/features/marketing/components/content/reelEditor/ReelTimeline.tsx && git commit -m "feat(reel-editor): ReelTimeline multitrack view (ruler, 5 tracks, playhead, click-select/seek)"
```

### Task 3: ReelEditorPanel 교체 + ChunkStrip 삭제

**Files:**
- Modify: `v4/src/features/marketing/components/content/reelEditor/ReelEditorPanel.tsx`
- Delete: `v4/src/features/marketing/components/content/reelEditor/ChunkStrip.tsx`

- [ ] **Step 1: import 교체** — `import { ChunkStrip } from './ChunkStrip';` → `import { ReelTimeline } from './ReelTimeline';`

- [ ] **Step 2: 하단 렌더 교체** — 기존 `items` 매핑(line 106)과 `<ChunkStrip .../>`(line 172-176)를 제거하고 `<ReelTimeline>`로:

```tsx
      {/* 하단: 멀티트랙 타임라인 (5트랙 · 클릭=선택+시킹 · 플레이헤드) */}
      <ReelTimeline
        playerRef={playerRef}
        chunks={chunks}
        durs={durs}
        starts={starts}
        total={total}
        selected={sel}
        onSelectChunk={(i) => setSelected(i)}
        language={lang}
        runtime={runtime}
        hasPreview={!!preview}
      />
```
주의: `onSelectChunk`는 `setSelected`만 — 시킹은 ReelTimeline 내부(`playerRef.seekTo(starts[i])`)가 처리. `items` 상수(line 106) 제거(자막 dirty는 ReelTimeline이 `chunkTtsDirty`로 자체 계산). **`items` 제거 시 `chunkTtsDirty`가 ReelEditorPanel에서 미사용 → import(line 9)에서 `chunkTtsDirty` 빼야 `tsc -b` noUnusedLocals 통과**(`chunkDurations`/`chunkStarts`/`totalFrames`/`updateChunk`/`FALLBACK_CHUNK_FRAMES`는 계속 사용). `sel`/`chunks`/`durs`/`starts`/`total`/`runtime`/`preview`/`lang`은 기존 계산 그대로 사용.

- [ ] **Step 3: ChunkStrip 삭제 + 잔존 import 확인**

```bash
cd /c/projects/dflo_0.1 && rm v4/src/features/marketing/components/content/reelEditor/ChunkStrip.tsx && grep -rn "ChunkStrip" v4/src || echo "no-refs-OK"
```
Expected: `no-refs-OK` (다른 참조 없음).

- [ ] **Step 4: 타입 게이트**

Run: `cd /c/projects/dflo_0.1/v4 && npx tsc -b --noEmit`
Expected: 0 에러.

- [ ] **Step 5: Commit**

```bash
cd /c/projects/dflo_0.1 && git add v4/src/features/marketing/components/content/reelEditor/ReelEditorPanel.tsx v4/src/features/marketing/components/content/reelEditor/ChunkStrip.tsx && git commit -m "feat(reel-editor): swap ChunkStrip for ReelTimeline in editor"
```

- [ ] **Step 6: P1 수동 검증** (사용자 — dev 서버) — `/marketing/content` → 콘텐츠 #3 → 릴스 → ✂️ 에디터:
  1. 하단에 5트랙 타임라인(영상/자막/인서트/스티커/오디오) 렌더, 청크 폭 비례
  2. 자막 클립 클릭 → 선택 강조 + 인스펙터 갱신 + Player 그 청크로 시킹
  3. 재생 → 플레이헤드 좌→우 이동, 룰러 빈 곳 클릭 → 그 지점 시킹
  4. ko/th = 파형, vi(제한 모드) = "음성 미생성" placeholder + 합성 타임라인
  5. 인서트/스티커 클립이 해당 청크 위치에 표시(스티커는 fromFrac/durFrac 구간)

---

## Chunk 2: P2 — 스티커 시간 드래그/트림

### Task 4: StickerClip + 타임라인 스티커 시간 편집

**Files:**
- Create: `v4/src/features/marketing/components/content/reelEditor/StickerClip.tsx`
- Modify: `v4/src/features/marketing/components/content/reelEditor/ReelTimeline.tsx` (스티커 레인 → StickerClip)
- Modify: `v4/src/features/marketing/components/content/reelEditor/ReelEditorPanel.tsx` (onCommitStickers 배선)

`CanvasDragLayer`는 **건드리지 않는다** — 자기 onCommitStickers(공간)는 그대로. 타임라인은 **별도** onCommitStickers(시간, chunkIdx) prop을 가진다(두 콜백, 충돌 없음).

- [ ] **Step 1: StickerClip 작성**

```tsx
// 타임라인 스티커 칩 — 본체 드래그=이동(fromFrac), 양끝 핸들=트림(좌:오른끝 고정 / 우:왼끝 고정).
// 드래그 중 로컬 state, pointerup 1회 commit(=undo 1스텝). 데드존 4px 미만=클릭(선택).
import { useRef, useState } from 'react';
import type { ReelStickerItem } from '../../../types';
import { stickerFracRange, resolveStickerTimeDrag } from '../../../utils/reelEditor';

const DEADZONE = 4; // px

interface Props {
  sticker: ReelStickerItem;
  // 청크의 시간축 위치(분수) — 칩 배치 + 포인터→청크분수 환산용. (chunkIdx는 부모 onCommit 클로저가 가짐 → 불필요)
  chunkLeftFrac: number;
  chunkWidthFrac: number;
  laneWidthPx: () => number;     // 레인 px 폭(환산 분모). ref 게터.
  onSelect: () => void;          // 클릭(데드존 내)
  onCommit: (next: { fromFrac: number; durFrac: number }) => void; // pointerup 1회
}

type Mode = 'move' | 'trim-left' | 'trim-right';
type Drag = { mode: Mode; startX: number; grabOffset: number; moved: boolean; cur: { fromFrac: number; durFrac: number } } | null;

export function StickerClip({ sticker, chunkLeftFrac, chunkWidthFrac, laneWidthPx, onSelect, onCommit }: Props) {
  const [drag, setDrag] = useState<Drag>(null);
  const base = stickerFracRange(sticker); // durFrac null → 정규화
  const view = drag ? drag.cur : base;    // 드래그 중 로컬

  // 칩의 시간축 위치 = 청크 위치 + 청크 내 from/dur 비율
  const leftFrac = chunkLeftFrac + view.fromFrac * chunkWidthFrac;
  const widthFrac = view.durFrac * chunkWidthFrac;

  // 포인터 clientX → 청크 내 분수(0..1). laneW=레인 px, 청크 px범위 = chunkLeftFrac..+chunkWidthFrac.
  const pointerFracInChunk = (clientX: number, rectLeft: number): number => {
    const laneW = laneWidthPx();
    if (laneW <= 0 || chunkWidthFrac <= 0) return 0;
    const fracInLane = (clientX - rectLeft) / laneW;
    return (fracInLane - chunkLeftFrac) / chunkWidthFrac;
  };

  const down = (mode: Mode) => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rectLeft = e.currentTarget.closest('[data-lane]')?.getBoundingClientRect().left ?? 0;
    const grabOffset = pointerFracInChunk(e.clientX, rectLeft) - base.fromFrac;
    setDrag({ mode, startX: e.clientX, grabOffset, moved: false, cur: base });
  };
  const move = (e: React.PointerEvent) => {
    if (!drag) return;
    const moved = drag.moved || Math.abs(e.clientX - drag.startX) >= DEADZONE;
    const rectLeft = e.currentTarget.closest('[data-lane]')?.getBoundingClientRect().left ?? 0;
    const p = pointerFracInChunk(e.clientX, rectLeft);
    const cur = resolveStickerTimeDrag(drag.mode, p, base, drag.grabOffset);
    setDrag({ ...drag, moved, cur });
  };
  const up = (e: React.PointerEvent) => {
    if (!drag) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* 해제됨 */ }
    if (drag.moved) onCommit(drag.cur); else onSelect(); // 데드존 내 = 클릭
    setDrag(null);
  };

  return (
    <div
      onPointerDown={down('move')} onPointerMove={move} onPointerUp={up}
      onClick={(e) => e.stopPropagation()}
      className="absolute top-0 h-full cursor-grab overflow-hidden rounded border border-pink-400 bg-pink-50 text-[9px] text-pink-700"
      style={{ left: `${leftFrac * 100}%`, width: `${widthFrac * 100}%`, touchAction: 'none' }}
      title="스티커 — 드래그=이동, 양끝=트림"
    >
      <span className="flex h-full items-center justify-center">✨</span>
      {/* 트림 핸들 — 본체 드래그(move)로 전파 안 되게 stopPropagation */}
      <span onPointerDown={down('trim-left')} onPointerMove={move} onPointerUp={up}
        className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize bg-pink-400/70" style={{ touchAction: 'none' }} />
      <span onPointerDown={down('trim-right')} onPointerMove={move} onPointerUp={up}
        className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-pink-400/70" style={{ touchAction: 'none' }} />
    </div>
  );
}
```
주의: 포인터 환산을 위해 스티커 레인 셀에 `data-lane` 속성 필요(다음 스텝). 핸들의 `down('trim-*')`이 본체 `down('move')`보다 먼저 발화하려면 핸들이 DOM 상위(자식)에 stopPropagation — `down`이 이미 `stopPropagation` 하므로 핸들 pointerdown이 본체로 안 샘.

- [ ] **Step 2: ReelTimeline 스티커 레인 교체** — 스티커 레인의 읽기전용 `<button>` 맵을 `StickerClip`으로. 레인 셀에 `data-lane` 추가, `laneWidthPx` 게터(레인 ref). 시그니처에 `onCommitStickers: (chunkIdx: number, stickers: ReelStickerItem[]) => void` prop 추가.

```tsx
// Row 의 레인 div 에 data-lane + ref 부여가 필요 → 스티커 레인만 별도 ref.
const stickerLaneRef = useRef<HTMLDivElement>(null);
const laneWidthPx = () => stickerLaneRef.current?.getBoundingClientRect().width ?? 0;
// ...
// 스티커 Row 의 레인을 data-lane + ref 로:
<div ref={stickerLaneRef} data-lane className="relative h-[22px] cursor-pointer" onClick={seekToPointer}>
  {chunks.flatMap((c, i) => {
    const list = Array.isArray(c.stickers) ? (c.stickers as ReelStickerItem[]) : [];
    const { leftFrac, widthFrac } = chunkFracRange(i, starts, durs, total);
    return list.map((s, sIdx) => (
      <StickerClip key={s.id} sticker={s} chunkIdx={i}
        chunkLeftFrac={leftFrac} chunkWidthFrac={widthFrac} laneWidthPx={laneWidthPx}
        onSelect={() => onSelectChunk(i)}
        onCommit={(next) => {
          const cur = (Array.isArray(c.stickers) ? c.stickers : []) as ReelStickerItem[];
          onCommitStickers(i, cur.map((x, k) => (k === sIdx ? { ...x, fromFrac: next.fromFrac, durFrac: next.durFrac } : x)));
        }} />
    ));
  })}
</div>
```
(스티커 Row는 공용 `Row` 대신 인라인으로 펼쳐 `data-lane`/ref 부여. 다른 4트랙은 그대로 `Row`.) **import 정리**: 교체 후 `ReelTimeline`에서 `stickerTimelineRange` 호출이 사라짐 → import 줄에서 `stickerTimelineRange` 제거(미사용, `noUnusedLocals` TS6133 방지). `chunkFracRange`/`pseudoWaveform`/`chunkTtsDirty`/`laneXToFrame`/`ReelStickerItem`는 계속 사용. `StickerClip` import 추가.

- [ ] **Step 3: ReelEditorPanel 배선** — `<ReelTimeline>`에 `onCommitStickers={(i, stickers) => patchSelChunk(i, { stickers })}` 추가. `CanvasDragLayer`는 무변경.

- [ ] **Step 4: 타입 게이트**

Run: `cd /c/projects/dflo_0.1/v4 && npx tsc -b --noEmit`
Expected: 0 에러.

- [ ] **Step 5: Commit**

```bash
cd /c/projects/dflo_0.1 && git add v4/src/features/marketing/components/content/reelEditor/StickerClip.tsx v4/src/features/marketing/components/content/reelEditor/ReelTimeline.tsx v4/src/features/marketing/components/content/reelEditor/ReelEditorPanel.tsx && git commit -m "feat(reel-editor): sticker time drag/trim on timeline (StickerClip, fromFrac/durFrac)"
```

### Task 5: P2 종합 검증

- [ ] **Step 1: 타입/드래그 수학** — `cd /c/projects/dflo_0.1/v4 && npx tsc -b --noEmit` 0 + Task 1 Step 2 드래그 4케이스 재실행 PASS.
- [ ] **Step 2: 수동 E2E** (사용자) — #3 ko, 스티커 있는 청크에서:
  1. 스티커 칩 **본체 드래그** → 등장 시점 이동, Player 미리보기에서 그 시점에 스티커 나타남, Ctrl+Z 1스텝 복원
  2. **좌측 핸들** 트림 → 시작 늦춰지고 길이 줆(오른쪽 끝 고정), **우측 핸들** → 길이만 변경
  3. 칩 **클릭(안 움직이고)** → 그 청크 선택(인스펙터 갱신), fromFrac 안 바뀜(데드존)
  4. 청크 경계 밖으로 드래그 → 자기 청크 안에 클램프
  5. **회귀**: `CanvasDragLayer`로 같은 스티커 **공간**(위치/크기) 드래그 여전히 동작, 인스펙터 스티커 편집(anim/구간 슬라이더) 동작

---

## 실행 메모
- **순서**: Chunk 1(Task 1→3) → Chunk 2(Task 4→5). Task 내 스텝 순서.
- **검증 게이트**: 매 Task `tsc -b`(plain tsc no-op). 드래그 수학은 throwaway tsx 4케이스.
- **건드리지 말 것**: `CanvasDragLayer.tsx`(P2도 무변경 — 타임라인은 별도 onCommitStickers prop), 워킹트리 무관 미커밋 파일.
- **데이터/마이그레이션 없음** — 순수 UI. 사용자 브라우저 검증은 dev 서버에서(preview 툴 금지).
