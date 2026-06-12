# 릴스 라이트 에디터 (웹 편집 + 로컬 렌더 워커) — 설계

날짜: 2026-06-12 · 상태: 리뷰 반영 v2 (3-렌즈 멀티에이전트 리뷰 blocking 3·advisory 20 반영)

## 목적

PresenterShort 릴스(마케팅 콘텐츠 #2, #3, 이후 생산분)의 수정·생산이 현재 전부
코드 작업이다: `script.json` 수기 편집, insertLabels x/y 눈대중 보정, 로컬 렌더
커맨드, 언어별 TTS·립싱크 수동 실행. 직원/원장이 코드 없이
`/marketing/content` 릴스 탭에서 **실시간 미리보기를 보며** 자막·헤더/CTA·인서트·
스티커·나레이션을 고치고 렌더(필요 시 TTS→립싱크 포함)까지 요청하는 내부
에디터를 만든다. CapCut류 범용 편집기가 아니라 **PresenterShort 포맷 전용
라이트 에디터**다.

## 결정 사항

- **웹 통합**: 에디터는 마케팅 스튜디오(`/marketing/content` → 릴스 탭 → 3번째
  서브탭 `✂️ 에디터`)에 둔다. 로컬 미니 에디터안은 기각(사용자 결정).
- **편집 범위 v1 = 풀 파이프라인**: 텍스트·인서트·스티커뿐 아니라 **나레이션
  텍스트 수정까지**. 나레이션이 바뀐 언어는 워커가 TTS→립싱크→렌더를 자동
  실행(사용자 결정).
- **대상 콘텐츠**: PresenterShort 파이프라인 생산분만(`reel_script` 있는
  콘텐츠). 옛 bespoke 쇼츠(초경·부작용 등 FaithfulShort/StackedShort)는 제외.
- **청크 구조 고정**: 청크 추가/삭제 없음(전 언어 나레이션·인포그래픽이 청크에
  묶여 있어 구조 변경은 스토리보드 재생산 영역). 편집은 청크 내부 값만.
- **script 단일 소스 = DB, 컬럼 소유권 분리**:
  `marketing_articles.reel_script`(**웹 전용 기록**) +
  `marketing_articles.reel_runtime`(**워커 전용 기록**). 양측이 서로의 컬럼을
  쓰지 않으므로 동시 기록 race가 구조적으로 없다. 로컬
  `src/shorts/{slug}/script.json`은 워커가 잡 처리 시 DB→파일로 sync하는
  산출물로 강등(기존 TTS 스크립트가 파일을 읽으므로 sync 유지).
- **TTS 필요 판정 = 저장된 플래그가 아니라 비교**: 렌더 요청 시
  `reel_script`의 나레이션과 `reel_runtime.tts_text`(마지막 TTS에 실제 사용된
  텍스트, 워커가 기록)를 비교해 다르면 kind=`full`. sticky dirty 플래그와 그
  클리어 race를 제거. "음성 강제 재생성" 체크박스로 동일 텍스트여도 full 가능.
- **렌더는 이 PC**: 립싱크 영상·TTS wav·presenter-base가 전부 이 PC에만
  있으므로(gitignore) 워커(`reel-worker.mjs`)가 잡 큐를 폴링해 처리.
- **렌더 입력 = 전(全) 원격 URL**: 워커 렌더는 영상·오디오·인서트·스티커를
  전부 R2 URL로 받는다(아래 "번들 캐시" 참조). 로컬 staticFile 의존은 고정
  에셋(로고·BGM)뿐.
- **컴포지션 단일 소스 공유**: PresenterShort를 에셋 주입형으로 리팩터해
  remotion 렌더와 v4 Player가 **같은 파일**을 import. 양쪽 React 19.2 /
  remotion 4.0.447. vite `resolve.dedupe` 필수(아래). 설정이 막히면 fallback =
  v4 사본 포팅(전환 기준은 "리스크" 절에 명시 — 사소한 tsc 에러는 사유 아님).
- **렌더 진입점 = 제네릭 컴포지션**: `PresenterGeneric` 1개를 Root.tsx에
  등록하고 inputProps(script/timing/lang/assets)로 렌더(render-thumbs 패턴).
  새 콘텐츠마다 per-slug index.tsx 등록 불필요(기존 index.tsx는 스튜디오
  프리뷰용 보존).
- **스티커/효과 라이브러리**: 전역 테이블 `marketing_reel_stickers` + R2.
  효과 애니메이션은 에셋이 아니라 **코드 프리셋**(pop/float/pulse/shake)으로
  모든 스티커에 적용. Lottie는 v2.
- **용어**: 이 문서에서 "스티커"는 `chunks[].stickers` 필드(이모지/스티커
  이미지 오버레이)만 가리킨다. 자막/헤더/CTA/인서트는 "텍스트·인서트 편집"으로
  부른다(P2). 혼동 방지를 위해 필드명도 overlays가 아닌 `stickers`.

## 데이터 모델 (migration 057)

### `marketing_articles.reel_script` JSONB — **웹만 기록**

```jsonc
{
  "slug": "성장판나이",              // remotion 폴더명(한글)
  "script": {                        // 기존 script.json 구조 + stickers 확장
    "header": { "ko": { "top": "...", "mark": "..." }, ... },
    "headerStyle": { "markBg": "#E0568A", "markFg": "#fff" },
    "cta": { "ko": "...", ... },
    "chunks": [{
      "id": "c1", "start": 0, "end": 3.5,   // 기존 script.json 필드 — 에디터는 미편집 필드를 라운드트립 보존
      "ko": "나레이션…", "cap_ko": ["줄1","줄2"], "hl_ko": "강조어", // ×6언어
      "insert": "https://r2…/ig1.png",   // R2 절대 URL(시드 시 치환)
      "insertLabels": [{ "x": 0.26, "y": 0.5, "size": 32, "weight": 900,
                          "color": "#5b3fa6", "pill": null, "ko": "…", "en": "…" }],
      "stickers": [{                  // 신규: 스티커/이모지 (P4)
        "id": "st1", "src": "https://r2…/sticker.png", "kind": "image|gif",
        "x": 0.78, "y": 0.18, "w": 0.16, "rot": -8,
        "fromFrac": 0, "durFrac": null, // 청크 길이 대비 비율(0~1, null=끝까지)
        "anim": "none|pop|float|pulse|shake", "loop": true
      }]
    }]
  }
}
```

- **stickers 구간은 비율(fromFrac/durFrac)**: 청크 길이(durFrames)가 언어마다
  달라 절대 프레임은 언어 간 어긋나거나 범위를 벗어남 → 렌더 시
  `round(frac × durFrames)` + 클램프. 기본값(0, null)=청크 전체.
- **좌표계 2종**: stickers x/y/w = 1080×1920 전체 캔버스 분수(중심 기준,
  `translate(-50%,-50%)`, w=가로폭 분수). insertLabels = 기존 그대로 인서트
  패널 존(1920 중 y 300~1380) 내 분수. 둘을 섞지 않는다.

### `marketing_articles.reel_runtime` JSONB — **워커만 기록**

```jsonc
{
  "timing":   { "ko": [{ "id": "c1", "durFrames": 128, "origStartF": 0,
                          "rate": 0.82, "natSec": 4.27 }], ... },
  "preview":  { "ko": { "lipsyncUrl": "https://r2…",
                         "audio": { "c1": "https://r2…", ... } } },
  "tts_text": { "ko": { "c1": "마지막 TTS에 사용된 나레이션 원문", ... } }
}
```

- 웹은 읽기만 한다(미리보기·kind 판정). 웹 저장은 `reel_script` 컬럼만
  PATCH하므로 워커 결과를 덮어쓸 경로가 없다.
- 워커도 `reel_runtime` 전체를 읽고-병합-쓰기하되 자기 잡의 lang 키만 갱신.
  워커는 단일 프로세스(동시 잡 1개)라 워커-워커 race 없음.
- `reels[lang].videoUrl`(기존 컬럼) 갱신은 read-merge-write 비파괴 병합 —
  영상 제작 탭 수동 업로드와 이론상 겹칠 수 있으나 기존 운영 패턴
  (upload-reel-covers)과 동일 수준으로 수용.

### `marketing_reel_jobs` (신규 테이블)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| article_id | uuid FK→marketing_articles | |
| slug | text | 워커 편의 |
| lang | text | ko/th/vi/en/cn/ch |
| kind | text CHECK | `render` / `full`(TTS→립싱크→렌더) |
| status | text CHECK | `queued→claimed→tts→lipsync→upload_preview→render→upload→done` / `failed` |
| progress_note | text | 단계 상세("립싱크 인퍼런스 중…") |
| error | text | 실패 시 앞 500자 |
| requested_at / started_at / finished_at | timestamptz | |
| updated_at | timestamptz | **heartbeat — 워커가 단계 전이·장단계 중 주기(60s) 갱신** |
| claimed_by | text | 워커 hostname |

- stale 회수 판정은 `updated_at` 기준(active 상태 + 10분 미갱신 → queued
  복귀). started_at 기준은 립싱크가 정상적으로 10분+ 걸려 오탐이라 쓰지 않음.
  heartbeat가 갱신되는 잡은 같은 호스트의 다른 프로세스(--once 추가 기동)도
  건드리지 않는다.
- 웹은 같은 (article_id, lang)에 active(queued~upload) 잡이 있으면 insert
  차단(안내 배너).
- RLS: 기존 마케팅 테이블과 동일(anon 허용 — dev 전용 운영, prod auth는 기존
  marketing 표면과 동일 범주, 신규 회귀 아님).

### `marketing_reel_worker` (신규 1행 테이블 — 워커 오프라인 가시성)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | int PK CHECK(id=1) | 싱글톤 |
| hostname | text | |
| last_seen | timestamptz | 워커가 폴링마다 upsert |

웹 잡 위젯: queued 잡 존재 + `last_seen` 2분 초과 → "⚠️ 렌더 워커 꺼짐(마지막
신호 N분 전) — 사무실 PC에서 reel-worker 실행 필요" 배너. 비개발자에게 가장
흔한 장애 모드(워커 미기동)를 구분해 보여준다.

