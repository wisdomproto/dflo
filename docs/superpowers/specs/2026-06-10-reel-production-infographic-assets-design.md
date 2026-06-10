# 릴스 제작 — 인포그래픽 이미지 관리 + 원장 프레젠터 파이프라인 (설계)

> 2026-06-10. 마케팅 콘텐츠 1~10번의 릴스를 스토리보드 기반으로, **원장 프레젠터(키유전80) 포맷**으로 제작.
> 한글 먼저 → OK → 태국/베트남/영어/中간체/中번체, 콘텐츠 단위 순차.

## 배경 / 현황
- **스토리보드** (`docs/storyboards/specs/{n}.json`): 62콘텐츠 전부 10씬(doctor/ig/cta) × 6언어 카피 + 인포그래픽 AI 프롬프트(NO text) + 언어별 오버레이 라벨 + 모션 노트. = 각 릴스의 기획서.
- **렌더 포맷 = 원장 프레젠터** (`remotion/_shared/PresenterShort.tsx`): MainClip 원장 정면 베이스 재립싱크 + 클론 TTS + **인포그래픽 인서트**(언어공용 이미지 + `insertLabels` 언어별 텍스트 오버레이) + 인트로/CTA 카드. 콘텐츠 #1(키유전80) ko/th 제작 완료가 레퍼런스.
- **인포그래픽 이미지**: 텍스트 없음(NO text) + **언어 공용 1장**. 텍스트는 렌더가 언어별로 얹음. → 사용자가 외부(GPT)에서 생성·업로드.

## 결정 (사용자 승인)
1. **렌더 방식** = 원장 프레젠터 (키유전80 방식).
2. **인포그래픽 이미지 칸 위치** = 릴스 **스토리보드 서브탭**(언어공용끼리 모음, 프롬프트가 이미 거기 있음).
3. **저장** = `marketing_articles.reel_assets` **새 JSONB 컬럼** (migration 050), 언어공용 `{ infographics: { ig1: url, ... } }`.

## Phase 1 — 인포그래픽 이미지 관리 UI (이번 작업)
사용자가 콘텐츠 1~10의 인포그래픽 이미지(콘텐츠당 3~4장)를 미리 생성·업로드 → 렌더의 선행조건 충족.

### 데이터 / 매니페스트
- **migration 050**: `ALTER TABLE marketing_articles ADD COLUMN IF NOT EXISTS reel_assets jsonb NOT NULL DEFAULT '{}'::jsonb;` (txirmof 대시보드 수동 적용). 읽기 graceful(`?? {}`).
- **인포그래픽 매니페스트**: `docs/storyboards/build.mjs`가 `v4/public/storyboards/infographics.json`도 출력 → `{ [n]: [{ ig, scene, title, motion, prompt, emojis, labels }] }`. UI가 콘텐츠별 슬롯 자동 생성.
- **타입**: `ReelAssets { infographics?: Record<string,string> }`(igKey→R2 url) + `MarketingArticle.reelAssets`. 서비스 `fromRow`/`toRow` 매핑 + `saveReelAssets(id, reelAssets)` 부분 저장.
- **업로드**: `aiImageService.uploadInfographicImage(file)` → R2 `marketing/reels/infographics` (원본 PNG 보존, WebP 변환 X — 렌더 화질·투명도).

### UI
- 스토리보드 서브탭을 **좌(스토리보드 iframe 미리보기) / 우(인포그래픽 업로드 리스트)** 2-pane.
- 슬롯 = 매니페스트의 인포그래픽 목록. 각 행: `[이미지 미리보기] · IG#·제목(scene)·모션 · 프롬프트(📋복사) · 얹힐 텍스트(라벨) 참고 · 업로드/교체/삭제`.
- 업로드 → R2 → `reelAssets.infographics[igKey]` 저장(언어공용, 언어 셀렉터와 무관하게 동일 표시).

## Phase 2 — 콘텐츠별 릴스 렌더 파이프라인 (다음, 실제 렌더 시 별도 설계)
1. 스토리보드 spec → `script.json`(narr→나레이션, cap/hl, ig→insert+insertLabels, cta) 자동 도출.
2. TTS 클론(ElevenLabs) 씬별 → `timing.json`.
3. 립싱크(LatentSync, GPU) 원장 정면 베이스 → 언어별 비디오. (사용자 GPU)
4. Remotion PresenterShort 렌더 → mp4 → R2 → `reels[lang].videoUrl`.
5. 콘텐츠당 ko 먼저 풀 파이프라인 → 검토 → th/vi/en/cn/ch.
- `insertLabels` x/y는 **업로드된 실제 이미지**를 보고 확정(이미지가 선행).

## 비범위 (YAGNI)
- 자동 립싱크/자동 TTS 오케스트레이션(수동 GPU 단계 유지).
- 인포그래픽 AI 자동생성(Gemini 키 무효 → 외부 GPT 수동).

## 진행 상황 (2026-06-11 업데이트)
- **Phase 1 (인포그래픽 UI) ✅**: `InfographicAssetsPanel`(드래그앤드롭+클릭후 Ctrl+V, 파일선택 제거, 프롬프트 개별/전체 복사+1:1 사이즈 자동첨부), migration 050 `reel_assets`, `build.mjs`→`infographics.json`, `uploadInfographicImage`(원본 PNG), `saveReelAssets`. ReelsPanel 2-pane.
- **Phase 2 (제작 파이프라인) ✅ 스크립트화**: `storyboard-to-reel.mjs`(spec→script.json+이미지DL) / `gen-tts-short.mjs`(+앞뒤 무음 트림) / `make-presenter-base.mjs`(clean.mp4 정면 설명구간만→`presenter-base.mp4` 재사용) / `prep-lipsync.mjs`(베이스 랜덤 cut, slug 시드+고정 MAX_NEED span) / LatentSync 재립싱크 / PresenterShort 렌더.
- **설계 외 추가(사용자 피드백)**:
  - **원장 베이스 = "카메라 응시 설명" 구간만** (진료·환자·X-ray·일러스트·전환 제외). 장면컷 검출+2초 시트로 클린 단일샷 4구간(=54.5s), crop 480.
  - **컷은 콘텐츠별로만 다름**(언어별 동일) — `prep-lipsync` 시드=slug, span=고정 MAX_NEED(언어 need로 잡으면 컷 갈림).
  - **한글 나레이션 격식체 "~습니다"**(의사 신뢰 톤). 자막은 키워드라 유지. #4~ 생성 시 적용.
  - **ReelsPanel 영상·커버 드래그앤드롭**.
  - **업로드 stale 버그 fix**: 패널 저장 시 `onPatch`로 부모 `articles` in-place 갱신(페이지 이동 후에도 유지).
  - **TTS 무음 트림**: ElevenLabs 선행 무음 → 음성 갭 → `silenceremove` 앞뒤 트림.
- **제작 완료**: #2 성장타이밍4 (ko/th) · #3 성장판나이 (ko/th). ⏳ #2/#3 vi/en/cn/ch · #4~10.
- 상세 진행/교훈: memory `reel_production_pipeline.md`.
