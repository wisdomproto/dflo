# 릴스 라이트 에디터 (웹 편집 + 로컬 렌더 워커) — 설계

날짜: 2026-06-12 · 상태: 초안(리뷰 중)

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
- **편집 범위 v1 = 풀 파이프라인**: 오버레이(자막/헤더/CTA/인서트/스티커)뿐
  아니라 **나레이션 텍스트 수정까지**. 나레이션이 바뀐 언어는 워커가
  TTS→립싱크→렌더를 자동 실행(사용자 결정).
- **대상 콘텐츠**: PresenterShort 파이프라인 생산분만(`reel_script` 있는
  콘텐츠). 옛 bespoke 쇼츠(초경·부작용 등 FaithfulShort/StackedShort)는 제외.
- **청크 구조 고정**: 청크 추가/삭제 없음(전 언어 나레이션·인포그래픽이 청크에
  묶여 있어 구조 변경은 스토리보드 재생산 영역). 편집은 청크 내부 값만.
- **script 단일 소스 = DB**: `marketing_articles.reel_script` JSONB가 진실.
  로컬 `src/shorts/{slug}/script.json`은 워커가 잡 처리 시 DB→파일로 sync하는
  산출물로 강등(기존 스크립트들이 파일을 읽으므로 sync 유지).
- **렌더는 이 PC**: 립싱크 영상·TTS wav·presenter-base가 전부 이 PC에만
  있으므로(gitignore) 워커(`reel-worker.mjs`)가 잡 큐를 폴링해 처리.
- **컴포지션 단일 소스 공유**: PresenterShort를 에셋 리졸버 주입형으로
  리팩터해 remotion 렌더와 v4 Player가 **같은 파일**을 import. 양쪽 React 19.2 /
  remotion 4.0.447로 호환 확인됨. vite/tsc 설정이 꼬이면 fallback = v4에 사본
  포팅(드리프트 감수, 명시적 결정 후 전환).
- **렌더 진입점 = 제네릭 컴포지션**: `PresenterGeneric` 1개를 Root.tsx에
  등록하고 inputProps(script/timing/lang/slug/videoSrc)로 렌더(render-thumbs
  패턴). 새 콘텐츠마다 per-slug index.tsx 등록이 필요 없어짐(기존 index.tsx는
  스튜디오 프리뷰용으로 보존).
- **스티커/효과 라이브러리**: 전역 테이블 `marketing_reel_stickers` + R2.
  효과 애니메이션은 에셋이 아니라 **코드 프리셋**(pop/float/pulse/shake)으로
  모든 스티커에 적용. Lottie는 v2.

## 데이터 모델 (migration 057)

### `marketing_articles.reel_script` JSONB (컬럼 추가)

```jsonc
{
  "slug": "성장판나이",              // remotion 폴더명(한글)
  "script": {                        // 기존 script.json 구조 + overlays 확장
    "header": { "ko": { "top": "...", "mark": "..." }, ... },
    "headerStyle": { "markBg": "#E0568A", "markFg": "#fff" },
    "cta": { "ko": "...", ... },
    "chunks": [{
      "id": "c1",
      "ko": "나레이션…", "cap_ko": ["줄1","줄2"], "hl_ko": "강조어", // ×6언어
      "insert": "https://r2…/ig1.png",   // R2 절대 URL(에디터 저장 시), 렌더·플레이어 모두 URL 직접 로드
      "insertLabels": [{ "x": 0.26, "y": 0.5, "size": 32, "weight": 900,
                          "color": "#5b3fa6", "pill": null, "ko": "…", "en": "…" }],
      "overlays": [{                  // 신규: 스티커/이모지
        "id": "ov1", "src": "https://r2…/sticker.png", "kind": "image|gif",
        "x": 0.78, "y": 0.18, "w": 0.16, "rot": -8,
        "fromF": 0, "durF": null,     // 청크 내 프레임(durF null=청크 끝까지)
        "anim": "none|pop|float|pulse|shake", "loop": true
      }]
    }]
  },
  "timing": { "ko": [{ "id": "c1", "durFrames": 128, "origStartF": 0,
                        "rate": 0.82, "natSec": 4.27 }], ... },
                                      // 워커(TTS)가 생성·푸시백, 웹은 읽기전용
  "preview": { "ko": { "lipsyncUrl": "https://r2…", "audio": { "c1": "https://r2…" } } },
                                      // Player 미리보기 에셋(워커가 업로드)
  "dirty": { "th": { "tts": true } }  // 나레이션 변경 마크 → 렌더 요청 시 kind 결정
}
```