### `marketing_reel_stickers` (신규 테이블)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| name | text | 검색용 |
| category | text CHECK | `sticker` / `emoji` |
| url | text | R2 `marketing/reels/stickers/…` |
| kind | text CHECK | `image`(PNG/정적 WebP) / `gif` |
| meta | jsonb | 원본 px 크기 등 |
| created_at | timestamptz | |

- **애니메이션 WebP 업로드 차단**(GIF만 허용): `@remotion/gif`는 GIF 전용이고
  애니 WebP가 `<Img>`로 들어가면 렌더 프레임 캡처가 비결정적.
- 효과(pop/float/pulse/shake)는 코드 프리셋이므로 테이블에 없다.

## 컴포지션 공유 + 리팩터 (remotion/)

- **`src/lib/assets.ts` 신설**:
  `let resolver = staticFile; export const asset = (p) => p.startsWith("http") ? p : resolver(p); export const setAssetResolver = …`.
  **staticFile 호출부 전체(InsertPanel·intro/CTA 로고·ShortLogo·BGM)를
  asset()으로 치환**하되, 로컬 경로 해석이 실제로 필요한 건 고정 에셋(로고
  `images/logo_en_wh.png`, BGM `audio/bg1.mp3`)뿐이고 인서트/스티커의 R2
  URL은 http passthrough로 통과한다. remotion 렌더는 기본값(staticFile),
  v4는 마운트 시 `(p) => "/" + p`(public 사본). 언어별 영상/오디오는 리졸버로
  가로채지 않는다(아래 assets prop) — 한글 slug 경로 인코딩 리스크 자체를
  제거.
