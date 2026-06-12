# 릴스 라이트 에디터 구현 플랜

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PresenterShort 릴스를 `/marketing/content`에서 실시간 미리보기로 편집(자막·헤더/CTA·인서트·스티커·나레이션)하고, 로컬 워커가 TTS→립싱크→렌더→R2 업로드까지 자동 처리하는 내부 에디터.

**Architecture:** DB 컬럼 소유권 분리(`reel_script`=웹 / `reel_runtime`=워커) + 잡 큐(`marketing_reel_jobs`) + 로컬 폴링 워커. 컴포지션은 remotion/v4가 같은 소스를 공유(@remotion/player + vite dedupe), 렌더는 전원격 URL 입력으로 bundle 1회 캐시.

**Tech Stack:** Remotion 4.0.447(exact pin), @remotion/player·bundler·renderer·gif, React 19.2, Vite 7, Supabase(PostgREST), ElevenLabs TTS, LatentSync(로컬 GPU), Cloudflare R2(ai-server `/api/r2/upload`).

**Spec:** `docs/superpowers/specs/2026-06-12-reels-lite-editor-design.md` — 구현 중 모호하면 스펙이 우선.

**전제 (사용자 수동 단계):**
- migration 057은 txirmof Supabase Dashboard에서 수동 적용(기존 패턴). 적용 전에도 모든 코드는 graceful(에디터 탭 안내문) — 단 **Task 8 시드 실행 전에는 필수**.
- 시드/워커 실행 시 로컬 ai-server(R2 업로드)가 떠 있어야 함.

## 파일 구조 (전체 조망)

```
v4/scripts/migrations/057_reels_editor.sql          # 신규 — DDL 전체
remotion/src/lib/assets.ts                          # 신규 — asset()/setAssetResolver
remotion/src/lib/fonts.ts                           # 수정 — Player에서 delayRender 생략 + 미사용 import 제거
remotion/src/shorts/_shared/PresenterShort.tsx      # 수정 — asset()/assets prop/영상 미생성 placeholder (+P4 StickerLayer)
remotion/src/shorts/_shared/ShortLogo.tsx           # 수정 — staticFile→asset
remotion/src/shorts/_shared/PresenterGeneric.tsx    # 신규 — 제네릭 컴포지션 + calculateMetadata
remotion/src/Root.tsx                               # 수정 — PresenterGeneric 등록
remotion/package.json                               # 수정 — exact pin + renderer/gif 명시
remotion/scripts/lib/reelWorkerLib.mjs              # 신규 — 순수 함수(테스트 대상)
remotion/scripts/lib/reelWorkerLib.test.mjs         # 신규 — node --test
remotion/scripts/lib/reelDb.mjs                     # 신규 — PostgREST/R2/heartbeat IO
remotion/scripts/reel-worker.mjs                    # 신규 — 잡 워커(--once/--watch)
remotion/scripts/push-reel-script.mjs               # 신규 — 온보딩/시드(preflight)
v4/vite.config.ts                                   # 수정 — alias/dedupe/fs.allow/optimizeDeps
v4/tsconfig.app.json                                # 수정 — @reel paths + include
v4/package.json                                     # 수정 — remotion/@remotion/player/@remotion/gif (exact)
v4/public/audio/bg1.mp3                             # 신규 — remotion/public/audio/bg1.mp3 사본
v4/src/features/marketing/types.ts                  # 수정 — Reel* 타입 + MarketingArticle 확장
v4/src/features/marketing/services/marketingArticleService.ts  # 수정 — 매핑 + saveReelScript + saveReelsLang
v4/src/features/marketing/services/reelJobService.ts # 신규 — 잡/워커상태 CRUD
v4/src/features/marketing/services/reelStickerService.ts # 신규(P4) — 스티커 라이브러리 CRUD
v4/src/features/marketing/utils/reelEditor.ts       # 신규 — 좌표/타이밍/kind 순수 유틸
v4/src/features/marketing/components/content/ReelsPanel.tsx   # 수정 — 3번째 서브탭 + lazy
v4/src/features/marketing/components/content/reelEditor/
  ReelEditorPanel.tsx                               # 신규 — 오케스트레이터
  PresenterBridge.tsx                               # 신규 — Player 래퍼 + 리졸버 설정
  ChunkStrip.tsx                                    # 신규 — 하단 청크 스트립
  ChunkInspector.tsx                                # 신규(P2) — 자막/인서트/라벨 (P3 나레이션 추가)
  HeaderCtaForm.tsx                                 # 신규(P2) — 헤더/CTA 아코디언
  CanvasDragLayer.tsx                               # 신규(P2) — 라벨 드래그 (P4 스티커 확장)
  RenderJobWidget.tsx                               # 신규(P2) — 렌더 요청 + 잡 폴링 + 오프라인 배너
  StickerLibraryPanel.tsx                           # 신규(P4) — 라이브러리 그리드/업로드
  useUndoableDoc.ts                                 # 신규(P2) — 세션 undo/redo 훅
```

각 파일 단일 책임. ReelEditorPanel이 200줄을 넘으면 상태 로직을 `useReelEditorState.ts` 훅으로 분리(컨벤션 max ~200줄).

---

## Chunk 1: P1 토대 (migration + 컴포지션 공유 + 읽기전용 에디터 + 시드)

### Task 1: migration 057

**Files:**
- Create: `v4/scripts/migrations/057_reels_editor.sql`

- [ ] **Step 1: SQL 파일 작성**

```sql
-- 057_reels_editor.sql — 릴스 라이트 에디터
-- 스펙: docs/superpowers/specs/2026-06-12-reels-lite-editor-design.md
-- 소유권: reel_script = 웹 전용 기록 / reel_runtime = 워커 전용 기록 (동시 기록 race 차단)

alter table public.marketing_articles
  add column if not exists reel_script jsonb,
  add column if not exists reel_runtime jsonb;

-- 잡 큐
create table if not exists public.marketing_reel_jobs (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.marketing_articles(id) on delete cascade,
  slug text not null,
  lang text not null check (lang in ('ko','th','vi','en','cn','ch')),
  kind text not null check (kind in ('render','full')),
  status text not null default 'queued'
    check (status in ('queued','claimed','tts','lipsync','upload_preview','render','upload','done','failed')),
  progress_note text,
  error text,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now(),  -- 워커 heartbeat: stale 회수 판정 기준
  claimed_by text
);
create index if not exists idx_reel_jobs_status on public.marketing_reel_jobs(status);
create index if not exists idx_reel_jobs_article on public.marketing_reel_jobs(article_id, requested_at desc);

-- 워커 생존 신호 싱글톤 (웹 "워커 꺼짐" 배너용)
create table if not exists public.marketing_reel_worker (
  id int primary key check (id = 1),
  hostname text,
  last_seen timestamptz
);

-- 스티커 라이브러리 (P4) — 효과(pop/float/pulse/shake)는 코드 프리셋이라 테이블 없음
create table if not exists public.marketing_reel_stickers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('sticker','emoji')),
  url text not null,
  kind text not null check (kind in ('image','gif')),
  meta jsonb,
  created_at timestamptz not null default now()
);

-- RLS: 기존 마케팅 테이블 패턴(anon 전면 허용 — dev 운영). create policy 는 if not exists 미지원 → drop 선행(재실행 안전)
alter table public.marketing_reel_jobs enable row level security;
alter table public.marketing_reel_worker enable row level security;
alter table public.marketing_reel_stickers enable row level security;
drop policy if exists "reel_jobs_all" on public.marketing_reel_jobs;
drop policy if exists "reel_worker_all" on public.marketing_reel_worker;
drop policy if exists "reel_stickers_all" on public.marketing_reel_stickers;
create policy "reel_jobs_all" on public.marketing_reel_jobs for all using (true) with check (true);
create policy "reel_worker_all" on public.marketing_reel_worker for all using (true) with check (true);
create policy "reel_stickers_all" on public.marketing_reel_stickers for all using (true) with check (true);
```

- [ ] **Step 2: v4/scripts/migrations/README.md(있으면)와 v4/CLAUDE.md의 migration 목록에 057 한 줄 추가** — "릴스 라이트 에디터: reel_script/reel_runtime + 잡 큐 + 워커 heartbeat + 스티커 (수동 적용 필요)"

- [ ] **Step 3: Commit**

```bash
git add v4/scripts/migrations/057_reels_editor.sql v4/CLAUDE.md
git commit -m "feat(reel-editor): migration 057 - reel_script/runtime columns, job queue, worker heartbeat, stickers"
```

### Task 2: remotion 에셋 리졸버 리팩터 (회귀 0 확인 포함)

**Files:**
- Create: `remotion/src/lib/assets.ts`
- Modify: `remotion/src/lib/fonts.ts`, `remotion/src/shorts/_shared/PresenterShort.tsx`, `remotion/src/shorts/_shared/ShortLogo.tsx`

- [ ] **Step 1: 리팩터 전 기준(baseline) still 캡처** — 회귀 비교용

```bash
cd remotion && npx remotion still src/index.ts plateage-ko out/_work/regress-before.png --frame=300
```
Expected: PNG 생성. **ID는 Root.tsx 등록 ID(`plateage-ko`, 소문자-하이픈)** — 컴포넌트명 `PlateAgeKO` 아님. frame 300 = timing-ko 기준 **c3 인서트 구간(255~377)** — 인서트+라벨+자막이 모두 보여 InsertPanel 리팩터 회귀를 잡을 수 있는 프레임.

- [ ] **Step 2: `src/lib/assets.ts` 작성**

```ts
// 에셋 리졸버 — 렌더(remotion)는 staticFile 기본값, v4 Player는 setAssetResolver로 교체.
// http(s) URL은 passthrough. 로컬 경로 해석이 실제로 필요한 건 고정 에셋(로고·BGM)뿐.
import { staticFile } from "remotion";

let resolver: (p: string) => string = staticFile;

export const asset = (p: string): string =>
  p.startsWith("http://") || p.startsWith("https://") ? p : resolver(p);

export const setAssetResolver = (fn: (p: string) => string): void => {
  resolver = fn;
};
```

- [ ] **Step 3: `fonts.ts` 수정** — ① 미사용 `staticFile` import 제거(v4 strict TS6133 선제 해소) ② Player 환경에선 delayRender 생략(Google Fonts 지연 시 Player 에러 오버레이 방지)

```ts
import { continueRender, delayRender, getRemotionEnvironment } from "remotion";
// ...
export function ensureFonts() {
  if (loaded) return;
  loaded = true;
  const isPlayer = getRemotionEnvironment().isPlayer;
  const handle = isPlayer ? null : delayRender("Loading fonts");
  // (기존 <link> 주입 코드는 그대로 — 무조건 실행)
  // 기존 continueRender(handle) 호출부를 전부 `if (handle !== null) continueRender(handle);` 로 감싼다.
}
```
파일 하단의 폰트 로드 대기/continueRender 로직을 읽고 handle null 가드를 일관 적용할 것.
추가로 **`ensureFonts()` 호출을 PresenterShort 모듈 top-level(11행)에서 컴포넌트 본문 첫 줄로 이동**(idempotent — `loaded` 가드 있음). top-level 호출은 v4 import 시점에 실행돼 `getRemotionEnvironment()` 판정 타이밍이 불안정해지는 것을 방지.

- [ ] **Step 4: `ShortLogo.tsx` 수정** — `staticFile("images/logo_en_wh.png")` → `asset("images/logo_en_wh.png")` (import 교체 포함).

- [ ] **Step 5: `PresenterShort.tsx` 수정** — 변경점 5곳, 그 외 로직 불변:

```tsx
// (a) import: staticFile 제거, asset 추가
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { asset } from "../../lib/assets";

// (b) 시그니처에 assets prop 추가 (옵셔널 — per-slug index.tsx 하위호환)
export const PresenterShort: React.FC<{
  script: Script; timing: Timing[]; lang: string; slug: string; videoSrc: string;
  assets?: { videoSrc: string; audio: Record<string, string> };
}> = ({ script, timing, lang, slug, videoSrc, assets }) => {
  // ...
  const vsrc = assets?.videoSrc ?? videoSrc;

// (c) 원장 패널: 영상 미생성(제한 모드) placeholder
      <div style={{ position: "absolute", left: 0, top: PANEL_TOP, width: 1080, height: PANEL_H, borderRadius: PANEL_R, overflow: "hidden", background: "#000" }}>
        {vsrc ? (
          <OffthreadVideo src={asset(vsrc)} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontFamily: NOTO_SANS_KR, fontSize: 38, background: "#15161a" }}>
            영상 미생성 — 렌더 요청 시 자동 생성
          </AbsoluteFill>
        )}
      </div>

// (d) InsertPanel: <Img src={staticFile(src)} → <Img src={asset(src)}
//     IntroCard/CTACard: <Img src={staticFile(logoSrc)} → <Img src={asset(logoSrc)}

// (e) 오디오: BGM은 asset(), 청크 오디오는 assets 있으면 명시 URL(없는 id는 스킵 — 404 <Audio> 방지)
      <Audio src={asset("audio/bg1.mp3")} volume={...기존 그대로...} />
      {chunks.map((c, i) => {
        const aSrc = assets ? assets.audio[c.id] : asset(`audio/shorts/${slug}/${lang}/${c.id}.wav`);
        return aSrc ? (
          <Sequence key={"a" + c.id} from={FROM[i]}>
            <Audio src={aSrc} />
          </Sequence>
        ) : null;
      })}
```

- [ ] **Step 6: 회귀 확인 — 동일 프레임 still 재렌더 + 비교**

```bash
cd remotion && npx tsc --noEmit
cd remotion && npx remotion still src/index.ts plateage-ko out/_work/regress-after.png --frame=300
```
Expected: tsc 0 에러. before/after PNG를 Read 도구로 열어 시각 동일 확인(인서트·라벨·자막·로고 모두 표시).

- [ ] **Step 7: Commit**

```bash
git add remotion/src/lib/assets.ts remotion/src/lib/fonts.ts remotion/src/shorts/_shared/PresenterShort.tsx remotion/src/shorts/_shared/ShortLogo.tsx
git commit -m "refactor(remotion): asset resolver + assets prop on PresenterShort (player-shareable, regression-checked)"
```

### Task 3: PresenterGeneric + Root 등록 + 버전 핀

**Files:**
- Create: `remotion/src/shorts/_shared/PresenterGeneric.tsx`
- Modify: `remotion/src/Root.tsx`, `remotion/package.json`

- [ ] **Step 1: `PresenterGeneric.tsx` 작성**

```tsx
// 워커 렌더 + v4 Player 공용 제네릭 진입점 — inputProps로 script/timing/assets 주입.
// calculateMetadata는 renderMedia(selectComposition) 경로 전용 — Player는 duration을 직접 prop으로 받는다.
import type { CalculateMetadataFunction } from "remotion";
import { PresenterShort, presenterDuration } from "./PresenterShort";

export type PresenterGenericProps = {
  script: never;          // PresenterShort 의 Script (파일 내 로컬 타입 — never 캐스팅 패턴은 per-slug index.tsx 와 동일)
  timing: { id: string; durFrames: number; origStartF: number; rate: number }[];
  lang: string;
  slug: string;
  assets: { videoSrc: string; audio: Record<string, string> };
};

export const PresenterGeneric: React.FC<PresenterGenericProps> = (p) => (
  <PresenterShort script={p.script} timing={p.timing} lang={p.lang} slug={p.slug} videoSrc={p.assets.videoSrc} assets={p.assets} />
);

export const calcPresenterMetadata: CalculateMetadataFunction<PresenterGenericProps> = ({ props }) => ({
  durationInFrames: Math.max(1, presenterDuration(props.timing)),
  fps: 30,
  width: 1080,
  height: 1920,
});
```
주의: `script: never` 가 v4 strict에서 안 통하면 `Record<string, unknown>` 로 두고 PresenterShort 호출부에서 `as never` 캐스팅(기존 index.tsx 관행).

- [ ] **Step 2: Root.tsx 등록** — import 추가 + Composition 1개(다른 컴포지션 사이 아무 곳):

```tsx
import { PresenterGeneric, calcPresenterMetadata } from "./shorts/_shared/PresenterGeneric";
// ...
      <Composition
        id="PresenterGeneric"
        component={PresenterGeneric}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ script: {} as never, timing: [], lang: "ko", slug: "", assets: { videoSrc: "", audio: {} } }}
        calculateMetadata={calcPresenterMetadata}
      />
```

- [ ] **Step 3: remotion/package.json 버전 핀** — 모든 `remotion`/`@remotion/*` 의존성의 `^4.0.447` → `4.0.447`(caret 제거), `"@remotion/renderer": "4.0.447"`(전이 의존 → 명시)과 `"@remotion/gif": "4.0.447"` 추가 후:

```bash
cd remotion && npm install
```
Expected: lockfile 갱신, `npm ls remotion @remotion/renderer @remotion/gif` 전부 4.0.447.

- [ ] **Step 4: 등록 검증**

```bash
cd remotion && npx tsc --noEmit && npx remotion compositions src/index.ts | grep PresenterGeneric
```
Expected: tsc 0, 목록에 `PresenterGeneric` 출현.

- [ ] **Step 5: Commit**

```bash
git add remotion/src/shorts/_shared/PresenterGeneric.tsx remotion/src/Root.tsx remotion/package.json remotion/package-lock.json
git commit -m "feat(remotion): PresenterGeneric composition + exact version pins (renderer/gif explicit)"
```

### Task 4: v4 빌드 통합 (deps + vite dedupe + tsconfig + 고정 에셋)

**Files:**
- Modify: `v4/package.json`, `v4/vite.config.ts`, `v4/tsconfig.app.json`
- Create: `v4/public/audio/bg1.mp3` (사본)

- [ ] **Step 1: deps 설치 (exact)**

```bash
cd v4 && npm install --save-exact remotion@4.0.447 @remotion/player@4.0.447 @remotion/gif@4.0.447
```

- [ ] **Step 2: vite.config.ts 교체** — 기존 내용 유지 + 추가:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@reel': path.resolve(__dirname, '../remotion/src'), // 컴포지션 단일 소스 공유
    },
    // 크로스 import 1순위 실패 모드 방지: ../remotion/src 소스의 import "remotion"/"react"가
    // remotion/node_modules로 해석돼 이중 인스턴스가 되면 Invalid hook call / 프레임 0 고정.
    dedupe: ['react', 'react-dom', 'remotion', '@remotion/gif'],
  },
  optimizeDeps: {
    include: ['remotion', '@remotion/player'],
  },
  server: {
    host: true,
    fs: { allow: [path.resolve(__dirname, '..')] }, // ../remotion/src 서빙 허용
  },
  preview: {
    host: true,
    allowedHosts: ['dflo-production.up.railway.app', 'www.dr187growup.com', 'dr187growup.com'],
  },
});
```

- [ ] **Step 3: tsconfig.app.json** — paths + include 추가:

```jsonc
    "paths": {
      "@/*": ["./src/*"],
      "@reel/*": ["../remotion/src/*"]
    }
  },
  "include": ["src", "../remotion/src/lib", "../remotion/src/shorts/_shared"]
```
include는 공유 표면(lib + _shared)만 — remotion 전체(src/mainclip 등)를 v4 tsc로 끌고 오지 않는다.

- [ ] **Step 4: 고정 에셋 사본**

```powershell
New-Item -ItemType Directory -Force v4/public/audio
Copy-Item remotion/public/audio/bg1.mp3 v4/public/audio/bg1.mp3
```
(`v4/public/audio/` 디렉토리는 현재 없음 — 생성 선행.)
(`v4/public/images/logo_en_wh.png`는 이미 존재 — 확인만.)

- [ ] **Step 5: tsc 크로스 검사 통과** — `cd v4 && npx tsc --noEmit`. 공유 소스에서 나는 에러(미사용 import·implicit any 등)는 **remotion 소스를 고쳐** 해소(같은 repo). TS6 전용 문법 사용 금지. `cd remotion && npx tsc --noEmit`도 함께 0 확인.
Expected: 양쪽 0 에러. **이 단계가 막혀 Player 런타임까지 깨지면(사소한 타입 에러는 사유 아님) 스펙의 fallback(사본 포팅) 결정을 사용자에게 보고.**

- [ ] **Step 6: Commit**

```bash
git add v4/package.json v4/package-lock.json v4/vite.config.ts v4/tsconfig.app.json v4/public/audio/bg1.mp3
git commit -m "feat(v4): remotion player deps + cross-import wiring (dedupe, @reel alias, fs.allow)"
```

### Task 5: v4 타입 + 서비스 (reel_script/runtime 매핑 + saveReelScript)

**Files:**
- Modify: `v4/src/features/marketing/types.ts`, `v4/src/features/marketing/services/marketingArticleService.ts`

- [ ] **Step 1: types.ts에 추가** (기존 `ReelAssets` 섹션 아래):

```ts
// ── 릴스 라이트 에디터 (migration 057) ───────────────────────────────────────
export type ReelLang = 'ko' | 'th' | 'vi' | 'en' | 'cn' | 'ch';

export type ReelStickerAnim = 'none' | 'pop' | 'float' | 'pulse' | 'shake';
export interface ReelStickerItem {
  id: string;
  src: string;                 // R2 절대 URL
  kind: 'image' | 'gif';
  x: number; y: number; w: number; rot: number;  // 1080×1920 전체 캔버스 분수(중심 기준), w=가로폭 분수
  fromFrac: number;            // 청크 길이 대비 시작 비율 0~1
  durFrac: number | null;      // null = 청크 끝까지
  anim: ReelStickerAnim;
  loop?: boolean;
}
export type ReelInsertLabel = {
  x: number; y: number;        // 인서트 패널 존 내 분수 (캔버스 분수와 다른 좌표계!)
  size?: number; weight?: number; color?: string; pill?: string;
} & Partial<Record<ReelLang, string>>;
// 청크: 언어 필드(ko, cap_ko, hl_ko, …)가 동적 키라 Record 합성. start/end 등 기존 필드 라운드트립 보존.
export type ReelChunk = {
  id: string;
  insert?: string;             // R2 절대 URL (시드 시 치환)
  insertLabels?: ReelInsertLabel[];
  stickers?: ReelStickerItem[];
} & Record<string, unknown>;
export interface ReelScriptDoc {
  slug: string;
  script: {
    header: Record<string, { top: string; mark: string }>;
    headerStyle?: { markBg?: string; markFg?: string };
    cta?: Record<string, string>;
    chunks: ReelChunk[];
  } & Record<string, unknown>; // title/_note/fps 등 미편집 필드 보존
}
export interface ReelTimingEntry { id: string; durFrames: number; origStartF: number; rate: number; natSec?: number }
export interface ReelRuntimeDoc {
  timing?: Partial<Record<ReelLang, ReelTimingEntry[]>>;
  preview?: Partial<Record<ReelLang, { lipsyncUrl: string; audio: Record<string, string> }>>;
  tts_text?: Partial<Record<ReelLang, Record<string, string>>>;
}
export type ReelJobStatus = 'queued' | 'claimed' | 'tts' | 'lipsync' | 'upload_preview' | 'render' | 'upload' | 'done' | 'failed';
export interface ReelJob {
  id: string; articleId: string; slug: string; lang: ReelLang;
  kind: 'render' | 'full'; status: ReelJobStatus;
  progressNote: string | null; error: string | null;
  requestedAt: string; startedAt: string | null; finishedAt: string | null; updatedAt: string;
}
export interface ReelStickerAsset {
  id: string; name: string; category: 'sticker' | 'emoji';
  url: string; kind: 'image' | 'gif'; createdAt: string;
}
```
`MarketingArticle` 인터페이스(line ~72)에 두 필드 추가:
```ts
  reelScript: ReelScriptDoc | null;   // 릴 에디터 script (migration 057) — 웹 전용 기록
  reelRuntime: ReelRuntimeDoc | null; // timing/preview/tts_text — 워커 전용 기록(웹은 읽기만)