**좌표계**: overlays의 x/y/w = **1080×1920 전체 캔버스 분수(0~1), 중심 기준**
(`translate(-50%,-50%)`, w=가로폭 분수). insertLabels는 기존(인서트 패널 내
분수) 유지 — 두 좌표계를 섞지 않는다.

### `marketing_reel_jobs` (신규 테이블)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| article_id | uuid FK→marketing_articles | |
| slug | text | 워커 편의(조인 절약) |
| lang | text | ko/th/vi/en/cn/ch |
| kind | text CHECK | `render`(렌더+업로드만) / `full`(TTS→립싱크→렌더) |
| status | text CHECK | `queued→claimed→tts→lipsync→render→upload→done` / `failed` |
| progress_note | text | 단계 상세("립싱크 인퍼런스 중 3/10분…") |
| error | text | 실패 시 앞 500자 |
| requested_at / started_at / finished_at | timestamptz | |
| claimed_by | text | 워커 hostname(stale 회수용) |

- 웹은 같은 (article_id, lang)에 active(queued~upload) 잡이 있으면 insert
  차단(안내 배너).
- RLS: 기존 마케팅 테이블과 동일(anon 허용 — dev 전용 운영, prod auth는 기존
  marketing 라우터 제약과 동일 범주로 신규 회귀 아님).

### `marketing_reel_stickers` (신규 테이블)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| name | text | 검색용 |
| category | text CHECK | `sticker` / `emoji` |
| url | text | R2 `marketing/reels/stickers/…` (PNG/WebP/GIF 원본) |
| kind | text CHECK | `image` / `gif` (렌더 분기용) |
| meta | jsonb | 원본 px 크기 등 |
| created_at | timestamptz | |

효과(pop/float/pulse/shake)는 코드 프리셋이므로 테이블에 없다.

## 컴포지션 공유 + 리팩터 (remotion/)

- **`src/lib/assets.ts` 신설**: 
  `let resolver = staticFile; export const asset = (p) => p.startsWith("http") ? p : resolver(p); export const setAssetResolver = (fn) => …`.
  remotion 렌더는 기본값(staticFile), v4 에디터는 마운트 시 1회
  `setAssetResolver`로 교체.
- **PresenterShort / ShortLogo**: `staticFile(...)` 직접 호출 → `asset(...)`
  치환. 동작 변화 없음(렌더 경로는 리졸버 기본값이 staticFile).
- **`OverlayLayer` 신설**(PresenterShort 내부): chunk.overlays를 Sequence로
  렌더. kind=gif는 `@remotion/gif`의 `<Gif>`(타임라인 동기), image는 `<Img>`.
  anim 프리셋: pop=스프링 등장, float=sin 둥실 루프, pulse=스케일 1±0.05,
  shake=±2° 진동. fromF/durF로 청크 내 부분 구간 지원.
- **`PresenterGeneric`**: Root.tsx 등록 1회.
  `calculateMetadata`로 `durationInFrames = Σ timing.durFrames`.
  inputProps = `{ script, timing, lang, slug, videoSrc }`.
- **의존성 추가**: remotion repo에 `@remotion/gif`, `@remotion/bundler`는 이미
  있음 / `@remotion/renderer`(워커 프로그램매틱 렌더용) 추가.

### v4 측 통합

- deps: `remotion@4.0.447`(정확 버전 고정 — Player와 컴포지션 버전 미스매치
  경고 방지), `@remotion/player@4.0.447`, `@remotion/gif@4.0.447`.