- **`assets` prop 신설(PresenterShort)**:
  `assets?: { videoSrc: string; audio: Record<chunkId, string> }`.
  있으면 그 URL을 직접 사용, 없으면 기존 staticFile 경로 폴백(per-slug
  index.tsx 하위호환). v4 Player와 워커 렌더는 둘 다 `reel_runtime.preview`의
  R2 URL로 이 prop을 구성한다.
- **순서 제약(중요)**: InsertPanel·intro/CTA 로고·ShortLogo의 `staticFile(...)`
  → `asset(...)` 치환 리팩터가 **insert의 R2 URL화(시드)보다 먼저** 들어가야
  한다. 현재 InsertPanel은 `staticFile(src)`라 절대 URL을 넣으면 깨진다.
  P1 내부 순서: 리팩터 → 기존 렌더 회귀 0 확인 → 시드.
- **`StickerLayer` 신설**(PresenterShort 내부, P4): chunk.stickers를 Sequence로
  렌더. kind=gif는 `@remotion/gif`의 `<Gif>`(타임라인 동기), image는 `<Img>`.
  anim 프리셋: pop=스프링 등장, float=sin 둥실, pulse=스케일 1±0.05,
  shake=±2° 진동. fromFrac/durFrac × durFrames + 클램프.
- **`PresenterGeneric`**: Root.tsx 등록 1회. **`calculateMetadata`는 워커
  렌더(selectComposition) 경로 전용** — Player는 calculateMetadata를 타지
  않으므로 v4가 durationInFrames/fps/size를 직접 prop으로 넘긴다(에디터의
  FROM 누적 유틸이 duration 소스 겸함).