```

- [ ] **Step 2: marketingArticleService.ts** — ① 행 매핑(line ~29 reelAssets 옆)에 추가:
```ts
    reelScript: (r.reel_script as ReelScriptDoc) ?? null,
    reelRuntime: (r.reel_runtime as ReelRuntimeDoc) ?? null,
```
② fetch 쿼리가 컬럼 명시 select라면 `reel_script, reel_runtime` 추가, `select('*')`라면 매핑만으로 충분(미적용 DB에선 undefined → null). ③ 일반 저장 함수의 제외 주석(line ~53 스타일)에 reel_script/reel_runtime 추가 ④ 전용 저장 함수 추가(saveReelAssets 패턴, line ~215 옆):

```ts
/** reel_script만 부분 업데이트 — 웹 전용 기록 컬럼. reel_runtime(워커 전용)은 절대 건드리지 않는다. */
export async function saveReelScript(id: string, reelScript: ReelScriptDoc): Promise<void> {
  const { error } = await supabase
    .from('marketing_articles')
    .update({ reel_script: reelScript, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`릴 스크립트 저장 실패: ${error.message}`);
}
```

- [ ] **Step 3: 검증 + Commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/marketing/types.ts v4/src/features/marketing/services/marketingArticleService.ts
git commit -m "feat(v4): reel editor types + reel_script mapping/save (column-ownership split)"
```

### Task 6: 순수 유틸 `utils/reelEditor.ts`

**Files:**
- Create: `v4/src/features/marketing/utils/reelEditor.ts`

순수 함수만(React/IO 없음). v4에 FE 테스트 러너가 없으므로(컨벤션) tsc + Task 8 수동 검증으로 커버 — 각 함수 ≤10줄로 단순 유지. 워커 측 순수 로직은 Chunk 2에서 node --test로 TDD.

- [ ] **Step 1: 작성**

```ts
// 릴 에디터 순수 유틸 — 좌표 2종 변환·타이밍 계산·렌더 kind 판정. React/IO 금지.
import type { ReelChunk, ReelLang, ReelRuntimeDoc, ReelTimingEntry } from '../types';

export const FALLBACK_CHUNK_FRAMES = 110; // timing 미생성 언어의 청크당 가정 길이
export const PANEL_TOP_FRAC = 300 / 1920; // PresenterShort PANEL_TOP/H 와 동기 (변경 시 양쪽 수정)
export const PANEL_H_FRAC = 1080 / 1920;
// 잡 active 상태 명시 나열 (스펙: 열거형 순서 의존 금지)
export const REEL_JOB_ACTIVE = ['queued', 'claimed', 'tts', 'lipsync', 'upload_preview', 'render', 'upload'] as const;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** 청크별 프레임 길이 — timing 있으면 id 매칭, 없으면 110f 균등(제한 모드). */
export function chunkDurations(timing: ReelTimingEntry[] | undefined, chunks: ReelChunk[]): number[] {
  return chunks.map((c) => timing?.find((t) => t.id === c.id)?.durFrames ?? FALLBACK_CHUNK_FRAMES);
}
/** 청크 누적 시작 프레임. */
export function chunkStarts(durs: number[]): number[] {
  const out: number[] = [];
  durs.reduce((acc, d, i) => ((out[i] = acc), acc + d), 0);
  return out;
}
export const totalFrames = (durs: number[]): number => durs.reduce((a, b) => a + b, 0);

export interface RectLike { left: number; top: number; width: number; height: number }
/** 포인터 px → 전체 캔버스 분수 (스티커 좌표계). 래퍼는 aspect-ratio 9/16 고정 전제. */
export function pxToCanvasFrac(px: number, py: number, rect: RectLike): { x: number; y: number } {
  return { x: clamp01((px - rect.left) / rect.width), y: clamp01((py - rect.top) / rect.height) };
}
/** 포인터 px → 인서트 패널 존 분수 (insertLabels 좌표계 — y만 존 환산). */
export function pxToPanelFrac(px: number, py: number, rect: RectLike): { x: number; y: number } {
  const x = clamp01((px - rect.left) / rect.width);
  const y = clamp01((py - rect.top - rect.height * PANEL_TOP_FRAC) / (rect.height * PANEL_H_FRAC));
  return { x, y };
}
// 주의: stickerFrames(비율→프레임 클램프)는 여기 두지 않는다 — 단일 소스는 P4 의
// `@reel/shorts/_shared/StickerLayer`(remotion) export. v4 에서 필요하면 그것을 import(드리프트 차단).
/** 렌더 kind 판정 — 나레이션 vs 마지막 TTS 텍스트 비교. full 강제: timing/lipsync 부재 또는 forceFull. */
export function decideKind(args: {
  chunks: ReelChunk[]; lang: ReelLang; runtime: ReelRuntimeDoc | null; forceFull: boolean;
}): 'render' | 'full' {
  const { chunks, lang, runtime, forceFull } = args;
  const tts = runtime?.tts_text?.[lang];
  const hasTiming = (runtime?.timing?.[lang]?.length ?? 0) > 0;
  const hasLipsync = !!runtime?.preview?.[lang]?.lipsyncUrl;
  if (forceFull || !hasTiming || !hasLipsync || !tts) return 'full';
  for (const c of chunks) {
    const cur = c[lang];
    if (typeof cur === 'string' && cur !== (tts[c.id] ?? '')) return 'full';
  }
  return 'render';
}
/** 청크의 나레이션이 마지막 TTS와 다른가 (🎙 배지용). */
export function chunkTtsDirty(c: ReelChunk, lang: ReelLang, runtime: ReelRuntimeDoc | null): boolean {
  const cur = c[lang];
  if (typeof cur !== 'string') return false;
  const tts = runtime?.tts_text?.[lang];
  return !!tts && cur !== (tts[c.id] ?? '');
}
/** 불변 청크 패치. */
export function updateChunk(chunks: ReelChunk[], idx: number, patch: Partial<ReelChunk>): ReelChunk[] {
  return chunks.map((c, i) => (i === idx ? { ...c, ...patch } : c));
}
```

- [ ] **Step 2: 검증 + Commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/marketing/utils/reelEditor.ts
git commit -m "feat(v4): reel editor pure utils (coords x2, timing, kind decision)"
```

### Task 7: 읽기전용 에디터 (서브탭 + Player + 청크 스트립)

**Files:**
- Modify: `v4/src/features/marketing/components/content/ReelsPanel.tsx`
- Create: `v4/src/features/marketing/components/content/reelEditor/PresenterBridge.tsx`
- Create: `v4/src/features/marketing/components/content/reelEditor/ChunkStrip.tsx`
- Create: `v4/src/features/marketing/components/content/reelEditor/ReelEditorPanel.tsx`

- [ ] **Step 1: ReelsPanel 서브탭 추가** — `type Sub = 'storyboard' | 'video' | 'editor';`, SUBS에 `{ key: 'editor', label: '✂️ 에디터' }`, 본문에 분기 추가(React.lazy — remotion deps를 별도 청크로):

```tsx
import { lazy, Suspense } from 'react';
const ReelEditorPanel = lazy(() => import('./reelEditor/ReelEditorPanel'));
// ... 렌더부
{sub === 'editor' && (
  <Suspense fallback={<div className="p-10 text-center text-sm text-gray-400">에디터 로딩…</div>}>
    <ReelEditorPanel article={article} language={language} onPatch={onPatch} />
  </Suspense>
)}
```
ReelEditorPanel은 `export default` (lazy 요건 — 페이지/공용 default 컨벤션과 일치).

- [ ] **Step 2: `PresenterBridge.tsx`** — 리졸버 설정 + Player 래핑(모듈 1책임: "공유 컴포지션을 v4에서 재생 가능하게"):

```tsx
// @reel(remotion/src) 컴포지션을 v4에서 재생하는 브리지.
// 모듈 로드 시 1회 리졸버 교체 — 고정 에셋(로고·BGM)을 v4 public 에서 서빙.
import { forwardRef } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { PresenterShort } from '@reel/shorts/_shared/PresenterShort';
import { setAssetResolver } from '@reel/lib/assets';
import type { ReelScriptDoc, ReelTimingEntry } from '../../../types';

setAssetResolver((p) => '/' + p);

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
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
});
export default PresenterBridge;
```
`PresenterShort`의 timing 타입(파일 내 로컬 `Timing`)과 `ReelTimingEntry`가 구조적으로 동일하므로 그대로 전달(불일치 시 `as never` 캐스팅 — index.tsx 관행).

- [ ] **Step 3: `ChunkStrip.tsx`** — props `{ items: { id: string; durFrames: number; dirty: boolean }[]; selected: number; onSelect: (i: number) => void }`. flex row, 각 칸 `style={{ width: \`${dur / total * 100}%\` }}`, 선택 칸 보라 테두리, dirty 칸에 🎙 배지, 클릭 → onSelect. 30줄 내외.

- [ ] **Step 4: `ReelEditorPanel.tsx`(P1 범위 = 읽기전용)**:

```tsx
// 릴 라이트 에디터 오케스트레이터. P1: Player + 청크 스트립 + 시킹 (편집은 P2~).
// 데이터: article.reelScript(웹 소유) / article.reelRuntime(워커 소유, 읽기만).
```
구현 요점:
- **컴포넌트 2분할(훅 순서 안전)**: default export `ReelEditorPanel` 은 `article.reelScript == null` 이면 빈 상태 카드만 렌더("이 콘텐츠는 에디터 미지원 — 스토리보드 파이프라인 생산분만. 온보딩: `push-reel-script.mjs`. migration 057 미적용 시에도 이 화면"), 있으면 `<EditorInner article={…} doc0={article.reelScript} …/>` 렌더. **모든 훅은 EditorInner 안에서만** — null↔non-null 전환 시 훅 개수 불일치 원천 차단.
- state: `doc = doc0`(P1은 setState 없이 직접 사용), `selected` 청크 인덱스, `playerRef = useRef<PlayerRef>(null)`.
- 파생: `const timing = article.reelRuntime?.timing?.[language as ReelLang]; const durs = chunkDurations(timing, doc.script.chunks); const starts = chunkStarts(durs); const total = totalFrames(durs);`
- **Player 용 합성 timing 폴백(제한 모드 크래시 방지 — PresenterShort 는 `chunks[ctaIdx].durFrames` 를 즉시 접근하므로 빈 timing 배열이면 TypeError)**:
  ```ts
  const timingForPlayer = timing && timing.length
    ? timing
    : doc.script.chunks.map((c) => ({ id: c.id, durFrames: FALLBACK_CHUNK_FRAMES, origStartF: 0, rate: 1 }));
  ```
  PresenterBridge 에는 항상 `timingForPlayer` 를 전달(스트립 폭 계산의 `chunkDurations` 와 일관).
- `const preview = article.reelRuntime?.preview?.[language as ReelLang]; const assets = { videoSrc: preview?.lipsyncUrl ?? '', audio: preview?.audio ?? {} };`
- 제한 모드 배너: `!preview && <div>…이 언어는 음성/영상 미생성 — 미리보기 제한 모드…</div>`, `!timing` 이면 "타이밍은 110프레임 균등 가정" 추가 문구.
- 레이아웃: `grid grid-cols-[minmax(280px,420px)_1fr] gap-4` — 좌 PresenterBridge, 우 안내 패널(P2에서 인스펙터로 교체될 자리), 하단 풀폭 ChunkStrip.
- 청크 클릭: `setSelected(i); playerRef.current?.seekTo(starts[i]);`
- `article.id`/`language` 변경 시 selected 리셋(useEffect).

- [ ] **Step 5: 검증 + Commit** — `cd v4 && npx tsc --noEmit` 0. (실데이터 검증은 Task 8 시드 후.)

```bash
git add v4/src/features/marketing/components/content/ReelsPanel.tsx v4/src/features/marketing/components/content/reelEditor/
git commit -m "feat(v4): reel editor subtab - read-only player + chunk strip + seek"
```

### Task 8: 온보딩 스크립트 push-reel-script + #2/#3 시드 + P1 통합 검증

**Files:**
- Create: `remotion/scripts/lib/reelWorkerLib.mjs` (push에 필요한 순수 함수 선행분)
- Create: `remotion/scripts/lib/reelWorkerLib.test.mjs`
- Create: `remotion/scripts/lib/reelDb.mjs` (env/REST/R2 IO — Chunk 2 워커와 공유)
- Create: `remotion/scripts/push-reel-script.mjs`

- [ ] **Step 1 (TDD): `reelWorkerLib.test.mjs` 작성 — 실패 확인**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPushDoc, toLocalScriptJson, ACTIVE_STATUSES, isStale } from "./reelWorkerLib.mjs";

test("buildPushDoc: insert 로컬 경로 → reel_assets URL 치환 + script 서브트리 구성", () => {
  const local = { slug: "성장판나이", fps: 30, title: "t", header: {}, chunks: [{ id: "c3", insert: "images/성장판나이/ig1.png" }] };
  const doc = buildPushDoc(local, { infographics: { ig1: "https://r2/x/ig1.png" } });
  assert.equal(doc.slug, "성장판나이");
  assert.equal(doc.script.chunks[0].insert, "https://r2/x/ig1.png");
  assert.equal(doc.script.title, "t");          // 미편집 필드 보존
  assert.equal(doc.script.fps, undefined);      // fps/slug 는 루트 메타 — script 서브트리 제외
});
test("buildPushDoc: 매칭 실패는 에러(절반 등록 금지)", () => {
  const local = { slug: "s", fps: 30, chunks: [{ id: "c1", insert: "images/s/ig9.png" }] };
  assert.throws(() => buildPushDoc(local, { infographics: {} }), /ig9/);
});
test("buildPushDoc: 이미 URL 인 insert 는 그대로", () => {
  const local = { slug: "s", fps: 30, chunks: [{ id: "c1", insert: "https://r2/a.png" }] };
  assert.equal(buildPushDoc(local, {}).script.chunks[0].insert, "https://r2/a.png");
});
test("toLocalScriptJson: 라운드트립 (DB doc → 기존 script.json 평탄 구조)", () => {
  const doc = { slug: "s", script: { title: "t", header: {}, chunks: [] } };
  assert.deepEqual(toLocalScriptJson(doc), { slug: "s", fps: 30, title: "t", header: {}, chunks: [] });
});
test("isStale: updated_at 10분 초과 active 만 true, queued 는 제외", () => {
  const old = new Date(Date.now() - 11 * 60 * 1000).toISOString();
  assert.equal(isStale({ status: "render", updated_at: old }, Date.now()), true);
  assert.equal(isStale({ status: "queued", updated_at: old }, Date.now()), false);
  assert.equal(isStale({ status: "render", updated_at: new Date().toISOString() }, Date.now()), false);
  assert.equal(ACTIVE_STATUSES.includes("upload_preview"), true);
});
```

Run: `cd remotion && node --test scripts/lib/reelWorkerLib.test.mjs` → Expected: FAIL (모듈 없음).

- [ ] **Step 2: `reelWorkerLib.mjs` 구현 — 테스트 통과**

```js
// 릴 워커/온보딩 순수 함수 — IO 금지 (테스트: reelWorkerLib.test.mjs).
export const ACTIVE_STATUSES = ["queued", "claimed", "tts", "lipsync", "upload_preview", "render", "upload"];

/** stale 판정: heartbeat(updated_at) 10분 미갱신 + 진행 중(claimed~upload). queued 는 대기일 뿐 stale 아님. */
export function isStale(job, nowMs, staleMs = 10 * 60 * 1000) {
  if (!ACTIVE_STATUSES.includes(job.status) || job.status === "queued") return false;
  return nowMs - Date.parse(job.updated_at) > staleMs;
}

/** render 잡 전제조건 — 전원격 렌더라 preview 립싱크 URL + timing 필수. */
export function renderPrecondition(runtime, lang) {
  if (!runtime?.preview?.[lang]?.lipsyncUrl) return { ok: false, reason: `preview.lipsyncUrl 없음(${lang}) — full 필요` };
  if (!Array.isArray(runtime?.timing?.[lang]) || runtime.timing[lang].length === 0)
    return { ok: false, reason: `timing 없음(${lang}) — full 필요` };
  return { ok: true };
}

/** 로컬 script.json(평탄) → DB reel_script doc. insert 로컬 경로는 reel_assets URL 로 치환(실패 = throw). */
export function buildPushDoc(localJson, reelAssets) {
  const { slug, fps: _fps, ...rest } = localJson;
  const chunks = (rest.chunks ?? []).map((c) => {
    if (!c.insert || /^https?:\/\//.test(c.insert)) return c;
    const m = c.insert.match(/\/(ig\d+)\.\w+$/);
    const url = m && reelAssets?.infographics?.[m[1]];
    if (!url) throw new Error(`insert 매칭 실패: ${c.insert} (${m ? m[1] : "?"}) — InfographicAssetsPanel 에 먼저 업로드`);
    return { ...c, insert: url };
  });
  return { slug, script: { ...rest, chunks } };
}

/** DB reel_script doc → 로컬 script.json(평탄, 기존 스크립트 호환). */
export function toLocalScriptJson(doc) {
  return { slug: doc.slug, fps: 30, ...doc.script };
}

/** 청크 나레이션 → tts_text 스냅샷 ({chunkId: 원문}) — preview 업로드 언어에만 시드. */
export function ttsTextSnapshot(chunks, lang) {
  const out = {};
  for (const c of chunks ?? []) if (typeof c[lang] === "string") out[c.id] = c[lang];
  return out;
}
```

Run: `cd remotion && node --test scripts/lib/reelWorkerLib.test.mjs` → Expected: 전부 PASS.

- [ ] **Step 3: `reelDb.mjs`** — IO 헬퍼(시크릿 콘솔 출력 금지). env 파싱·rest()는 `v4/scripts/upload-reel-covers.mjs:15-36`을, `uploadR2()`는 같은 파일의 업로드 함수(ai-server `POST /api/r2/upload`, PIN — line 50 이후 본문 참조)를 미러:

```js
// PostgREST + R2 업로드 + heartbeat IO 헬퍼. 시크릿은 ai-server/.env 에서만 읽고 출력하지 않는다.
import { readFileSync, existsSync } from "node:fs";
import { hostname } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REMOTION = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PROJ = join(REMOTION, "..");
function parseEnv(p) { /* upload-reel-covers.mjs:15-23 동일 */ }
const srv = parseEnv(join(PROJ, "ai-server", ".env"));
export const SUPABASE_URL = srv.SUPABASE_URL;
const KEY = srv.SUPABASE_SERVICE_ROLE_KEY;
export const AI_BASE = "http://localhost:" + (srv.PORT || "4000");
const PIN = srv.WEBSITE_ADMIN_PIN || "8054";
export const HOST = hostname();
const now = () => new Date().toISOString();

export function assertEnv() {
  if (!SUPABASE_URL || !KEY) throw new Error("ai-server/.env 에 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
}
export async function rest(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`${path.split("?")[0]} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res;
}
/** 원자 claim — 조건부 PATCH, 빈 배열 = 경쟁 패배. */
export async function claimJob(id) {
  const r = await rest(`marketing_reel_jobs?id=eq.${id}&status=eq.queued`, {
    method: "PATCH", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "claimed", claimed_by: HOST, started_at: now(), updated_at: now() }),
  });
  return (await r.json()).length > 0;
}
export async function updateJob(id, patch) {
  await rest(`marketing_reel_jobs?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ ...patch, updated_at: now() }) });
}
export async function heartbeat() {
  await rest(`marketing_reel_worker?on_conflict=id`, {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ id: 1, hostname: HOST, last_seen: now() }),
  });
}
/** reel_runtime 의 lang 키만 read-merge-write (워커 단일 프로세스 전제). partial = {timing?, preview?, tts_text?} 의 lang 값. */
export async function mergeRuntime(articleId, lang, partial) {
  const cur = (await (await rest(`marketing_articles?id=eq.${articleId}&select=reel_runtime`)).json())[0]?.reel_runtime ?? {};
  const next = { ...cur };
  for (const [k, v] of Object.entries(partial)) next[k] = { ...(cur[k] ?? {}), [lang]: v };
  await rest(`marketing_articles?id=eq.${articleId}`, { method: "PATCH", body: JSON.stringify({ reel_runtime: next }) });
  return next;
}
/** reels[lang].videoUrl 비파괴 병합 (다른 lang/필드 보존). */
export async function mergeReelsVideoUrl(articleId, lang, videoUrl) {
  const cur = (await (await rest(`marketing_articles?id=eq.${articleId}&select=reels`)).json())[0]?.reels ?? {};
  const next = { ...cur, [lang]: { ...(cur[lang] ?? {}), videoUrl } };
  await rest(`marketing_articles?id=eq.${articleId}`, { method: "PATCH", body: JSON.stringify({ reels: next }) });
}
export async function uploadR2(localPath, folder) { /* upload-reel-covers.mjs 의 업로드 구현 미러 — 반환: 공개 URL */ }
```
`uploadR2` 구현 주의 3가지:
- upload-reel-covers.mjs의 실제 요청 형식(FormData/base64 등)을 **구현 시점에 읽고 그대로** 미러할 것(컨트랙트 변경 금지).
- **둘째 인자는 key 가 아니라 folder** — ai-server `/api/r2/upload`(r2.ts)는 folder만 받고 최종 키를 서버가 `images/{folder}/{ts}-{rand}.{ext}` 로 생성하며 **비ASCII(한글)를 strip** 한다. 따라서 folder 에 한글 slug 금지 — 언어별 preview 폴더는 `marketing/reels/preview/{articleId}/{lang}` (uuid, ASCII). **최종 키/URL 의 정본 = 서버 반환값**이며 호출부는 반환 URL만 DB에 기록한다.
- 연결 실패(ECONNREFUSED 등)는 `ai-server(localhost:{PORT}) 미응답 — 로컬 ai-server 실행 필요` 로 매핑해 throw(스펙의 명시 에러 요구).

- [ ] **Step 4: `push-reel-script.mjs`** — 온보딩 표준 스크립트(이관 + 신규 콘텐츠):

```js
// 릴 콘텐츠 온보딩: 로컬 script.json(+timing/음성/립싱크) → DB reel_script/reel_runtime + R2 preview.
// 사용: node scripts/push-reel-script.mjs <slug> --article <sortOrder> [--check] [--force]
// preflight: ① reel_script 기존재 시 --force 요구(웹 편집본 파괴 경로) ② active 잡 존재 시 거부 ③ insert 매칭 실패 시 중단.
```
구현 순서(모든 단계 로그 출력, --check 는 ①~⑤ 점검만 하고 종료):
1. argv 파싱(slug, `--article N` 필수). `src/shorts/{slug}/script.json` 로드.
2. `marketing_articles?sort_order=eq.N&select=id,reel_script,reel_assets` 조회 — 0행이면 에러.
3. preflight: `reel_script` 존재+`!--force` → 에러 메시지 후 종료(1). `marketing_reel_jobs?article_id=eq.{id}&status=in.(${ACTIVE_STATUSES.join(',')})` 1건↑ → 에러.
4. `buildPushDoc(local, reel_assets)` — 매칭 실패 throw 전파.
5. 보유 언어 탐지: `timing-{lang}.json` 존재 && `public/videos/{slug}-presenter-lipsync-{lang}.mp4` 존재 && `public/audio/shorts/{slug}/{lang}/` 의 청크 wav 전부 존재.
6. (--check 아니면) 언어별 업로드: 립싱크 mp4·청크 wav 들 → folder `marketing/reels/preview/{articleId}/{lang}` (서버가 키·URL 생성 — 한글 slug 는 folder 에 쓰지 않는다) → runtime 구성 `{ timing, preview: {lipsyncUrl, audio}, tts_text: ttsTextSnapshot(chunks, lang) }`.
7. PATCH: `reel_script` = doc, `reel_runtime` = 언어별 병합 결과(시드는 전체 작성이라 단순 set).
8. 요약 출력: 언어별 timing/preview/tts_text 유무 표.

- [ ] **Step 5: 시드 실행** (전제: migration 057 적용 + 로컬 ai-server 기동)

```bash
cd remotion && node scripts/push-reel-script.mjs 성장타이밍4 --article 2 --check
cd remotion && node scripts/push-reel-script.mjs 성장타이밍4 --article 2
cd remotion && node scripts/push-reel-script.mjs 성장판나이 --article 3
```
Expected: --check 통과 후 본실행 — ko/th 2개 언어 preview 업로드, "reel_script 저장 + runtime(ko,th)" 요약. 재실행 시 --force 없으면 거부되는지도 확인.

- [ ] **Step 6: P1 통합 검증 시퀀스** (스펙 "테스트" 절)
1. `cd v4 && npm run dev` → `/marketing/content` → 콘텐츠 #3 → 릴스 → ✂️ 에디터.
2. **dedupe 검증**: 브라우저 콘솔에 Invalid hook call 없음, Player가 프레임 진행(0 고정 아님), ko 재생 시 원장 영상 + 청크 오디오 들림.
3. 청크 스트립 클릭 → 해당 구간으로 시킹. 인서트 청크(c3 등)에서 인포그래픽+라벨 표시.
4. 언어 vi 선택 → 제한 모드 배너 + "영상 미생성" placeholder + 무음 + 110f 균등.
5. `cd v4 && npx tsc --noEmit` 0 / `cd remotion && npx tsc --noEmit` 0.

- [ ] **Step 7: Commit**

```bash
git add remotion/scripts/lib/reelWorkerLib.mjs remotion/scripts/lib/reelWorkerLib.test.mjs remotion/scripts/lib/reelDb.mjs remotion/scripts/push-reel-script.mjs
git commit -m "feat(remotion): push-reel-script onboarding (preflight) + worker pure lib with tests"
```

---

## Chunk 2: P2 텍스트·인서트 편집 + 렌더 잡 + 워커(render 경로)

### Task 9: 워커 본체 — claim→render→upload→done (full은 P3 stub)

**Files:**
- Create: `remotion/scripts/reel-worker.mjs`
- Modify: `remotion/scripts/lib/reelWorkerLib.test.mjs` (renderPrecondition 테스트 추가)

- [ ] **Step 1 (TDD): renderPrecondition 테스트 추가 → PASS 확인** (이미 구현돼 있으므로 즉시 통과 — 회귀 고정 목적)

```js
test("renderPrecondition: preview/timing 없으면 불가", () => {
  assert.equal(renderPrecondition({}, "ko").ok, false);
  assert.equal(renderPrecondition({ preview: { ko: { lipsyncUrl: "u" } }, timing: { ko: [{ id: "c1", durFrames: 1 }] } }, "ko").ok, true);
});
```

- [ ] **Step 2: `reel-worker.mjs` 작성**

```js
// 릴 렌더 워커 — marketing_reel_jobs 폴링. --once(큐 소진 후 종료) / --watch(15s 상주).
// render 잡: DB script + R2 preview(전원격) → PresenterGeneric renderMedia → R2 업로드 → reels[lang].videoUrl.
// full 잡: P3 에서 구현 (현재는 명시 failed).
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ACTIVE_STATUSES, isStale, renderPrecondition, toLocalScriptJson } from "./lib/reelWorkerLib.mjs";
import { assertEnv, rest, claimJob, updateJob, heartbeat, mergeReelsVideoUrl, uploadR2 } from "./lib/reelDb.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WATCH = process.argv.includes("--watch");
const POLL_MS = 15_000;