- vite `resolve.alias`: `@reel` → `../remotion/src` + `server.fs.allow` 확장.
  tsconfig `paths` 동기. v4 strict tsc가 remotion 소스를 검사하게 되므로,
  통과 못 하는 사소한 타입 이슈는 remotion 소스 쪽을 고친다(어차피 같은 repo).
  해결이 과하게 번지면 **fallback: 사본 포팅**으로 전환(이 결정은 P1에서 확정).
- `ReelEditorPanel`은 `React.lazy` — remotion deps가 마케팅 메인 청크에
  섞이지 않게 별도 청크.
- 고정 에셋 사본: `v4/public/images/logo_en_wh.png`(이미 logo_en 계열 보유
  여부 확인 후 없으면 추가), `v4/public/audio/bg1.mp3`. v4 리졸버는
  `videos/{slug}-presenter-lipsync-{lang}.mp4` → `preview[lang].lipsyncUrl`,
  `audio/shorts/{slug}/{lang}/{id}.wav` → `preview[lang].audio[id]`,
  그 외 → `/` + path(v4 public).
- `OffthreadVideo`는 Player에서 자동으로 `<Video>` 폴백 — 코드 변경 불필요.
- 폰트(`ensureFonts`)는 Google Fonts `<link>` 주입이라 Player 환경에서 그대로
  동작.

## 에디터 UI (v4, `features/marketing/components/content/reelEditor/`)

- **진입**: ReelsPanel 서브탭 `✂️ 에디터`(3번째). `reel_script` 없는
  콘텐츠는 빈 상태("스토리보드 파이프라인 생산분만 지원") 표시.
- **레이아웃**: 좌 Player(9:16, 컨트롤·루프) │ 우 인스펙터 │ 하단 청크 스트립.
  언어는 페이지 상단 공용 `LanguageSelector`를 따른다(탭 자체 셀렉터 없음 —
  기존 원칙).
- **청크 스트립**: 폭=durFrames 비례 바(c1…cN), 클릭 → `playerRef.seekTo(누적
  시작 프레임)` + 선택 강조. 나레이션 dirty 청크엔 🎙 배지.
- **인스펙터(선택 청크)**:
  - 나레이션 textarea(현재 언어) — 수정 시 `dirty[lang].tts = true`
  - 자막 줄(1~2줄) + 하이라이트 문자열 입력(자막에 포함돼야 색이 입혀짐을
    헬퍼 텍스트로 안내)
  - 인서트: 이미지 썸네일(해당 article `reel_assets` 슬롯에서 선택/해제),
    insertLabels 리스트(텍스트 언어별·크기·색·pill·삭제·추가)
  - 스티커: 이 청크 overlays 리스트(anim 셀렉트·구간 fromF/durF·삭제)
- **헤더/CTA 아코디언**: header.top/mark(언어별), markBg/markFg 컬러,
  cta(언어별).
- **캔버스 직접 조작**: Player 래퍼 위 투명 에디트 레이어 —
  insertLabels(인서트 표시 중일 때)와 overlays를 **드래그로 이동**, 스티커는
  모서리 핸들로 **스케일**, 인스펙터에서 회전·미세값. 좌표 매핑 =
  `(pointer - rect.left) / rect.width` 분수.
- **스티커 라이브러리 패널**: 검색 + 카테고리 탭 + 그리드 + 드래그앤드롭
  업로드(R2, aiImageService 패턴). 클릭 → 현재 청크 중앙에 overlay 추가.
- **저장**: 700ms debounce → `saveReelScript(articleId, reelScript)` PATCH +
  `onPatch`로 부모 article 즉시 갱신(stale 방지 — CustomReelsPanel 교훈).