- **`ensureFonts` Player 가드**: `getRemotionEnvironment()`로 Player 환경이면
  `delayRender` 생략(폰트 `<link>` 주입만) — Google Fonts 지연 시 Player 에러
  오버레이로 떨어지는 실패 모드 차단. 렌더 경로 동작 불변. (SC/TC 로드 대기
  누락은 기존 동작 — 본 스펙 비범위.)
- **의존성(사실관계 정정 반영)**: `@remotion/gif`는 **양쪽 모두 신규
  설치**(remotion·v4, exact 4.0.447). `@remotion/renderer`는 이미
  resolvable(@remotion/cli 전이 의존, render-thumbs.mjs가 실사용 중) —
  package.json에 명시 선언만 추가. remotion repo의 `^4.0.447` caret을 **exact
  핀으로 변경**(v4와 드리프트 방지).

### v4 측 통합

- deps: `remotion@4.0.447`(exact), `@remotion/player@4.0.447`,
  `@remotion/gif@4.0.447`.
- vite: `resolve.alias` `@reel` → `../remotion/src` + `server.fs.allow` 확장 +
  **`resolve.dedupe: ['react','react-dom','remotion','@remotion/gif']`** +
  `optimizeDeps.include` 명시. dedupe가 없으면 remotion/node_modules의 React·
  remotion이 이중 로드되어 Invalid hook call / Timeline 컨텍스트 단절(프레임 0
  고정)이 난다 — **크로스 import의 1순위 실패 모드이므로 P1 검증 첫 항목**.
- tsconfig `paths` 동기. v4 tsc(TS 5.9)가 remotion 소스(TS 6 기준)를 검사하게
  됨 — 공유 소스는 TS 5.9 통과 문법 유지, 예상되는 에러 부류(예: fonts.ts의
  미사용 staticFile import = TS6133)는 remotion 소스를 고친다(같은 repo).
  **P1 완료 기준: v4 `tsc --noEmit` 0 + remotion repo tsc 0 동시 통과.**
- `ReelEditorPanel`은 `React.lazy` — remotion deps가 마케팅 메인 청크에 안
  섞이게 별도 청크.
- 고정 에셋 사본: `v4/public/images/logo_en_wh.png` **이미 존재(확인됨)**,
  `v4/public/audio/bg1.mp3`만 추가.

## 에디터 UI (v4, `features/marketing/components/content/reelEditor/`)

- **진입**: ReelsPanel 서브탭 `✂️ 에디터`(3번째). `reel_script` 없는 콘텐츠는
  빈 상태("스토리보드 파이프라인 생산분만 지원 — 온보딩은 push-reel-script").
- **레이아웃**: 좌 Player(9:16) │ 우 인스펙터 │ 하단 청크 스트립. 언어는 페이지
  상단 공용 `LanguageSelector`를 따른다(자체 셀렉터 없음).
- **Player 래퍼는 CSS `aspect-ratio: 9/16` 고정** — 레터박스가 생기지 않게
  해 좌표 환산을 래퍼 rect 기준으로 단순화.
- **청크 스트립**: 폭=durFrames 비례(timing 없으면 110f 균등 가정), 클릭 →
  `playerRef.seekTo(FROM[i])`. 나레이션이 tts_text와 다른 청크엔 🎙 배지.
- **인스펙터(선택 청크)**: 나레이션 textarea / 자막 1~2줄 + 하이라이트
  문자열(자막에 포함돼야 색 입혀짐 헬퍼 안내) / 인서트(reel_assets 슬롯
  썸네일 선택/해제 + insertLabels 리스트: 언어별 텍스트·크기·색·pill·추가·삭제)
  / 스티커(P4: anim·구간 frac·삭제).