let serveUrl = null;
async function getServeUrl() {
  if (!serveUrl) {
    console.log("bundling… (1회, 잡 간 재사용 — 렌더 입력은 전원격이라 안전)");
    serveUrl = await bundle({ entryPoint: join(ROOT, "src", "index.ts"), onProgress: () => {} });
  }
  return serveUrl;
}

async function recoverStale() {
  const active = await (await rest(`marketing_reel_jobs?status=in.(${ACTIVE_STATUSES.join(",")})&select=id,status,updated_at`)).json();
  for (const j of active) if (isStale(j, Date.now()))
    await updateJob(j.id, { status: "queued", claimed_by: null, progress_note: "stale 회수 → 재대기" });
}

async function renderStage(job, scriptDoc, runtime) {
  await updateJob(job.id, { status: "render", progress_note: "렌더 중" });
  const pv = runtime.preview[job.lang];
  const inputProps = {
    script: scriptDoc.script, timing: runtime.timing[job.lang], lang: job.lang, slug: job.slug,
    assets: { videoSrc: pv.lipsyncUrl, audio: pv.audio },
  };
  const url = await getServeUrl();
  const composition = await selectComposition({ serveUrl: url, id: "PresenterGeneric", inputProps });
  const out = join(ROOT, "out", "shorts", job.slug, `${job.slug}-${job.lang}.mp4`);
  mkdirSync(dirname(out), { recursive: true });
  await renderMedia({ composition, serveUrl: url, codec: "h264", outputLocation: out, inputProps,
    onProgress: ({ progress }) => { /* 10% 단위로 updateJob progress_note (과도 호출 금지: 직전 단위와 다를 때만) */ } });
  return out;
}