- **렌더 요청(언어별 버튼)**: `dirty[lang].tts`면 kind=`full`("음성+립싱크
  재생성, 수십 분" 확인창), 아니면 kind=`render`("수 분"). 활성 잡 있으면
  버튼 비활성+상태 표시.
- **잡 위젯**: 이 article의 최근 잡 목록, 활성 잡은 5초 폴링으로
  status/progress_note 갱신. failed → 에러 + "재시도"(동일 파라미터 재큐).
  done → `reels[lang].videoUrl` 자동 반영(🎬 영상 제작 탭과 동일 데이터).
- **미리보기 제한 모드**: `preview[lang]` 없으면 패널 자리 placeholder +
  무음(자막·헤더·인서트·스티커는 정상 표시). `timing[lang]` 없으면 청크당
  110프레임 균등 가정으로 시킹만 지원. 편집·렌더 요청은 가능(이 경로가
  vi/en/cn/ch 신규 언어 생산 동선).

## 워커 (`remotion/scripts/reel-worker.mjs`)

- **env**: `ai-server/.env` 파싱(SUPABASE_URL·SERVICE_ROLE_KEY·PIN·PORT —
  upload-reel-covers.mjs 패턴 재사용) + `remotion/.env`(ELEVEN_*).
- **모드**: `--once`(큐 비울 때까지 처리 후 종료) / `--watch`(15초 폴링 상주).
  시작 시 stale 회수: status가 claimed~upload인데 10분 이상 미갱신 → queued로
  되돌림(발행 스케줄러의 stale publishing 회수 패턴).
- **잡 처리 순서**:
  1. **claim**: `PATCH …?status=eq.queued&id=eq.{id}` 조건부 업데이트로 원자
     claim(claimed_by=hostname).
  2. **sync**: `reel_script` pull → `src/shorts/{slug}/script.json` 덮어쓰기
     (insert/overlay의 R2 URL은 그대로 둠 — Remotion은 절대 URL 직접 렌더).
  3. **kind=full일 때**: `gen-tts-short.mjs {slug} {lang}` child_process(기존
     스크립트 무수정 재사용 — script.json을 읽으므로 sync 후 실행) →
     `timing-{lang}.json` 생성 → **DB `timing[lang]` 푸시백** →
     `prep-lipsync.mjs {slug} {lang}` → LatentSync 인퍼런스 실행(워커가
     LS 디렉토리에서 커맨드 실행, prep-lipsync가 출력하는 커맨드와 동일) →
     산출 mp4를 `public/videos/{slug}-presenter-lipsync-{lang}.mp4`로 배치.
  4. **render**: `@remotion/bundler`+`@remotion/renderer` 프로그램매틱(번들
     1회 캐시, `PresenterGeneric`, inputProps=DB 스크립트) →
     `out/shorts/{slug}/{slug}-{lang}.mp4`. kind=render인데 로컬 립싱크
     mp4가 없으면 `preview[lang].lipsyncUrl`(R2)로 videoSrc 대체(원격 URL
     렌더 가능 — 새 머신 내성).
  5. **upload**: 최종 mp4 → ai-server `POST /api/r2/upload`(로컬, PIN) →
     `reels[lang].videoUrl` 비파괴 병합 PATCH. kind=full이면 미리보기
     에셋(립싱크 mp4 + 청크 wav들)도 업로드 → `preview[lang]` 갱신.
  6. **done**: `dirty[lang]` 클리어, finished_at 기록.
- **실패 처리**: 어느 단계든 status=failed + error(앞 500자) +
  progress_note에 마지막 단계. LatentSync는 실패가 흔하므로 단계 진입/종료마다
  progress_note 갱신(웹에서 어디서 죽었는지 보이게).
- **전제**: 업로드 단계는 로컬 ai-server 실행 중이어야 함. 미실행이면 upload
  단계에서 명확한 에러("ai-server(localhost:{port}) 미응답")로 failed.

## 시드 — 기존 #2/#3 이관 (`remotion/scripts/push-reel-script.mjs`, 1회성)

- 사용: `node scripts/push-reel-script.mjs <slug> --article <sortOrder>`
  (slug↔article 매핑은 인자로 명시 — 자동 추측 안 함).
- 동작: 로컬 `script.json` + `timing-*.json` → `reel_script` JSONB 변환
  (insert 로컬 경로 `images/{slug}/igN.png` → article `reel_assets`의 R2 URL로
  치환, 슬롯 인덱스 매칭) + 보유 언어(ko/th)의 립싱크 mp4·wav를 R2
  `marketing/reels/preview/{slug}/{lang}/`에 업로드 → `preview` 작성.
- `--check`(무변경 점검) 지원. 재실행 안전(전체 덮어쓰기 — 웹 편집 시작
  전에만 사용한다고 헤더 주석에 명시).

## 엣지 케이스

- **동시 편집**: last-write-wins(소규모 팀, 충돌 감지 없음 — v1 명시 제외).
- **중복 잡**: 웹 insert 전 active 잡 조회로 차단.
- **잡 진행 중 편집**: 허용. 워커는 claim 시점의 reel_script 스냅샷으로
  처리(이후 편집은 다음 잡에 반영) — 위젯에 안내 문구.
- **언어별 비대칭**: 나레이션 텍스트는 있는데 음성 없는 언어(vi/en/cn/ch) →
  제한 모드 + 렌더 요청 시 자동 kind=full(timing 부재 = full 강제).
- **cn/ch 음성**: gen-tts-short가 해당 텍스트로 TTS(기존 동작 그대로 —
  만다린 1음성 전략은 콘텐츠 작성 단계의 결정 사항, 에디터는 관여 안 함).
- **스티커 GIF의 fps 불일치**: `<Gif>`가 타임라인 동기 처리 — 별도 처리 없음.

## Graceful (migration 057 미적용 시)

- `reel_script` select 실패 → 에디터 탭에 "migration 057 적용 필요" 안내(다른
  서브탭 정상). jobs/stickers insert 실패 → 동일 안내. 기존 기능(스토리보드·
  영상 제작 탭) 무영향.

## 테스트

- **순수 함수 분리 + 단위 테스트**: 좌표 변환(픽셀↔분수, 두 좌표계),
  청크 누적 시작 프레임(FROM) 계산, dirty 판정(나레이션 diff), 잡 kind 결정,
  v4 리졸버 매핑, push 스크립트의 insert URL 치환. 워커·스크립트 쪽(.mjs)은
  `node --test`, v4 쪽은 순수 유틸을 `src/features/marketing/utils/reelEditor.ts`
  로 분리해 같은 로직을 node --test 가능한 형태로 유지 + `tsc --noEmit` 0.
- **수동 E2E**(P2 완료 기준): #3 성장판나이 ko에서 자막 한 글자 수정 → 렌더
  요청 → 워커 처리 → 🎬 탭 videoUrl 갱신 확인. (P3 기준): th 나레이션 한 문장
  수정 → full 잡 → TTS/립싱크/렌더 통과 확인.

## 구현 단계

- **P1 토대**: migration 057 + asset 리졸버 리팩터(기존 렌더 회귀 0 확인) +
  `PresenterGeneric` + v4 deps/alias(또는 fallback 사본 결정) + 읽기전용
  에디터(Player+청크 스트립+시킹) + `push-reel-script.mjs`로 #2/#3 시드.
- **P2 오버레이 편집**: 인스펙터(자막/하이라이트/헤더/CTA/인서트/라벨 드래그)
  + 저장 + 렌더 잡(kind=render) + 워커(claim→render→upload→done).
- **P3 풀 파이프라인**: 나레이션 편집 + dirty + 워커 full(TTS→립싱크) +
  timing 푸시백 + 신규 언어 생산 경로.
- **P4 스티커/효과**: `marketing_reel_stickers` + 라이브러리 패널 + overlays
  편집(드래그/스케일/회전) + `OverlayLayer` + anim 프리셋 + GIF.

## 리스크

- **크로스 import 설정**(vite alias + tsc): P1에서 가장 먼저 검증, 막히면
  사본 포팅 fallback(결정 기록 남김).
- **LatentSync 무인 실행 안정성**: GPU 점유·간헐 실패 → 단계별
  progress_note + failed/재시도로 흡수. 워커를 켜둘지는 사용자가 통제(--watch
  창을 닫으면 잡은 큐에 대기).
- **R2 미리보기 용량**: 립싱크 mp4 언어당 ~20-40MB × 콘텐츠 × 6언어 —
  현 운영(영상 100MB 한도) 범위 내. 필요 시 미리보기용 저비트레이트 인코딩은
  v2.
- **prod auth**: 에디터·잡 API는 기존 마케팅 표면과 동일하게 dev(localhost)
  중심 — 신규 회귀 아님(기존 ⚠️ prod auth 항목에 포함).