- **헤더/CTA 아코디언**: header.top/mark(언어별), markBg/markFg, cta(언어별).
- **캔버스 직접 조작 — 좌표 공식(두 좌표계)**:
  - stickers: `x = (pointerX − rect.left) / rect.width`,
    `y = (pointerY − rect.top) / rect.height` (전체 캔버스 분수).
  - insertLabels: x는 동일, **y는 패널 존 환산** —
    `y = (pointerY − rect.top − rect.height × (300/1920)) / (rect.height × (1080/1920))`.
  - 스티커는 모서리 핸들 스케일 + 인스펙터 회전.
- **실행 취소**: 세션 내 in-memory undo/redo(Ctrl+Z/Y, 스냅샷 스택 ≤20) —
  드래그 실수·라벨 삭제가 700ms 자동저장으로 즉시 영구화되는 것 방어.
  서버측 버전 이력은 **v1 명시 제외**.
- **저장**: 700ms debounce → `saveReelScript(articleId, reelScript)` —
  **`reel_script` 컬럼만 PATCH**(reel_runtime 불가침). `onPatch`로 부모 갱신
  (stale 방지 — CustomReelsPanel 교훈).
- **렌더 요청(언어별 버튼)**: kind 판정 = `script` 나레이션 vs
  `runtime.tts_text[lang]` 비교. **full 강제 조건 = timing 부재 또는
  `preview[lang].lipsyncUrl` 부재**(render-only는 원격 videoSrc가 필수라
  preview 없는 언어는 렌더 불가). full이면
  "음성+립싱크 재생성, 수십 분" 확인창. "🎙 음성 강제 재생성" 체크박스로
  동일 텍스트도 full 가능. 활성 잡 있으면 비활성.