async function processJob(job) {
  const art = (await (await rest(`marketing_articles?id=eq.${job.article_id}&select=reel_script,reel_runtime`)).json())[0];
  if (!art?.reel_script) throw new Error("reel_script 없음 — push-reel-script 온보딩 필요");
  const scriptDoc = art.reel_script;            // claim 시점 스냅샷
  let runtime = art.reel_runtime ?? {};
  // sync: 로컬 script.json 갱신 (full 경로의 기존 TTS 스크립트 + 스튜디오 프리뷰 일치용)
  writeFileSync(join(ROOT, "src", "shorts", job.slug, "script.json"), JSON.stringify(toLocalScriptJson(scriptDoc), null, 2));

  if (job.kind === "full") throw new Error("full 파이프라인은 미구현(P3) — render 잡만 지원");
  const pre = renderPrecondition(runtime, job.lang);
  if (!pre.ok) throw new Error(pre.reason);

  const out = await renderStage(job, scriptDoc, runtime);
  await updateJob(job.id, { status: "upload", progress_note: "R2 업로드 중" });
  const videoUrl = await uploadR2(out, "marketing/reels/video"); // folder 만 전달 — 키({ts}-{rand})는 서버 생성이라 캐시 무효화 내장
  await mergeReelsVideoUrl(job.article_id, job.lang, videoUrl);
  await updateJob(job.id, { status: "done", finished_at: new Date().toISOString(), progress_note: "완료" });
  console.log(`✓ done ${job.slug}/${job.lang} → ${videoUrl}`);
}

async function pollOnce() {
  await heartbeat();
  const q = await (await rest("marketing_reel_jobs?status=eq.queued&order=requested_at.asc&limit=1")).json();
  if (!q.length) return false;
  const job = q[0];
  if (!(await claimJob(job.id))) return true;
  console.log(`▶ claim ${job.id} ${job.slug}/${job.lang} kind=${job.kind}`);
  try { await processJob(job); }
  catch (e) {
    console.error(`✗ failed: ${e?.message}`);
    await updateJob(job.id, { status: "failed", error: String(e?.stack || e).slice(0, 500) });
  }
  return true;
}

async function main() {
  assertEnv();
  await recoverStale();
  for (;;) {
    let worked = false;
    try { worked = await pollOnce(); } catch (e) { console.error("poll error:", e?.message); }
    if (!worked && !WATCH) break;
    if (!worked) await new Promise((r) => setTimeout(r, POLL_MS));
  }
  console.log("큐 비움 — 종료 (--watch 로 상주 가능)");
}
main();
```
장시간 단계(렌더)의 60초 heartbeat: `renderMedia` onProgress 에서 마지막 updateJob 후 60초 지났으면 `updateJob(job.id, {})`(updated_at만 갱신) 호출하는 스로틀 헬퍼로 구현.

- [ ] **Step 3: 수동 검증(렌더 only)** — DB에 직접 테스트 잡 1개 삽입 후:

```bash
cd remotion && node scripts/reel-worker.mjs --once
```
article uuid 조회 + 잡 삽입(psql 없이 PostgREST):
```bash
node -e "import('./scripts/lib/reelDb.mjs').then(async m => { const a = await (await m.rest('marketing_articles?sort_order=eq.3&select=id')).json(); console.log(a[0].id); })"
node -e "import('./scripts/lib/reelDb.mjs').then(async m => { await m.rest('marketing_reel_jobs', { method: 'POST', body: JSON.stringify({ article_id: '<위 uuid>', slug: '성장판나이', lang: 'ko', kind: 'render' }) }); console.log('queued'); })"
```
(Step 1 테스트 추가 시 import 줄에 `renderPrecondition` 추가 잊지 말 것.)
Expected: claim→render(수 분)→upload→done 로그, `marketing_articles.reels.ko.videoUrl` 갱신, 출력 mp4 재생 정상(자막·인서트·오디오 싱크).

- [ ] **Step 4: Commit**

```bash
git add remotion/scripts/reel-worker.mjs remotion/scripts/lib/reelWorkerLib.test.mjs
git commit -m "feat(remotion): reel render worker (claim/render/upload/done, stale recovery, heartbeat)"
```

### Task 10: v4 잡 서비스 reelJobService.ts

**Files:**
- Create: `v4/src/features/marketing/services/reelJobService.ts`

- [ ] **Step 1: 작성**

```ts
// 릴 렌더 잡 + 워커 상태 서비스 (migration 057). graceful: 테이블 미존재 시 친절한 에러로 변환.
import { supabase } from '@/shared/lib/supabase';
import type { ReelJob, ReelJobStatus, ReelLang } from '../types';
import { REEL_JOB_ACTIVE } from '../utils/reelEditor';

const MIGRATION_HINT = 'migration 057 적용 필요 (marketing_reel_jobs)';
function friendly(e: { message: string; code?: string }): Error {
  return new Error(/relation .* does not exist|42P01/.test(`${e.code} ${e.message}`) ? MIGRATION_HINT : e.message);
}
function mapJob(r: Record<string, unknown>): ReelJob {
  return {
    id: r.id as string, articleId: r.article_id as string, slug: r.slug as string,
    lang: r.lang as ReelLang, kind: r.kind as ReelJob['kind'], status: r.status as ReelJobStatus,
    progressNote: (r.progress_note as string) ?? null, error: (r.error as string) ?? null,
    requestedAt: r.requested_at as string, startedAt: (r.started_at as string) ?? null,
    finishedAt: (r.finished_at as string) ?? null, updatedAt: r.updated_at as string,
  };
}
export async function fetchReelJobs(articleId: string, limit = 8): Promise<ReelJob[]> {
  const { data, error } = await supabase.from('marketing_reel_jobs')
    .select('*').eq('article_id', articleId).order('requested_at', { ascending: false }).limit(limit);
  if (error) throw friendly(error);
  return (data ?? []).map(mapJob);
}
export async function createReelJob(input: { articleId: string; slug: string; lang: ReelLang; kind: 'render' | 'full' }): Promise<void> {
  const { data: act, error: e1 } = await supabase.from('marketing_reel_jobs')
    .select('id').eq('article_id', input.articleId).eq('lang', input.lang).in('status', [...REEL_JOB_ACTIVE]).limit(1);
  if (e1) throw friendly(e1);
  if (act && act.length) throw new Error('이미 진행 중인 렌더 잡이 있습니다');
  const { error } = await supabase.from('marketing_reel_jobs')
    .insert({ article_id: input.articleId, slug: input.slug, lang: input.lang, kind: input.kind });
  if (error) throw friendly(error);
}
export async function fetchWorkerLastSeen(): Promise<string | null> {
  const { data, error } = await supabase.from('marketing_reel_worker').select('last_seen').eq('id', 1).maybeSingle();
  if (error) throw friendly(error);
  return (data?.last_seen as string) ?? null;
}
```
재시도 = `createReelJob` 재호출(실패 잡은 active 아님 — 중복 가드에 안 걸림).

- [ ] **Step 2: 검증 + Commit** — `cd v4 && npx tsc --noEmit` 0.

```bash
git add v4/src/features/marketing/services/reelJobService.ts
git commit -m "feat(v4): reel job service (create with active-guard, list, worker heartbeat)"
```

### Task 11: 세션 undo 훅 + 저장 배선

**Files:**
- Create: `v4/src/features/marketing/components/content/reelEditor/useUndoableDoc.ts`
- Modify: `v4/src/features/marketing/components/content/reelEditor/ReelEditorPanel.tsx`

- [ ] **Step 1: `useUndoableDoc.ts`**

```ts
// 세션 내 undo/redo (≤20 스냅샷) — 700ms 자동저장으로 즉시 영구화되는 드래그/삭제 실수 방어.
// 서버측 버전 이력은 v1 범위 외 (스펙). Ctrl+Z/Y 는 입력 필드 포커스 시 무시(브라우저 기본 동작 보존).
import { useCallback, useEffect, useRef, useState } from 'react';

