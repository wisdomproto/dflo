# 릴 에디터 멀티트랙 타임라인 UI — 설계

날짜: 2026-06-14 · 상태: 초안(리뷰 중)

## 목적

릴 라이트 에디터의 하단 편집 표면을 캡컷류 **멀티트랙 타임라인**으로 바꾼다. 현재는
단순 `ChunkStrip`(청크를 폭 비례 버튼으로 나열, 클릭=시킹)인데, 영상·자막·인서트·
스티커·오디오가 **시간 위에서 어떻게 겹치는지** 한 화면에서 안 보인다. 공유 시간축 +
플레이헤드 아래 5개 트랙을 쌓아 타이밍 관계를 가시화하고, 스티커의 시간(등장/길이)을
타임라인에서 직접 편집할 수 있게 한다.

## 결정 사항

- **데이터 모델 불변 — 청크-락 유지**: 릴은 고정 청크(c1…cN), 각 길이 = 그 청크 TTS
  음성 길이(`reel_runtime.timing`). 자막·인서트·나레이션은 청크에 묶여 시간이 고정.
  타임라인은 이 구조의 **뷰**다(새 테이블/컬럼/마이그레이션 없음). (사용자 결정: "트랙
  타임라인 + 인라인 편집")
- **자유 편집인 것은 스티커 시간뿐**: 스티커는 `fromFrac`/`durFrac`(청크 내 비율)로
  자유 구간 → 타임라인에서 **드래그=이동·양끝=트림**. 그 외 클립은 클릭=선택(내용은
  인스펙터에서 편집), 시간 이동 불가.
- **오디오 = 보기 전용(v1)**: 나레이션 wav(청크당)·BGM(전체)을 타이밍 맥락으로
  표시만. 오디오 편집(BGM 교체·볼륨·SFX)은 범위 밖. 파형은 **스키매틱**(디코딩 X).
  (사용자 결정)
- **최소 침습 — `ChunkStrip` 교체**: Player·우측 인스펙터·`CanvasDragLayer`는 그대로.
  하단 `ChunkStrip`만 `ReelTimeline`으로 교체. 선택 상태(`selected` 청크 idx)·시킹
  (`playerRef.seekTo`)·스티커 커밋(`patchSelChunk(i,{stickers})`) 기존 배선 재사용.
- **플레이헤드는 imperative**: `PlayerRef`의 `frameupdate` 이벤트를 구독해 플레이헤드
  div의 `style.left`만 직접 갱신(React state로 30fps 리렌더 금지 — 트랙은 doc 변경
  시에만 리렌더).
- **스티커 편집 2표면 상보**: `CanvasDragLayer`(캔버스=공간 x/y/w) ⟂ `ReelTimeline`
  (시간 fromFrac/durFrac). 둘 다 같은 `chunk.stickers`를 패치하되 **다른 필드만** 갱신
  (각자 기존 sticker를 spread) → 충돌 없음.

## 구성 (파일)

```
v4/src/features/marketing/components/content/reelEditor/
  ReelTimeline.tsx        # 신규 — 멀티트랙(룰러+5트랙+플레이헤드), 클릭=선택+시킹
  StickerClip.tsx         # 신규 — 타임라인 스티커 칩(본체 드래그=이동 / 양끝 핸들=트림)
  ChunkStrip.tsx          # 삭제 — ReelTimeline 으로 대체(유일 import 처=ReelEditorPanel)
  ReelEditorPanel.tsx     # 수정 — ChunkStrip → ReelTimeline 교체, onCommitStickers(i,…)
v4/src/features/marketing/utils/reelEditor.ts  # 수정 — 타임라인 순수 helper 추가
```

`ReelTimeline`이 ~200줄 넘으면 트랙 한 줄(`TrackLane`)을 분리. 스티커 칩은 드래그
로직이 있어 처음부터 `StickerClip`으로 분리(단일 책임).

## 트랙 / 데이터 (5 레인 파생)

전부 기존 `doc.script.chunks` + `durs`/`starts`/`total`(이미 EditorInner 계산) +
`runtime`에서 파생. 레인은 `[64px 라벨 거터 | 1fr 시간축]` 그리드. 시간축은 `total`
프레임을 폭에 매핑, 청크 경계 = 세로 그리드선.

| 트랙 | 클립 | 동작 |
|---|---|---|
| 🎬 영상 | 1개(전체폭) "원장 립싱크" | 읽기전용 표시 |
| 💬 자막 | 청크당 1칸 | 클릭=청크 선택+시킹, 선택 강조 |
| 🖼 인서트 | `chunk.insert` 있는 청크만 | 클릭=청크 선택+시킹 |
| ✨ 스티커 | `chunk.stickers[]` 각각(청크 px범위 내 fromFrac/durFrac 위치) | 드래그=이동·트림 + 클릭=선택 |
| 🔊 오디오 | 청크당 wav 칸(스키매틱 파형) + BGM 전체폭 바 | 읽기전용. 제한 모드(preview 없음)는 "음성 미생성" placeholder |

- 🎙 dirty 배지: 자막/스티커 외에 **나레이션이 마지막 TTS와 다른 청크**(`chunkTtsDirty`)
  표시 — 어느 트랙에 둘지는 구현에서(자막 칸 모서리 권장). 기존 ChunkStrip 의 🎙 계승.
- 스키매틱 파형: `pseudoWaveform(chunkId, bars)` 순수 함수(청크 id 해시 시드 → 결정적
  막대 높이 배열). 디코딩·네트워크 없음.

## 상호작용

- **클릭 = 선택 + 시킹 + 인스펙터**: 어느 트랙이든 청크 i의 클립 클릭 → `onSelectChunk(i)`
  (EditorInner: `setSelected(i)`) + `playerRef.seekTo(starts[i])`. 인스펙터는 기존대로
  선택 청크를 표시. 룰러/빈 영역 클릭 = 그 지점 프레임으로 시킹(선택 불변).
- **플레이헤드**: `ReelTimeline`이 `playerRef`를 받아 마운트 시 `addEventListener
  ('frameupdate', e => playhead.style.left = pxFor(e.detail.frame))`. 재생·시킹 모두
  frameupdate가 커버. 언마운트 시 `removeEventListener`. total=0 가드.
- **스티커 시간 편집(`StickerClip`)**: `CanvasDragLayer` 포인터 패턴 차용 —
  drag 중 로컬 state만, `pointerup` 1회 `onCommitStickers(chunkIdx, nextStickers)`
  (=setDoc 1회=undo 1스텝). 본체 드래그 = `fromFrac` 이동, 좌/우 끝 핸들 = 트림
  (좌=fromFrac, 우=durFrac). **자기 청크 범위로 클램프**(v1, 경계 못 넘음). 미리보기는
  setDoc → Player inputProps 즉시 반영(StickerLayer가 fromFrac/durFrac 사용).

## 좌표 / 순수 함수 (utils/reelEditor.ts 추가)

기존 `chunkDurations`/`chunkStarts`/`totalFrames`/`pxToCanvasFrac` 옆에 타임라인 전용
순수 함수 추가(React/IO 금지, tsc 게이트 — 기존 좌표 함수와 동일 컨벤션):

- `frameToFrac(frame, total) → 0..1` / `fracToPercent` — 시간축 위치(%).
- `chunkPxRange(i, starts, durs, total) → { leftFrac, widthFrac }` — 청크 i의 시간축 범위.
- `stickerFracRange(sticker) → { fromFrac, durFrac }`(durFrac null=끝까지 정규화) +
  `stickerTimelineRange(sticker, chunkStart, chunkDur, total) → {leftFrac,widthFrac}`
  — 스티커를 전체 시간축에서 어디에 그릴지.
- `resolveStickerTimeDrag(mode, pointerFracInChunk, orig{fromFrac,durFrac}, grabOffset)
  → {fromFrac, durFrac}` — mode='move'|'trim-left'|'trim-right', 청크 내 0..1 클램프,
  최소 길이 가드(예 durFrac ≥ 0.05). **순수·결정적**.
- `pseudoWaveform(chunkId, bars) → number[]` — 결정적 막대 높이(0..1).

> 주의: 프레임↔비율 변환은 위 helper로 일원화. remotion `StickerLayer.stickerFrames`
> (비율→프레임, 렌더용)와 **방향이 반대**(타임라인은 px↔비율) — 중복 아님. 둘은 같은
> fromFrac/durFrac 계약을 공유.

## 엣지 케이스

- **제한 모드(timing 미생성 언어)**: `durs`는 110f 균등(`chunkDurations` 폴백) — 타임라인
  정상 렌더(합성 길이), 오디오 레인은 "음성 미생성" placeholder, 시킹/플레이헤드는
  합성 타임라인 기준. 스티커 시간 편집도 합성 길이 기준(렌더 시 실제 길이로 비율 적용).
- **스티커 없음**: 스티커 레인 빈 줄(얇게 유지).
- **durFrac=null(끝까지)**: 청크 끝까지 칩, 우측 트림 시작하면 durFrac 구체화.
- **청크 수**: 현 릴 ~10청크 → 680px에 충분히 들어감. **가로 스크롤/줌은 v1 범위 밖**
  (청크 매우 많아지면 칸이 좁아짐 — 후순위).
- **루프 재생**: frameupdate가 0으로 리셋 → 플레이헤드 시작으로 점프(정상).
- **선택 청크 out-of-range**: 콘텐츠/언어 전환 1렌더 가드는 기존 `sel = min(selected,
  len-1)` 재사용.

## 범위 밖 (명시)

오디오 편집(BGM 교체/볼륨/SFX) · 실제 파형 디코딩 · 청크 분할·자유 리타이밍 · 스티커의
청크 경계 넘는 이동 · 가로 스크롤/줌 · 멀티 선택. 전부 후순위.

## 테스트

- **타입 게이트**: `cd v4 && npx tsc -b --noEmit` 0(plain tsc는 no-op).
- **FE 테스트 러너 없음**(프로젝트 컨벤션 — 기존 `reelEditor.ts` 좌표 함수도 러너
  테스트 없이 tsc+수동): 타임라인 순수 helper는 각 함수 ≤수줄로 단순 유지 + tsc + 수동.
- **수동 E2E**(Player 시킹 정상화 후 가능): ① 각 트랙 클립 클릭 → 선택 강조 + 인스펙터
  갱신 + Player 시킹 ② 재생 시 플레이헤드 이동, 룰러 클릭 시킹 ③ 스티커 칩 드래그=이동·
  양끝=트림 → Player 미리보기에서 스티커 등장 시점/길이 변화 일치, Ctrl+Z 1스텝 복원
  ④ 제한 모드(vi) 합성 타임라인 + "음성 미생성" ⑤ **회귀**: `CanvasDragLayer` 공간
  드래그(x/y/w) 여전히 동작(같은 patchSelChunk, 다른 필드).

## 구현 단계

- **P1 타임라인 뷰 + 선택/시킹 + 플레이헤드**: `ReelTimeline`(룰러+5트랙 렌더, 클릭=
  선택+시킹, frameupdate 플레이헤드) + utils 렌더 helper(`chunkPxRange`/`stickerTimelineRange`/
  `pseudoWaveform`) + `ReelEditorPanel` 교체 + `ChunkStrip` 삭제. tsc 0.
- **P2 스티커 시간 드래그/트림**: `StickerClip`(본체/양끝 핸들, 포인터 패턴) +
  `resolveStickerTimeDrag` + `onCommitStickers(i, …)` 배선. tsc 0 + 수동 E2E.

## 리스크

- **frameupdate 빈도**: imperative(ref) 갱신으로 흡수. 트랙 리렌더는 doc 변경 시에만.
- **스티커 2표면 동기**: 둘 다 full stickers 배열 커밋(기존 sticker spread) — 한쪽이
  다른 쪽 필드를 덮지 않게 spread 순서 주의(구현 시 검증).
- **좌표 정확도**: 청크 px범위·스티커 시간 매핑은 순수 helper로 분리해 수동 검증
  용이하게(Player 시킹 정상화로 시각 확인 가능).