- **잡 위젯**: 최근 잡 목록 + 활성 잡 5초 폴링(status/progress_note). failed →
  에러 + 재시도(동일 파라미터 재큐). done → `reels[lang].videoUrl` 자동 반영.
  **워커 오프라인 배너**(marketing_reel_worker.last_seen 2분 초과 + queued
  존재 시). 잡은 claim 시점 스냅샷으로 처리됨을 안내("진행 중 편집은 다음
  렌더에 반영").
- **미리보기 제한 모드**: `preview[lang]` 없으면 패널 placeholder + 무음
  (자막·헤더·인서트·스티커는 표시), `timing[lang]` 없으면 110f 균등 가정.
  편집·렌더 요청 가능(이 경로가 vi/en/cn/ch 신규 언어 생산 동선).

## 워커 (`remotion/scripts/reel-worker.mjs`)

- **env**: `ai-server/.env` 파싱(SUPABASE_URL·SERVICE_ROLE_KEY·PIN·PORT —
  upload-reel-covers.mjs 패턴) + `remotion/.env`(ELEVEN_*).
- **모드**: `--once` / `--watch`(15초 폴링 상주, 폴링마다
  marketing_reel_worker.last_seen upsert). 시작 시 stale 회수(`updated_at`
  10분 미갱신 active 잡 → queued).
- **잡 처리 순서** (단계마다 status + updated_at 갱신, 장단계는 60s heartbeat):
  1. **claim**: `PATCH …?status=eq.queued&id=eq.{id}` 조건부 원자 claim.
  2. **sync**: `reel_script` pull → `src/shorts/{slug}/script.json` 덮어쓰기
     (insert/sticker R2 URL은 그대로 — gen-tts-short는 텍스트만 읽으므로 무해).
  3. **kind=full**: `gen-tts-short.mjs {slug} {lang}` child_process(기존
     스크립트 무수정) → `timing-{lang}.json` → `prep-lipsync.mjs {slug} {lang}`
     → LatentSync 인퍼런스(LS 디렉토리에서 실행) → 산출 mp4
     `public/videos/{slug}-presenter-lipsync-{lang}.mp4` 배치.
  4. **upload_preview**(full만): 립싱크 mp4 + 청크 wav들 → R2
     `marketing/reels/preview/{slug}/{lang}/` → `reel_runtime`의
     timing[lang]·preview[lang]·tts_text[lang] 병합 PATCH.
     **렌더보다 먼저 업로드하는 이유**: 렌더가 전원격 URL을 쓰므로(5단계)
     신규 산출물이 R2에 먼저 있어야 하고, 그 덕에 `bundle()` 캐시를 잡 간
     재사용해도 안전하다 — bundle()은 public/을 번들 산출물로 복사하므로
     번들 후 생성된 로컬 파일은 staticFile로 보이지 않는 문제(public 2GB
     재번들 비용 포함)를 원천 회피.
  5. **render**: `@remotion/bundler`+`@remotion/renderer` 프로그램매틱 —
     **번들 1회 캐시 + 잡마다 selectComposition/renderMedia**.
     `PresenterGeneric` inputProps = `{ script, timing, lang, slug,
     assets: { videoSrc: preview.lipsyncUrl, audio: preview.audio } }`(전원격).
     고정 에셋(로고·BGM)만 staticFile(번들 시점 public에 이미 존재).
     → `out/shorts/{slug}/{slug}-{lang}.mp4`.
  6. **upload**: 최종 mp4 → ai-server `POST /api/r2/upload`(로컬, PIN) →
     `reels[lang].videoUrl` 비파괴 병합 PATCH.
  7. **done**: finished_at 기록.
- **실패 처리**: 어느 단계든 status=failed + error(앞 500자) + 마지막
  progress_note 보존(어디서 죽었는지 웹에서 보이게). LatentSync 실패 흔함 →
  재시도는 웹 버튼.
- **전제**: 업로드 단계는 로컬 ai-server 실행 필요. 미응답이면
  "ai-server(localhost:{port}) 미응답" 명시 에러로 failed.

## 온보딩/시드 (`remotion/scripts/push-reel-script.mjs`)

**1회성 이관이 아니라 표준 온보딩 스크립트**: 기존 #2/#3 이관 + **신규
콘텐츠(#4 이후) 등록**에 동일하게 사용. 신규 콘텐츠 운영 흐름 =
`storyboard-to-reel.mjs <n>`(spec→script.json) → `push-reel-script.mjs <slug>
--article <sortOrder>`(DB 등록) → 이후 편집·언어 생산은 전부 웹.

- 사용: `node scripts/push-reel-script.mjs <slug> --article <sortOrder>`
  (slug↔article 매핑은 인자로 명시 — 자동 추측 안 함). `--check` 무변경 점검.
- 동작: 로컬 `script.json`(+있으면 `timing-*.json`) → reel_script/reel_runtime
  변환. insert 로컬 경로 `images/{slug}/igN.png` → article `reel_assets`의 R2
  URL 치환(슬롯 인덱스 매칭). 보유 언어의 립싱크 mp4·wav → R2 preview 업로드.
  **preview를 업로드한 언어는 `tts_text`도 현재 나레이션으로 시드**(이후 자막
  수정이 render-only로 정확히 판정되게). preview 없는 언어는 tts_text 미시드
  → 첫 렌더가 자연히 full.
- **preflight 가드(파괴 방지 — 프로젝트 교훈)**: 대상 article에 `reel_script`가
  이미 존재하면 **거부 + `--force` 요구**(웹 편집본을 날리는 경로임을 출력).
  대상 article에 active 잡(queued~upload, 상태는 코드에서 명시 나열) 존재
  시에도 거부 — 재시드와 진행 중 잡의 reel_runtime 병합이 겹치는 창 차단.
  insert↔reel_assets 슬롯 매칭 실패(빈 슬롯 등) 시 **에러로 중단** + "해당
  인포그래픽을 InfographicAssetsPanel로 먼저 업로드" 안내(절반 등록 없음).

## 엣지 케이스

- **동시 편집**: last-write-wins(소규모 팀). 충돌 감지·서버측 이력 **v1 명시
  제외**(세션 undo로 실수 복구만 지원).
- **중복 잡**: 웹 insert 전 active 잡 조회로 차단.
- **잡 진행 중 편집**: 허용. 워커는 claim 시점 reel_script 스냅샷으로 처리.
  이후 편집분은 다음 렌더 요청 시 tts_text 비교로 정확히 kind 판정됨(플래그
  클리어 race 없음).
- **언어별 비대칭**: 나레이션은 있는데 timing 없는 언어(vi/en/cn/ch) → 제한
  모드 + 렌더 요청 시 kind=full 강제.
- **스티커 구간**: fromFrac/durFrac 비율 저장으로 언어 간 자동 비례(절대
  프레임이면 짧은 언어에서 범위 이탈). 렌더 시 클램프.
- **GIF 스티커 CORS**: `<Gif>`는 fetch 디코드라 CORS 적용 — **R2 버킷 CORS
  설정이 P4 선행 작업**(Player dev 오리진 + 렌더 헤드리스). 애니 WebP는
  업로드 차단.
- **cn/ch 음성**: gen-tts-short가 해당 텍스트로 TTS(기존 동작 — 만다린 1음성
  전략은 콘텐츠 작성 단계 결정, 에디터 비관여).

## Graceful (migration 057 미적용 시)

- `reel_script`/`reel_runtime` select 실패 → 에디터 탭에 "migration 057 적용
  필요" 안내(다른 서브탭 정상). jobs/stickers/worker insert 실패 → 동일 안내.
  기존 기능(스토리보드·영상 제작 탭) 무영향.

## 테스트

- **순수 함수 분리 + 단위 테스트**: 좌표 변환(두 좌표계 — 전체 캔버스 vs
  인서트 패널 존 y 환산), FROM 누적·duration 계산(timing 부재 110f 폴백 포함),
  kind 판정(나레이션 vs tts_text 비교), 스티커 frac→frame 클램프, undo 스택,
  push 스크립트 insert URL 치환·preflight. 워커·스크립트(.mjs)는 `node --test`,
  v4는 순수 유틸을 `utils/reelEditor.ts`로 분리 + `tsc --noEmit` 0.
- **P1 검증 시퀀스(크로스 import)**: ① dedupe 설정 후 Player 마운트 —
  Invalid hook call/프레임 0 고정 없음 ② 양쪽 tsc 0 ③ 기존 remotion 렌더
  회귀 0(성장판나이 ko 1프레임 still 비교).
- **수동 E2E**(P2): #3 ko 자막 한 글자 수정 → render 잡 → videoUrl 갱신.
  (P3): th 나레이션 한 문장 수정 → full 잡 → TTS/립싱크/렌더 통과.

## 구현 단계

- **P1 토대**: migration 057 + asset()/assets prop 리팩터(InsertPanel 포함,
  기존 렌더 회귀 0 확인 → 이후 시드) + `PresenterGeneric` + v4
  deps/alias/dedupe(또는 fallback 사본 전환 결정) + 읽기전용 에디터(Player+
  청크 스트립+시킹) + `push-reel-script.mjs`로 #2/#3 시드.
- **P2 텍스트·인서트 편집**: 인스펙터(자막/하이라이트/헤더/CTA/인서트/라벨
  드래그) + 세션 undo + 저장 + 렌더 잡(kind=render) + 워커(claim→render→
  upload→done) + 워커 heartbeat/오프라인 배너. 워커의 reels 병합 작업 시
  `saveReels`(영상 제작 탭)도 lang 단위 병합 PATCH로 교정해 잔여 겹침 제거.
- **P3 풀 파이프라인**: 나레이션 편집 + tts_text 비교 kind 판정 + 워커
  full(TTS→립싱크→upload_preview) + 신규 언어 생산 경로.
- **P4 스티커/효과**: R2 CORS 선행 + `marketing_reel_stickers` + 라이브러리
  패널 + stickers 편집(드래그/스케일/회전/구간) + `StickerLayer` + anim
  프리셋 + `@remotion/gif`(양쪽 설치).

## 리스크

- **크로스 import**: 1순위 실패 모드 = 이중 React/remotion 인스턴스 →
  `resolve.dedupe`로 해결(P1 검증 첫 항목). 2순위 = TS 버전 차(remotion TS
  6.0.2 vs v4 5.9.3) → 공유 소스 TS 5.9 호환 유지. **fallback(사본 포팅) 전환
  기준**: dedupe·optimizeDeps·alias를 적용하고도 Player 런타임이 깨질 때만.
  미사용 import류 tsc 에러는 전환 사유 아님(소스 수정으로 해소).
- **LatentSync 무인 실행**: GPU 점유·간헐 실패 → 단계별 progress_note +
  failed/재시도로 흡수. 워커 가동 여부는 사용자가 통제(--watch 창), 꺼짐은
  웹 배너로 가시화.
- **R2 미리보기 용량**: 립싱크 mp4 언어당 ~20-40MB × 콘텐츠 × 6언어 — 현
  운영(영상 100MB 한도) 범위. 저비트레이트 미리보기 인코딩은 v2.
- **prod auth**: 기존 마케팅 표면과 동일하게 dev(localhost) 중심 — 신규 회귀
  아님(기존 ⚠️ prod auth 항목 범주).