export function useUndoableDoc<T>(initial: T, onCommit: (next: T) => void) {
  const [doc, setDocState] = useState<T>(initial);
  const undoStack = useRef<T[]>([]);
  const redoStack = useRef<T[]>([]);
  // ★ docRef = 현재 문서의 ref 미러. setState 함수형 안에서 부수효과(스택 push) 금지 —
  //   모든 전이(setDoc/undo/redo/reset)는 이벤트 핸들러 경로에서 docRef 기준으로 스택을 조작하고
  //   마지막에 docRef 를 직접 갱신한다(렌더 바디 동기화에 의존하지 않음 — 연속 전이 안전).
  const docRef = useRef<T>(initial);
  const setDoc = useCallback((next: T) => {
    undoStack.current.push(docRef.current);
    if (undoStack.current.length > 20) undoStack.current.shift();
    redoStack.current = [];
    docRef.current = next;
    setDocState(next);
    onCommit(next);
  }, [onCommit]);
  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (prev === undefined) return;
    redoStack.current.push(docRef.current);
    docRef.current = prev;
    setDocState(prev);
    onCommit(prev);
  }, [onCommit]);
  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (next === undefined) return;
    undoStack.current.push(docRef.current);
    docRef.current = next;
    setDocState(next);
    onCommit(next);
  }, [onCommit]);
  const reset = useCallback((next: T) => {
    undoStack.current = []; redoStack.current = [];
    docRef.current = next;
    setDocState(next); // reset 은 onCommit 호출 안 함(콘텐츠 전환은 저장 대상 아님)
  }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [undo, redo]);
  return { doc, setDoc, undo, redo, reset };
}
```
- [ ] **Step 2: EditorInner 배선** — `useUndoableDoc(doc0, handleCommit)`(EditorInner 안 — doc0 는 non-null 보장, Task 7 2분할 구조). `handleCommit(next)` = **`onPatch?.({ reelScript: next })` 즉시 호출**(stale 방지 — ReelsPanel :76-81 패턴과 동일하게 패치는 즉시) + **저장만 700ms debounce** → `saveReelScript(article.id, next)`(에러 시 배너 state). `article.id` 변경 시 `reset(새 reelScript)`. 저장 상태 표시("저장됨 ✓ / 저장 중… / 실패") 한 줄.

- [ ] **Step 3: 검증 + Commit** — tsc 0.

```bash
git add v4/src/features/marketing/components/content/reelEditor/useUndoableDoc.ts v4/src/features/marketing/components/content/reelEditor/ReelEditorPanel.tsx
git commit -m "feat(v4): reel editor session undo + debounced reel_script save"
```

### Task 12: ChunkInspector + HeaderCtaForm (자막/하이라이트/인서트/라벨 값 편집)

**Files:**
- Create: `v4/src/features/marketing/components/content/reelEditor/ChunkInspector.tsx`
- Create: `v4/src/features/marketing/components/content/reelEditor/HeaderCtaForm.tsx`
- Modify: `ReelEditorPanel.tsx` (우측 패널에 장착)

- [ ] **Step 1: `ChunkInspector.tsx`** — props `{ chunk: ReelChunk; chunkIdx: number; language: ReelLang; reelAssets: ReelAssets; onPatch: (patch: Partial<ReelChunk>) => void }`. 섹션:
  - **자막**: `cap_{lang}` 줄 1·2 input(빈 줄 제거), `hl_{lang}` input + 헬퍼 "자막에 포함된 문구만 노랗게 강조됩니다".
  - **인서트**: 현재 `insert` 썸네일 + 셀렉트(옵션 = `reelAssets.infographics` 의 {igKey, url} + "없음"). 변경 시 `onPatch({ insert: url 또는 undefined })`.
  - **라벨**(insert 있을 때만): `insertLabels` 리스트 — 행마다 현재 언어 텍스트 input(`label[language]`), size/color/pill input, 삭제 버튼. "+ 라벨" = `{ x: 0.5, y: 0.5, size: 32, weight: 800, color: '#5b3fa6', [language]: '' }` 추가. 위치(x/y)는 캔버스 드래그(Task 13)가 담당 — 인스펙터엔 숫자 미노출(소수 노이즈 방지).
  - 모든 변경은 `updateChunk` 유틸 경유로 불변 패치.
  - **텍스트 input/textarea 는 로컬 state 로 타이핑하고 onBlur(또는 Enter) 시점에 setDoc 1회 커밋** — 키스트로크마다 setDoc 하면 undo 스냅샷(≤20)이 즉시 소진된다. 셀렉트/색상 등 단발 컨트롤은 즉시 setDoc.
  - 나레이션 textarea 는 **P3** — 이 태스크에선 렌더하지 않음.
- [ ] **Step 2: `HeaderCtaForm.tsx`** — 아코디언(기본 접힘): `header[language].top/.mark` input, `headerStyle.markBg/markFg` `<input type="color">`, `cta[language]` input. props `{ doc, language, onPatchScript: (patch) => void }`.
- [ ] **Step 3: ReelEditorPanel 우측 패널** = HeaderCtaForm + (선택 청크) ChunkInspector. 편집 → setDoc(불변 갱신) → Player inputProps에 즉시 반영되는지 확인 포인트 명시.
- [ ] **Step 4: 검증** — dev 서버에서 #3 ko: 자막 한 글자 수정(blur) → 미리보기 즉시 반영 + "저장됨". 새로고침 후 유지(DB 저장 확인). Ctrl+Z 복원 → Ctrl+Y 재적용까지 확인.
- [ ] **Step 5: Commit**

```bash
git add v4/src/features/marketing/components/content/reelEditor/ChunkInspector.tsx v4/src/features/marketing/components/content/reelEditor/HeaderCtaForm.tsx v4/src/features/marketing/components/content/reelEditor/ReelEditorPanel.tsx
git commit -m "feat(v4): reel editor inspector - captions/highlight/insert/labels + header/cta form"
```

### Task 13: CanvasDragLayer — insertLabels 드래그

**Files:**
- Create: `v4/src/features/marketing/components/content/reelEditor/CanvasDragLayer.tsx`
- Modify: `ReelEditorPanel.tsx`

- [ ] **Step 1: `CanvasDragLayer.tsx`** — Player 래퍼(`position: relative`) 위 `absolute inset-0` 투명 레이어. props `{ chunk: ReelChunk; language: ReelLang; onCommit: (labels: ReelInsertLabel[]) => void }`.
  - 선택 청크에 insert 있을 때만 렌더. 각 insertLabel 위치에 핸들 div: `left: ${x*100}%`, `top: ${(PANEL_TOP_FRAC + y * PANEL_H_FRAC) * 100}%`, `translate(-50%,-50%)`, 점선 테두리 + 텍스트 미리표시(`label[language] ?? label.ko`).
  - pointerdown → `setPointerCapture`, pointermove → `pxToPanelFrac(e.clientX, e.clientY, wrapperRect)` 로 **로컬 state만** 갱신(드래그 중 매 프레임 setDoc 금지 — undo 1스텝 보장), pointerup → `onCommit(updatedLabels)` 1회(= setDoc 1회 = undo 1스텝).
  - 레이어 자체는 `pointer-events: none`, 핸들만 `pointer-events: auto`(Player 컨트롤 클릭 보존).
- [ ] **Step 2: ReelEditorPanel 장착** — PresenterBridge 를 `relative` div 로 감싸고 그 안에 CanvasDragLayer. wrapperRect 는 `ref.getBoundingClientRect()` 를 드래그 시작 시 1회 캡처.
- [ ] **Step 3: 검증** — c3 선택 → "열린 성장판" 라벨 드래그 → 미리보기의 라벨 이동 일치(특히 **y 정확성** — 패널 존 환산). 드래그 후 Ctrl+Z 1회로 원위치.
- [ ] **Step 4: Commit**

```bash
git add v4/src/features/marketing/components/content/reelEditor/CanvasDragLayer.tsx v4/src/features/marketing/components/content/reelEditor/ReelEditorPanel.tsx
git commit -m "feat(v4): drag insertLabels on player canvas (panel-zone coords, 1-step undo)"
```

### Task 14: RenderJobWidget — 렌더 요청 + 잡 폴링 + 워커 오프라인 배너

**Files:**
- Create: `v4/src/features/marketing/components/content/reelEditor/RenderJobWidget.tsx`
- Modify: `ReelEditorPanel.tsx`

- [ ] **Step 1: `RenderJobWidget.tsx`** — props `{ article, language, doc, runtime, onPatch }`.
  - kind 미리보기: `decideKind({ chunks: doc.script.chunks, lang, runtime, forceFull })` → 버튼 라벨 "🎬 렌더 요청 (자막·텍스트만: 수 분)" / "🎙 음성+립싱크 포함 (수십 분)". `☑ 음성 강제 재생성` 체크박스 = forceFull.
  - 요청: full 이면 `confirm()` 확인창 → `createReelJob`. 에러(이미 진행 중/migration) 배너.
  - 폴링: `fetchReelJobs(article.id)` 5초 interval(활성 잡 있을 때만), 표시 = 최근 3개 행(상태 칩 + progress_note + 실패 시 error 펼침 + "재시도" 버튼). active 잡 있으면 요청 버튼 disable.
  - done 전이 감지(이전 폴링 active → 이번 done) 시: ① 성공 배너 표시 ② **`supabase.from('marketing_articles').select('reels').eq('id', article.id).maybeSingle()` 로 reels 단건 재조회 → `onPatch?.({ reels: mapped })`** — 워커가 기록한 새 videoUrl 을 부모 article 에 반영(🎬 영상 제작 탭이 즉시 새 URL 표시). 이 fetch+패치가 `onJobDone` 의 전부이며 RenderJobWidget 내부에서 수행(부모 콜백 불필요 — props 의 `onPatch` 직접 사용, `onJobDone` prop 제거).
  - 워커 오프라인 배너: queued 잡 존재 && `fetchWorkerLastSeen()` null 또는 2분 초과 → "⚠️ 렌더 워커 꺼짐(마지막 신호 N분 전) — 사무실 PC에서 `node scripts/reel-worker.mjs --watch` 실행 필요".
  - "잡은 요청 시점 내용으로 처리됩니다 — 진행 중 편집은 다음 렌더에 반영" 안내 문구.
  - 타입 주의: `REEL_JOB_ACTIVE` 는 as-const 튜플 — 넓은 `ReelJobStatus` 값에 `.includes` 를 쓸 땐 `(REEL_JOB_ACTIVE as readonly string[]).includes(status)` 형태로.
- [ ] **Step 2: 검증(E2E render 경로)** — #3 ko 자막 한 글자 수정 → 렌더 요청(kind=render 확인) → 워커 `--once` 실행 → 위젯이 render→upload→done 진행 표시 → 🎬 영상 제작 탭에서 새 videoUrl 재생 확인.
- [ ] **Step 3: Commit**

```bash
git add v4/src/features/marketing/components/content/reelEditor/RenderJobWidget.tsx v4/src/features/marketing/components/content/reelEditor/ReelEditorPanel.tsx
git commit -m "feat(v4): render job widget - kind preview, polling, retry, worker-offline banner"
```

### Task 15: saveReels lang-병합 교정 (잔여 겹침 제거)

**Files:**
- Modify: `v4/src/features/marketing/services/marketingArticleService.ts:206` (saveReels)
- Modify: `v4/src/features/marketing/components/content/ReelsPanel.tsx`, `.../CustomReelsPanel.tsx` (호출부)

- [ ] **Step 1:** `saveReelsLang(id, lang, data: ReelsLangData)` 신설 — fresh select reels → `{ ...cur, [lang]: { ...cur[lang], ...data } }` → update. 워커의 videoUrl 병합과 충돌 창 최소화.
- [ ] **Step 2:** ReelsPanel/CustomReelsPanel 의 `saveReels(article.id, next)` 호출(각각 :73 / :79 — 호출부는 이 2곳뿐)을 현재 언어 단위 `saveReelsLang` 으로 교체(로컬 state 는 기존 그대로). 기존 `saveReels` 제거. **언어 전환 유실 가드**: 두 패널 다 디바운스 타이머가 언어 공용이라, per-lang 저장으로 바꾸면 "A 언어 편집 → 700ms 내 B 언어 전환 편집" 시 A 의 pending 저장이 사라진다 — `language` 변경 effect 에서 **pending flush(타이머 즉시 실행)** 추가.
- [ ] **Step 3: 검증 + Commit** — tsc 0 + 영상 제작 탭 회귀: th 영상 업로드 후 **ko 의 videoUrl/coverUrl 이 보존**되는지(병합 의미론), 언어 빠른 전환 시 두 언어 모두 저장되는지 확인.

```bash
git add v4/src/features/marketing/services/marketingArticleService.ts v4/src/features/marketing/components/content/ReelsPanel.tsx v4/src/features/marketing/components/content/CustomReelsPanel.tsx
git commit -m "fix(v4): saveReels -> per-lang merge (close residual overlap with worker videoUrl merge)"
```

---

## Chunk 3: P3 풀 파이프라인 (나레이션 편집 + TTS→립싱크→upload_preview)

### Task 16: 나레이션 편집 UI + kind 판정 연결

**Files:**
- Modify: `ChunkInspector.tsx`, `ChunkStrip.tsx`, `ReelEditorPanel.tsx`

- [ ] **Step 1:** ChunkInspector 최상단에 **나레이션** textarea(`chunk[language]`, 3줄) 추가 — **Task 12 규칙 동일: 로컬 state 타이핑 + onBlur 1회 커밋** `onPatch({ [language]: value })`(키스트로크 커밋 금지 — undo 스택 소진 + 🎙 배지/kind 판정 점멸 방지). 아래 캡션: "수정 시 이 언어는 음성·립싱크 재생성(수십 분)이 필요합니다".
- [ ] **Step 2:** 🎙 배지 배선 — ChunkStrip `items[].dirty = chunkTtsDirty(chunk, language, runtime)`, ChunkInspector 헤더에도 동일 배지.
- [ ] **Step 3:** 검증 — 나레이션 한 글자 수정 → 배지 점등 + RenderJobWidget 버튼이 full 로 전환. 원문 복원 → 배지 소등 + render 로 복귀(비교 기반 판정 확인).
- [ ] **Step 4: Commit**

```bash
git add v4/src/features/marketing/components/content/reelEditor/ChunkInspector.tsx v4/src/features/marketing/components/content/reelEditor/ChunkStrip.tsx v4/src/features/marketing/components/content/reelEditor/ReelEditorPanel.tsx
git commit -m "feat(v4): narration editing + tts-dirty badges (comparison-based kind)"
```

### Task 17: 워커 full 경로 — TTS → 립싱크 → upload_preview → 렌더

**Files:**
- Modify: `remotion/scripts/reel-worker.mjs`
- Modify: `remotion/scripts/lib/reelWorkerLib.test.mjs` (ttsTextSnapshot 테스트)

- [ ] **Step 1 (TDD): ttsTextSnapshot 테스트 추가 → PASS**

```js
test("ttsTextSnapshot: lang 나레이션만 {id: 원문}", () => {
  const chunks = [{ id: "c1", ko: "가", th: "ก" }, { id: "c2", th: "ข" }];
  assert.deepEqual(ttsTextSnapshot(chunks, "ko"), { c1: "가" });
});
```

- [ ] **Step 2: processJob 의 full 분기 구현** (stub 제거):

```js
import { execFileSync, spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
const LS = "C:/Users/101024/lipsync/LatentSync";   // prep-lipsync.mjs:10 과 동일 상수

if (job.kind === "full") {
  // 3a. TTS (기존 스크립트 무수정 재사용 — sync 된 script.json 을 읽는다)
  await updateJob(job.id, { status: "tts", progress_note: "클론음성 생성 중" });
  execFileSync("node", [join(ROOT, "scripts", "gen-tts-short.mjs"), job.slug, job.lang], { stdio: "inherit", cwd: ROOT });
  const timing = JSON.parse(readFileSync(join(ROOT, "src", "shorts", job.slug, `timing-${job.lang}.json`), "utf8"));
  if (!timing.length) throw new Error(`이 언어(${job.lang}) 나레이션이 script 에 없음 — TTS 결과 0청크`); // gen-tts 는 전 청크 skip 시에도 exit 0
  // 3b. 립싱크 입력 준비 + LatentSync 인퍼런스 (GPU, 수십 분 가능)
  await updateJob(job.id, { status: "lipsync", progress_note: "립싱크 입력 준비" });
  execFileSync("node", [join(ROOT, "scripts", "prep-lipsync.mjs"), job.slug, job.lang], { stdio: "inherit", cwd: ROOT });
  await updateJob(job.id, { progress_note: "LatentSync 인퍼런스 중 (GPU)" });
  execFileSync(join(LS, ".venv", "Scripts", "python.exe"),
    ["-m", "scripts.inference", "--unet_config_path", "configs/unet/stage2.yaml",
     "--inference_ckpt_path", "checkpoints/latentsync_unet.pt", "--inference_steps", "20",
     "--guidance_scale", "1.5", "--enable_deepcache",
     "--video_path", `input/${job.slug}_${job.lang}_footage.mp4`,
     "--audio_path", `input/${job.slug}_${job.lang}.wav`,
     "--video_out_path", `output/${job.slug}_${job.lang}.mp4`],
    { stdio: "inherit", cwd: LS });
  const lsOut = join(LS, "output", `${job.slug}_${job.lang}.mp4`);
  if (!existsSync(lsOut)) throw new Error("LatentSync exit 0 인데 산출물 없음: " + lsOut);
  const localLip = join(ROOT, "public", "videos", `${job.slug}-presenter-lipsync-${job.lang}.mp4`);
  mkdirSync(dirname(localLip), { recursive: true });
  copyFileSync(lsOut, localLip); // 스튜디오/레거시 호환 배치
  // 4. upload_preview — 렌더(전원격)보다 먼저! (bundle 캐시 안전의 전제)
  await updateJob(job.id, { status: "upload_preview", progress_note: "미리보기 에셋 업로드" });
  const folder = `marketing/reels/preview/${job.article_id}/${job.lang}`; // ASCII folder — 한글 slug 금지(서버가 strip)
  const lipsyncUrl = await uploadR2(localLip, folder);
  const audio = {};
  for (const t of timing)
    audio[t.id] = await uploadR2(join(ROOT, "public", "audio", "shorts", job.slug, job.lang, `${t.id}.wav`), folder);
  runtime = await mergeRuntime(job.article_id, job.lang, {
    timing, preview: { lipsyncUrl, audio }, tts_text: ttsTextSnapshot(scriptDoc.script.chunks, job.lang),
  });
}
// 이후 공통: renderStage → upload → done (Task 9 코드 그대로)
```
**LatentSync 실행은 위 샘플의 execFileSync 를 그대로 쓰지 말 것** — 블로킹이라 60초 heartbeat 불가(인퍼런스 수십 분 > stale 임계 10분 → 동시 기동된 다른 프로세스의 stale 회수에 뺏김). `spawn(pythonPath, args, { stdio: "inherit", cwd: LS })` + Promise 래핑으로 exit code 대기, 진행 중 `setInterval(60초)` 로 `updateJob(job.id, { progress_note: \`인퍼런스 ${분}분 경과\` })`, **interval 은 try/finally 로 반드시 clear**. exit code ≠ 0 이면 throw.

- [ ] **Step 3: E2E full 검증** — #3 th 나레이션 한 문장 수정 → full 잡 요청 → `--once` 실행: tts→lipsync→upload_preview→render→upload→done 전 단계 진행 + `reel_runtime.timing/preview/tts_text.th` 갱신 + 에디터 재진입 시 새 음성/타이밍으로 미리보기. 산출 mp4 의 입싱크/자막 싱크 확인.
- [ ] **Step 4: 신규 언어 생산 검증** — #3 vi(음성 없던 언어)에서 렌더 요청(자동 full) → 동일 통과 → vi 미리보기가 제한 모드에서 정식 모드로 전환.
- [ ] **Step 5: Commit**

```bash
git add remotion/scripts/reel-worker.mjs remotion/scripts/lib/reelWorkerLib.test.mjs
git commit -m "feat(remotion): full pipeline worker - tts/lipsync/upload_preview before render, timing pushback"
```

### Task 18: 잡 진행 가시성 다듬기 (장단계 progress)

**Files:**
- Modify: `remotion/scripts/reel-worker.mjs`, `RenderJobWidget.tsx`

- [ ] **Step 1:** 렌더 onProgress 10% 단위 progress_note("렌더 42%"), LatentSync interval heartbeat 에 경과분("인퍼런스 12분 경과") 포함.
- [ ] **Step 2:** RenderJobWidget — full 잡일 때 단계 타임라인(tts→lipsync→upload_preview→render→upload) 칩으로 현재 단계 강조.
- [ ] **Step 3: 검증** — full 잡 1회 진행 중 위젯에서 "렌더 N%" progress_note 갱신(10% 단위)과 단계 칩 전환을 눈으로 확인. 인퍼런스 단계에서 "N분 경과" 갱신 확인.
- [ ] **Step 4: Commit**

```bash
git add remotion/scripts/reel-worker.mjs v4/src/features/marketing/components/content/reelEditor/RenderJobWidget.tsx
git commit -m "feat(reel-editor): stage progress detail for long-running jobs"
```

### Task 19: Chunk 3 종합 검증

- [ ] **Step 1:** `cd remotion && node --test scripts/lib/` 전부 PASS, `npx tsc --noEmit`(remotion·v4) 0.
- [ ] **Step 2:** 회귀: per-slug 스튜디오 컴포지션 still 1장 재확인(워커 sync 가 script.json 을 덮어쓴 상태에서도 동일 렌더) — ID 는 `plateage-ko`(Root.tsx 등록 ID, 컴포넌트명 아님).
- [ ] **Step 3:** 시나리오 매트릭스 1회씩: ① 자막만 수정→render ② 나레이션 수정→full ③ 동일 텍스트+강제 체크→full ④ 워커 꺼진 상태 요청→오프라인 배너 ⑤ 실패 잡(ai-server 끄고 upload 실패)→failed+재시도.

---

## Chunk 4: P4 스티커/효과 라이브러리

### Task 20: 선행 — R2 CORS + 스티커 서비스

**Files:**
- Create: `v4/src/features/marketing/services/reelStickerService.ts`
- Modify: `v4/src/features/marketing/services/aiImageService.ts` (uploadStickerFile 신설)

- [ ] **Step 1 (USER ACTION 안내 포함):** R2 버킷 CORS 설정 — `<Gif>` 가 fetch 디코드라 CORS 필수(Player dev 오리진 `http://localhost:*` + 프로덕션 도메인 + 렌더 헤드리스). Cloudflare 대시보드에서 R2 버킷 CORS policy 에 `AllowedOrigins: ["*"]`(공개 마케팅 에셋 버킷이므로) `AllowedMethods: ["GET"]` 추가하도록 사용자에게 안내하고 확인받는 단계를 플랜 실행 로그에 남길 것.
- [ ] **Step 2: `reelStickerService.ts` + `uploadStickerFile` 신설** — `aiImageService` 에 스티커용 함수가 없고, 이름이 범용적인 `uploadImageFile`/`uploadGeneratedImage` 는 **canvas→WebP 0.9 변환 경로라 절대 사용 금지**(GIF 가 정적 WebP 1프레임이 되는데 kind 는 'gif' 로 기록돼 `<Gif>` 렌더가 깨지는 정확한 실패 경로). 대신:
  - `aiImageService.ts` 에 **`uploadStickerFile(file)` 신설 — `uploadInfographicImage` 패턴 미러(원본 무변환 업로드), folder=`'marketing/reels/stickers'`**(키·URL 은 서버 생성·반환값이 정본).
  - `reelStickerService.ts`: `fetchStickers(category?)`, `createSticker({name, category, file})`(uploadStickerFile 사용), `deleteSticker(id)`(R2 객체는 남김 — 사용 중 참조 보호). 테이블 미존재 에러는 "migration 057 적용 필요" 로 변환(reelJobService friendly 패턴).
  - **업로드 가드**: `file.type` 이 `image/gif` → kind 'gif', `image/png`/`image/webp` → 'image'. **애니메이션 WebP 차단**: webp 는 헤더 바이트에 `ANIM` 청크 존재 시 거부("GIF 로 변환 후 업로드") — `ArrayBuffer` 앞 1KB 검사 유틸 포함.
- [ ] **Step 3: 검증 + Commit** — tsc 0.

```bash
git add v4/src/features/marketing/services/reelStickerService.ts v4/src/features/marketing/services/aiImageService.ts
git commit -m "feat(v4): reel sticker library service + uploadStickerFile (no-conversion, anim-webp guard)"
```

### Task 21: StickerLayer (컴포지션) + anim 프리셋

**Files:**
- Modify: `remotion/src/shorts/_shared/PresenterShort.tsx`
- Create: `remotion/src/shorts/_shared/StickerLayer.tsx`

- [ ] **Step 1: `StickerLayer.tsx`**

```tsx
// 청크 스티커 오버레이 — 전체 캔버스(1080×1920) 분수 좌표, 비율 구간(fromFrac/durFrac), anim 코드 프리셋.
import { Img, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Gif } from "@remotion/gif";
import { asset } from "../../lib/assets";

type Sticker = { id: string; src: string; kind: "image" | "gif"; x: number; y: number; w: number; rot: number; fromFrac: number; durFrac: number | null; anim: "none" | "pop" | "float" | "pulse" | "shake"; loop?: boolean };

export const stickerFrames = (fromFrac: number, durFrac: number | null, durFrames: number) => {
  const from = Math.min(durFrames - 1, Math.max(0, Math.round(fromFrac * durFrames)));
  const dur = durFrac == null ? durFrames - from : Math.max(1, Math.min(durFrames - from, Math.round(durFrac * durFrames)));
  return { from, dur };
};

const One: React.FC<{ s: Sticker; dur: number }> = ({ s, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 11, mass: 0.6 } });
  const op = interpolate(frame, [0, 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    * interpolate(frame, [dur - 6, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  let scale = 1, dy = 0, rot = s.rot;
  if (s.anim === "pop") scale = interpolate(pop, [0, 1], [0.4, 1]);
  if (s.anim === "float") dy = Math.sin((frame / fps) * Math.PI * 1.4) * 12;
  if (s.anim === "pulse") scale = 1 + Math.sin((frame / fps) * Math.PI * 2.2) * 0.05;
  if (s.anim === "shake") rot = s.rot + Math.sin((frame / fps) * Math.PI * 7) * 2;
  const style: React.CSSProperties = {
    position: "absolute", left: `${s.x * 100}%`, top: `${s.y * 100}%`, width: s.w * 1080,
    transform: `translate(-50%,-50%) rotate(${rot}deg) translateY(${dy}px) scale(${scale})`, opacity: op,
  };
  return s.kind === "gif"
    ? <Gif src={asset(s.src)} width={s.w * 1080} style={style} fit="contain" loopBehavior={s.loop === false ? "pause-after-finish" : "loop"} />
    : <Img src={asset(s.src)} style={style} />;
};

export const StickerLayer: React.FC<{ stickers: Sticker[]; durFrames: number }> = ({ stickers, durFrames }) => (
  <>
    {stickers.map((s) => {
      const { from, dur } = stickerFrames(s.fromFrac, s.durFrac, durFrames);
      return (
        <Sequence key={s.id} from={from} durationInFrames={dur} layout="none">
          <One s={s} dur={dur} />
        </Sequence>
      );
    })}
  </>
);
```

- [ ] **Step 2: PresenterShort 장착** — 자막 map 아래에 청크별:

```tsx
      {chunks.map((c, i) => (c.stickers?.length ? (
        <Sequence key={"st" + c.id} from={FROM[i]} durationInFrames={c.durFrames} layout="none">
          <StickerLayer stickers={c.stickers} durFrames={c.durFrames} />
        </Sequence>
      ) : null))}
```
레이어 순서: 인서트 위·인트로/CTA 카드 아래(헤더/자막과 같은 층).

- [ ] **Step 3: 검증** — script.json 에 임시 스티커 1개 수기 추가 → 스튜디오 프리뷰로 pop/float 확인 → 원복. `npx tsc --noEmit` 0.
- [ ] **Step 4: Commit**

```bash
git add remotion/src/shorts/_shared/StickerLayer.tsx remotion/src/shorts/_shared/PresenterShort.tsx
git commit -m "feat(remotion): sticker layer with code-preset animations (pop/float/pulse/shake, gif sync)"
```

### Task 22: 스티커 라이브러리 패널 + 청크 추가

**Files:**
- Create: `v4/src/features/marketing/components/content/reelEditor/StickerLibraryPanel.tsx`
- Modify: `ChunkInspector.tsx`, `ReelEditorPanel.tsx`

- [ ] **Step 1: `StickerLibraryPanel.tsx`** — 인스펙터 하단 아코디언: 검색 input + 카테고리 탭(스티커/이모지) + 썸네일 그리드 + 드래그앤드롭/파일선택 업로드(InfographicAssetsPanel UX 패턴 — 단 **`ImageDropzone` 재사용 시 `upload={uploadStickerFile}` 필수 주입: 기본값이 WebP 변환 함수**). 업로드 안내 한 줄: "GIF 는 드래그앤드롭/파일 선택으로(클립보드 붙여넣기는 브라우저가 PNG 재인코딩 — 애니메이션 소실)". fetch/insert 실패 시 "migration 057 적용 필요" 안내. 항목 클릭 → `onAdd(sticker)`.
- [ ] **Step 2: ChunkInspector 스티커 섹션** — 현재 청크 `stickers` 리스트: 행마다 썸네일·anim 셀렉트(none/pop/float/pulse/shake)·구간(fromFrac/durFrac % 슬라이더 2개, durFrac null="끝까지" 체크)·삭제. `onAdd` = `{ id: crypto.randomUUID(), src, kind, x: 0.5, y: 0.3, w: 0.18, rot: 0, fromFrac: 0, durFrac: null, anim: 'pop' }` 추가. **마지막 청크(CTA 카드가 덮음)와 인트로 구간(첫 청크 0~52f)은 스티커가 카드 아래 레이어라 안 보임** — 마지막 청크 선택 시 섹션 비활성 + "CTA 카드가 덮는 구간" 안내.
- [ ] **Step 3: 검증** — PNG 1장·GIF 1장 업로드 → 청크에 추가 → Player 에서 즉시 표시(GIF 재생 = CORS 통과 확인), 렌더 요청 → 결과 mp4 에 스티커 합성 확인.
- [ ] **Step 4: Commit**

```bash
git add v4/src/features/marketing/components/content/reelEditor/StickerLibraryPanel.tsx v4/src/features/marketing/components/content/reelEditor/ChunkInspector.tsx v4/src/features/marketing/components/content/reelEditor/ReelEditorPanel.tsx
git commit -m "feat(v4): sticker library panel + per-chunk sticker editing"
```

### Task 23: 캔버스 스티커 드래그/스케일

**Files:**
- Modify: `CanvasDragLayer.tsx`

- [ ] **Step 1:** 스티커 핸들 추가 — 본체 드래그 = `pxToCanvasFrac`(전체 캔버스 좌표계 — 라벨과 다름!), 우하단 코너 핸들 드래그 = `w` 조정(`(pointerX - centerX) * 2 / rect.width`), 회전은 인스펙터 숫자 input(-180~180). 라벨과 동일하게 pointerup 1회 commit.
- [ ] **Step 2:** 검증 — 스티커 이동/리사이즈가 미리보기와 1:1, Ctrl+Z 1스텝.
- [ ] **Step 3: Commit**

```bash
git add v4/src/features/marketing/components/content/reelEditor/CanvasDragLayer.tsx
git commit -m "feat(v4): sticker drag/resize on canvas (full-canvas coords)"
```

### Task 24: 마무리 — 문서/메모리 + 최종 검증

- [ ] **Step 1: 최종 검증 매트릭스** — Chunk 3 Task 19 시나리오 + 스티커 포함 렌더 1회. `node --test` 전부 PASS, 양쪽 tsc 0, `cd v4 && npm run build` 통과(정적 i18n 빌드 포함 — CONTENTFLOW env 없으면 블로그 skip 경고는 정상).
- [ ] **Step 2: 문서** — 루트 `CLAUDE.md` 마케팅 섹션에 릴 에디터 항목(1줄 요약 + 상세 memory 포인터), `v4/CLAUDE.md` migration 057, `remotion/out/README.md` 영향 없음 확인. memory `reel_lite_editor.md` 신규(아키텍처·컬럼 소유권·워커 운용법·교훈) + `MEMORY.md` 인덱스 1줄.
- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md v4/CLAUDE.md
git commit -m "docs: reel lite editor - architecture notes + migration 057"
```

---

## 실행 메모

- **⚠️ v4 타입 게이트(Chunk 1 실행 중 발견)**: v4 루트 `npx tsc --noEmit` 는 solution tsconfig(files:[]+references) 라 **0개 파일 검사하는 no-op**. 본 플랜의 모든 "cd v4 && npx tsc --noEmit" 는 **`npx tsc -b --noEmit`** 로 읽을 것(빌드 체인과 동일한 진짜 게이트).
- **순서 의존**: Task 2(asset 리팩터)가 Task 8(시드 — insert URL 화)보다 반드시 먼저. Chunk 간 순차, Chunk 내 태스크도 번호 순.
- **사용자 개입 지점**: ① migration 057 적용(Task 8 전) ② R2 CORS(Task 20) ③ 시드/워커/E2E 실행 시 로컬 ai-server 기동.
- **fallback 트리거**(스펙): Task 4에서 dedupe·optimizeDeps·alias 적용 후에도 Player 런타임 깨질 때만 사본 포팅 전환 — 사소한 tsc 에러는 공유 소스 수정으로 해소.
- **리뷰 포인트**: active 상태는 항상 `REEL_JOB_ACTIVE`/`ACTIVE_STATUSES` 명시 배열 사용(열거 순서 의존 금지).
