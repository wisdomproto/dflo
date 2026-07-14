# 재배포 릴스 보라 프레임 리스타일 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** @187growup 재배포 릴스(한글) 40개를 기존 "풀블리드 + 검정 밴드" 스타일에서 레퍼런스 4개와 동일한 "보라 프레임 + 2단 제목" 스타일로 재렌더하고, R2·DB·발행 큐를 갱신한다. 태국어는 손대지 않는다.

**Architecture:** 새 Remotion 컴포지션 `PurpleRepurpose`(한글 전용)를 만들어 기존 `ShortRepurpose`(태국어 계속 사용)를 건드리지 않는다. 소스 원본(`sources/originals/{id}.mp4`)을 폭 맞춰 채우고 세로 가운데 크롭해 중앙 영상 창에 넣고, 상·하단 보라 밴드에 2단 제목·로고·URL을 얹는다. 다운로드된 완성본 4개(v1→#1016, v2→#1012, v3→#1018 교체, v4→신규)는 그대로 사용하고, 나머지 37개만 재렌더한다.

**Tech Stack:** Remotion 4, TypeScript, ffmpeg(프레임/커버), Node(PostgREST + R2 업로드 via `remotion/scripts/lib/reelDb.mjs`), ai-server(:4000) R2 프록시.

---

## 배경 사실 (조사 완료)

- **커스텀 콘텐츠**(`marketing_articles.kind='custom'`) 42건: #1001 태국 광고, #1042 한국 계산기 광고(둘 다 **제외**), #1002~#1041 = 재배포 릴스 40개.
- 각 재배포 릴스는 `reels.ko.videoUrl` + `reels.th.videoUrl` 보유. **이 작업은 `reels.ko`만 교체**, `reels.th` 불변.
- 소스: `remotion/sources/originals/{youtubeId}.mp4` 78개 로컬 보유. 매핑 = `remotion/out/shorts/repurpose-ko/_manifest.json`(40행: `{idx,id,file,sec,title}`).
- **article ↔ 산출물 매칭은 `title`(manifest 원본 제목) 일치로** 한다(sort_order 산술 금지 — idx25=일본워크샵 제외로 idx와 sort_order가 어긋남).
- 발행 큐(`marketing_publish_queue`): ko 이미 발행 48건은 **사용자가 IG 앱에서 수동 삭제**(Graph API IG 삭제 불가). 이 작업은 ko 전 채널을 **새로 예약**한다.

## 레퍼런스 스타일 스펙 (측정값)

| 항목 | 값 |
|---|---|
| 프레임 | 1080×1920, 30fps |
| 배경 | 세로 보라 그라데이션 `#8360DE`(위) → `#6E45B6`(아래) — 프리뷰에서 미세조정 |
| 상단 밴드 | y 0–436px. 2단 제목 |
| ├ 킥커(작은 줄) | 흰 글씨 + 어두운 반투명 박스 `rgba(30,28,40,0.55)`, Pretendard 700, ~40px, 라운드 |
| └ 메인(큰 줄) | 노랑 `#FAE100`, Pretendard 900, ~74px, 줄바꿈 허용, 살짝 그림자 |
| 중앙 영상 창 | y 436–1480px (높이 1044, 폭 1080). 원본을 **폭 맞춰 채우고 세로 가운데 크롭** |
| 하단 밴드 | y 1480–1920px(440). 로고 `images/logo_en_wh.png`(흰 장식형, 폭~460) + `dr187growup.com`(흰, ~34px) |
| 프레임 지속 | 영상 내내 고정. **별도 아웃트로 없음**(원본이 자체 엔딩으로 끝남) |
| 길이 | 원본 길이 그대로(아웃트로 없음) |

## 2단 제목 초안 (킥커 / 메인) — 사용자 검토 대상

> v1/v2/v3/v4는 완성본에 이미 박힌 제목(그대로). 나머지 37개는 아래 초안. **이모지·해시태그 제거, 의료광고법(M02) 톤(보장·공포·단정 금지)**. 렌더 전 사용자 확정.

| idx | art(title 매칭) | 킥커 | 메인 |
|---|---|---|---|
| 01 | 카메라 유독 더 잘 받는 남자 키가 있다 | 카메라 유독 잘 받는 | 남자 키는 따로 있다? |
| 02 | 170cm 기본 평균 상향 5세대 여돌 | 이제 170cm가 기본 | 5세대 여돌의 키 |
| 03 | 170cm 기본 평균 상향 4세대 여돌 | 이제 170cm가 기본 | 4세대 여돌의 키 |
| 04 | 아이에게 독이 되는 잘못된 상식 5가지 | 부모님이 자주 하는 | 성장 방해 상식 5가지 |
| 05 | 시기 놓치면 생기는 일 7cm 효과 | 이 시기를 놓치면 | 7cm가 사라집니다 |
| 06 | 요즘 걸그룹 키 큰 이유 | 요즘 걸그룹이 | 유독 키 큰 이유 |
| 07 | 맨시티 홀란드가 집착한 것 수면 | 195cm 홀란드가 | 집착한 단 하나 |
| 08 | 어깨 깡패 신유 비결 어깨운동 | 어깨 깡패 신유가 | 초등학교 때 한 것 |
| 09 | 6살 키 검사 vs 사춘기 급성장기 | 6살 검사 vs 사춘기 | 진짜 골든타임은? |
| 10 | 성장판 손상 병원 가야하는 3가지 신호 | 성장판 손상 의심 | 바로 병원 갈 3신호 |
| 11 | 히틀러가 장기간 맞은 테스토스테론 | 키를 키우는 호르몬? | 오히려 아이 키를 멈춥니다 |
| 12 | 콩나물 20cm 배구여제 김연경 | 고등학교 때 +20cm | 김연경이 먹은 것 |
| 13 | O다리 고경표 숨은키 | O다리만 펴도 | 숨은 키가 나온다 |
| 14 | 세계 최초 에겐남 성전환 수술 | 세계 최초 에겐남 | 성전환 수술의 시작 |
| 15 | 170cm 아래 카리스마 남자 가수 10 | 170cm 이하라고 믿기 힘든 | 무대 장악력 남자 가수 10 |
| 16 | 지금은 같아도 최종 키가 다른 이유 | 지금 키는 같아도 | 최종 키가 갈리는 이유 |
| 17 | 160cm 이하 비율 레전드 여배우 10 | 비율 때문에 다들 속는 | 160cm 이하 여배우 10 |
| 18 | 자극적 콘텐츠 성인 키 영향 성조숙 | 자극적 콘텐츠가 | 아이 키를 멈춘다? |
| 19 | 시험기간 이거 먹입니다 기억력 | 시험기간, 우리 집은 | 이걸 먹입니다 |
| 20 | 가짜 성조숙증 3가지 체크 | 혹시 우리 아이도? | 가짜 성조숙증 체크 3 |
| 21 | 잠만 자도 크는 김태리 서파수면 | 잠만 자도 크는 | 김태리의 수면 비법 |
| 22 | 성장판 닫혔다 이곳도 확인 | 성장판 닫혔다고요? | 이곳도 확인했나요? |
| 23 | 의외로 안 좋은 아이들 간식 4개 | 의외로 키에 안 좋은 | 아이 간식 4가지 |
| 24 | 한국 사회에서 키 1cm 얼마 | 한국에서 키 1cm은 | 얼마일까요? |
| 26 | 키 멈춘 아이들 같은 걸 먹었다 음식민감성 | 키 멈춘 아이들 | 모두 이걸 먹고 있었다 |
| 27 | 이병헌 진짜 177cm 맞을까 | 만능 배우 이병헌 | 진짜 177cm 맞을까? |
| 28 | 슬라임이 성장판 망친다 환경호르몬 | 장난감 슬라임이 | 성장판을 망친다고? |
| 29 | 칼슘 비타민D 만으론 안 큰다 영양제 | 칼슘·비타민D만으론 | 뼈가 안 큽니다 |
| 30 | 성장클리닉 방문 전 체크 5개 | 성장클리닉 가기 전 | 꼭 체크할 5가지 |
| 31 | 운동하는 중3 183cm 정시아 식단 | 중3에 183cm 만든 | 정시아의 성장 식단 |
| 32 | 1년에 몇 cm 커야 할까 평균키 | 우리 아이 | 1년에 몇 cm 커야 할까? |
| 33 | 뼈나이 검사와 치료 시기는 다르다 | 뼈나이 검사는 왜 | 초등학생 때 할까? |
| 34 | 180cm 넘는 육각형 남돌 | 평균 더 커진 | 180cm 육각형 남돌 |
| 35 | 모델 되려면 꼭 할 습관 한혜진 | 모델이 되고 싶다면 | 꼭 해야 할 습관 |
| 36 | 주원 20cm 송지아 분유 루머 진실 | 분유가 키를 키운다? | 루머의 진실 |
| 37 | 많이 먹이고 잘 재웠는데 안 큰다면 | 많이 먹이고 잘 재웠는데 | 키가 안 큰다면? |
| 38 | 비주얼 천재인데 키 작은 남자 배우 10 | 비주얼 천재인데 | 의외로 키 작은 배우 10 |
| 39 | 장원영 안유진 170cm 비법 효과 | 장원영·안유진의 | 170cm 비법, 진짜일까? |
| 40 | 키 크는 수술 A to Z 사지연장술 | 60초로 보는 | 키 크는 수술 A to Z |
| 41 | 왜 키가 잴 때마다 다를까 | 왜 키는 | 잴 때마다 다를까요? |

## File Structure

- **Create** `remotion/src/repurpose/PurpleRepurpose.tsx` — 새 보라 프레임 컴포지션(한글 전용). `RepurposeProps` 대신 `PurpleProps = { videoSrc, videoSec, kicker, title, url }`.
- **Create** `remotion/src/repurpose/purpleTitles.ts` — `{ [youtubeId]: { kicker, title } }` 40개 + v4 신규.
- **Modify** `remotion/src/Root.tsx` — `purple-repurpose` Composition 등록(`calculateMetadata`로 길이).
- **Create** `remotion/scripts/repurpose-ko-purple-batch.mjs` — 37개 재렌더 배치(기존 `repurpose-batch.mjs` 미러: 번들 1회 + 순차 renderMedia, `--sample`/인덱스 인자, 출력 `out/shorts/repurpose-ko-purple/`).
- **Create** `remotion/scripts/register-purple-reels.mjs` — 완성본 4개 + 렌더 37개를 R2 업로드 → `reels.ko` 교체(비파괴 병합) + 커버 재추출 + title/caption 갱신. title 매칭으로 article 찾기. `--dry`.
- **Create** `remotion/scripts/reschedule-ko-purple.mjs` — ko 발행 큐 재예약(IG/FB, 기존 ko 큐 정리 후 신규 scheduled).
- **Reuse** `remotion/scripts/lib/reelDb.mjs`(REST/R2), `sources/originals/`, `_manifest.json`.

---

## Chunk 1: 컴포넌트 + 스타일 검증

### Task 1: PurpleRepurpose 컴포지션 작성

**Files:** Create `remotion/src/repurpose/PurpleRepurpose.tsx`, Modify `remotion/src/Root.tsx`

- [ ] **Step 1:** `PurpleRepurpose.tsx` 작성 — 스펙표대로. 배경 보라 그라데이션 AbsoluteFill / 중앙 영상은 `OffthreadVideo`를 `width:1080, height:1920, objectFit:cover, top: (1044-1920)/2 + 436` 식으로 폭채움+세로 가운데 크롭(중앙창 y436–1480에 클리핑 위해 래퍼 `overflow:hidden` + 절대배치) / 상단 밴드(킥커 박스 + 노랑 메인, Pretendard) / 하단 밴드(logo_en_wh + URL). `ensureFonts()` 호출. 길이 = `videoSec*fps`(아웃트로 없음).
- [ ] **Step 2:** `Root.tsx`에 `<Composition id="purple-repurpose" component={PurpleRepurpose} ... calculateMetadata={({props})=>({durationInFrames: Math.round(props.videoSec*30)})} width={1080} height={1920} fps={30} defaultProps={샘플}/>` 등록. import 추가.
- [ ] **Step 3:** 타입체크 `cd remotion && npx tsc --noEmit` → 0 에러.
- [ ] **Step 4:** Commit `feat(reel): add PurpleRepurpose composition for KO repurpose restyle`.

### Task 2: 첫 렌더 → 레퍼런스 대조 (시각 승인 게이트)

**Files:** 임시 렌더

- [ ] **Step 1:** 비연예인 교육형 1개(idx05 `IVeltl46vAU` 시기놓치면 7cm) + 연예인형 1개(idx15는 완성본이므로 대신 idx06 `a6xNHADHhBM` 걸그룹) 렌더:
  `cd remotion && npx remotion render src/index.ts purple-repurpose out/_work/purple-test-05.mp4 --props='{"videoSrc":"...","videoSec":..., "kicker":"이 시기를 놓치면","title":"7cm가 사라집니다","url":"dr187growup.com"}'`
  (renderMedia 실패 시 [[remotion_render_workaround]] renderFrames+ffmpeg.)
- [ ] **Step 2:** 산출물에서 프레임 추출(ffmpeg) → 레퍼런스 v1/v4와 나란히 비교(밴드 높이·보라색·노랑·크롭 프레이밍·로고 크기).
- [ ] **Step 3:** 차이 있으면 스펙 파라미터 조정 후 재렌더(최대 몇 회). **사용자에게 프레임 제시 + 승인 받기.** ← 여기서 멈추고 승인 전 대량 렌더 금지.

---

## Chunk 2: 제목 데이터 + 대량 렌더

### Task 3: purpleTitles.ts 작성

- [ ] **Step 1:** 위 표를 `{ [youtubeId]: {kicker,title} }`로. v4 신규(골든타임)는 별도 키. **사용자 확정 제목 반영.**
- [ ] **Step 2:** Commit `feat(reel): add purple repurpose two-line titles`.

### Task 4: 배치 렌더 스크립트 + 37개 렌더

**Files:** Create `remotion/scripts/repurpose-ko-purple-batch.mjs`

- [ ] **Step 1:** `_manifest.json` 로드 → 완성본 3개(id: LXGI2XrPfOI, B9y6RmYQtj8, 9C7PIn1Bub0) 제외한 37개에 대해 `purpleTitles`로 props 구성 → 번들 1회 + 순차 renderMedia → `out/shorts/repurpose-ko-purple/{idx}_{safeTitle}.mp4` + `_manifest.json`. 인덱스 인자로 재개 가능. (renderMedia 검증 실패 시 renderFrames+ffmpeg 경로.)
- [ ] **Step 2:** `--sample`로 2개 먼저 → OK 확인 → 전체 37개 렌더(백그라운드, 세션 유지). 오디오 보존 확인.
- [ ] **Step 3:** 산출 37개 + 완성본 4개(다운로드 폴더) 개수·재생 스팟체크.

---

## Chunk 3: R2·DB·발행 갱신

### Task 5: 완성본 4개 + 렌더 37개 등록(reels.ko 교체)

**Files:** Create `remotion/scripts/register-purple-reels.mjs` (⚠️ `cd ai-server && npm run dev` 선행 — R2 프록시 :4000)

- [ ] **Step 1:** 스크립트: (a) 완성본 4개 경로 매핑 — v1→title "…카리스마 넘치는 남자 가수들 10…"(#1016), v2→"히틀러…테스토스테론"(#1012), v3→"…비율 레전드급 여배우들 Top 10"(#1018), v4→**신규 article**(kind=custom, ko, sort_order 1043, title/caption=골든타임). (b) 렌더 37개는 manifest title로 article 매칭. (c) 각: R2 업로드(`uploadR2`) → 커버 ffmpeg 첫프레임 추출·업로드 → `reels.ko` 비파괴 병합(videoUrl/coverUrl/caption/hashtags, `reels.th` 보존) + article title 갱신(2단 제목 합친 표기 또는 메인). `--dry` 먼저.
- [ ] **Step 2:** `--dry` 실행 → 매칭·계획 검토(41건: 교체 40 + 신규 1). 매칭 실패 0 확인.
- [ ] **Step 3:** 실제 실행 → R2 URL HEAD 200 스팟체크. Commit 스크립트.

### Task 6: ko 발행 재예약

**Files:** Create `remotion/scripts/reschedule-ko-purple.mjs`

- [ ] **Step 1:** 기존 ko 큐(scheduled/draft) 정리 후, 40+1개를 ko IG(187growupkorea)·ko FB에 신규 scheduled(하루 2개 분산, 점심/저녁). **th 큐는 불변.** `--dry`.
- [ ] **Step 2:** `--dry` 검토 → 실행. 큐 상태 요약으로 확인.
- [ ] **Step 3:** 사용자에게 "기존 IG ko 발행분 수동 삭제" 안내.

---

## 검증 & 마무리

- [ ] `npx tsc --noEmit`(remotion) 0.
- [ ] 대표 릴 3개(교육형/연예인형/완성본) R2 영상 재생 확인.
- [ ] `marketing_articles` custom reels.ko 41건 videoUrl 갱신·reels.th 불변 확인(쿼리).
- [ ] CLAUDE.md·memory `shorts_repurpose_ig_fb.md` 갱신(보라 리스타일 추가).
- [ ] Git commit + push(사용자 "업데이트 하자" 워크플로우 시).

## 리스크

- **renderMedia 미기록**([[remotion_render_workaround]]): 첫 렌더에서 즉시 검증. 실패 시 renderFrames+ffmpeg mux(오디오 포함).
- **크롭 프레이밍**: 세로 가운데 크롭이 일부 원본에서 피사체를 자를 수 있음(레퍼런스도 동일 감수). 필요 시 per-id `cropOffset` 옵션 추가 여지.
- **v4 소스**: 다운로드 완성본만 사용(원본 없음) → 재렌더 불가·완성본 그대로. 신규 article로만 등록.
- **제목 품질**: 대량 렌더 전 사용자 확정 필수(Chunk 2 게이트).
