# 태국 홍보 릴스 v2 (HeightReelsTHPromo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 태국어 예측키 릴스를 확장해, "키크는 병원" 소개(원장 얼굴) + 예측키 측정 + 치료 사례(동의된 아역배우 바둑판 + 익명 막대)를 한 편에 녹여 홈페이지로 유입시키는 24.5초 9:16 Remotion 컴포지션을 만든다.

**Architecture:** 기존 공유 씬(`HookScene`/`InputScene`/`ResultScene`)은 **수정 없이** 재사용하되, 새 컴포지션 `HeightReelsTHPromo`에서 Sequence 길이를 자연 종료 지점에서 truncate한다(Result는 교육용 자막 전에 끊어 차트+수치만). 신규 씬 3개(`ClinicScene`/`CasesScene`/`CtaPromoScene`)는 프로모 전용 파일로 추가해 한국어/기존 태국 릴스 CTA를 깨지 않는다. 카피는 `texts.ts`의 `LocaleTexts`에 프로모 키를 추가해 ko/th 분기.

**Tech Stack:** Remotion 4 (`@remotion/transitions` fade), React 19, TypeScript(strict). 폰트는 `NOTO_SANS_KR`(`'Noto Sans KR','Noto Sans Thai',sans-serif` — 태국어 글리프 폴백 포함). 검증은 시각 컴포넌트 특성상 `npx tsc --noEmit`(타입 게이트) + `npx remotion still`(런타임 렌더 게이트) + 최종 `npx remotion render`.

**검증 방식 주의:** Remotion 시각 씬은 전통적 단위 테스트가 부적합하다. 본 플랜은 (1) 각 신규 씬 작성 후 `npx tsc --noEmit`로 타입/컴파일 게이트, (2) 컴포지션 배선 후 대표 프레임 still 렌더로 런타임 게이트(throw 없이 PNG 산출 + 육안), (3) 최종 mp4 렌더로 통합 검증한다. 모든 명령은 `remotion/` 디렉토리에서 실행한다.

---

## File Structure

| 파일 | 작업 | 책임 |
|------|------|------|
| `remotion/public/images/director.png` | 생성(복사) | 원장 초상 (Clinic 씬) |
| `remotion/public/images/logo_en.png` | 생성(복사) | 태국판 영문 워드마크 (CTA 씬) |
| `remotion/public/images/actors-grid.jpg` | 생성(사용자/플레이스홀더) | 동의된 아역배우 바둑판 (Cases 씬) |
| `remotion/src/lib/constants.ts` | 수정 | `COLORS.lineGreen` 추가 |
| `remotion/src/lib/texts.ts` | 수정 | 프로모 전용 8개 키 (interface + ko + th) |
| `remotion/src/scenes/ClinicScene.tsx` | 생성 | 브릿지 + 원장 신뢰 블록 |
| `remotion/src/scenes/CasesScene.tsx` | 생성 | 아역배우 그리드 + 익명 막대 |
| `remotion/src/scenes/CtaPromoScene.tsx` | 생성 | 홈페이지 메인 + LINE 보조 CTA |
| `remotion/src/HeightReelsTHPromo.tsx` | 생성 | 6씬 TransitionSeries 조립 |
| `remotion/src/Root.tsx` | 수정 | `HeightReelsTHPromo` Composition 등록 |
| `remotion/package.json` | 수정 | `render:th-promo` 스크립트 |
| `CLAUDE.md` (루트) | 수정 | Remotion 섹션에 새 컴포지션/명령 추가 |

---

## Task 1: Foundation — 에셋 + 상수 + 카피 키

**Files:**
- Create(copy): `remotion/public/images/director.png`, `remotion/public/images/logo_en.png`, `remotion/public/images/actors-grid.jpg`
- Modify: `remotion/src/lib/constants.ts` (COLORS 블록)
- Modify: `remotion/src/lib/texts.ts` (interface + ko + th)

- [ ] **Step 1: 에셋 복사 (PowerShell)**

원장 초상과 영문 로고를 remotion public으로 복사한다. (Remotion은 자체 `public/`만 서빙.)

```powershell
Copy-Item "C:\project\dflo\v4\public\first_session\원장님.png" "C:\project\dflo\remotion\public\images\director.png"
Copy-Item "C:\project\dflo\v4\public\images\logo_en.png" "C:\project\dflo\remotion\public\images\logo_en.png"
```

- [ ] **Step 2: 아역배우 바둑판 배치 (또는 플레이스홀더)**

실제 동의된 바둑판 이미지를 `remotion/public/images/actors-grid.jpg`로 둔다. 실 에셋이 아직
없으면 렌더가 깨지지 않도록 임시 플레이스홀더(아무 jpg)를 같은 경로/이름으로 복사한다.

```powershell
# 실 에셋이 준비되면 그 파일을 actors-grid.jpg 로 둔다. 임시 플레이스홀더(개발용):
Copy-Item "C:\project\dflo\v4\public\images\gallery1.jpg" "C:\project\dflo\remotion\public\images\actors-grid.jpg"
```

확인:
```powershell
Get-ChildItem "C:\project\dflo\remotion\public\images" | Select-Object Name
```
Expected: `actors-grid.jpg`, `director.png`, `logo.jpg`, `logo_en.png` 모두 존재.

- [ ] **Step 3: `constants.ts`에 LINE 그린 추가**

`remotion/src/lib/constants.ts`의 `COLORS` 객체에서 Kakao 색 아래에 한 줄 추가.

기존:
```ts
  // Kakao
  kakaoYellow: "#FEE500",
  kakaoBrown: "#3C1E1E",
```
변경 후:
```ts
  // Kakao
  kakaoYellow: "#FEE500",
  kakaoBrown: "#3C1E1E",
  // LINE (Thai messenger)
  lineGreen: "#06C755",
```

- [ ] **Step 4: `texts.ts` interface에 프로모 키 추가**

`LocaleTexts` 인터페이스 맨 끝(`ctaClinic: string;` 다음 줄)에 추가:
```ts
  // Promo reel v2 (Thai) — clinic/cases/CTA
  bridgeLine: string;
  clinicName: string;
  clinicYears: string;
  clinicChips: string[];
  casesActorsLine: string;
  casesBarsLine: string;
  ctaPromoHeading: string;
  ctaLinePill: string;
```

- [ ] **Step 5: `ko` 로케일에 프로모 키 추가**

`ko` 객체의 마지막 필드(`ctaClinic: "187 성장클리닉 · 연세새봄의원",`) 다음 줄에 추가:
```ts
  bridgeLine: "예측키가 아쉽다면? 골든타임은 지금.",
  clinicName: "187 성장클리닉 · 연세새봄",
  clinicYears: "한국 강남 · 10년 성장 진료",
  clinicChips: ["뼈나이", "호르몬", "성장곡선"],
  casesActorsLine: "이런 아이들이 다니는 클리닉",
  casesBarsLine: "예측보다 더 자란 아이들",
  ctaPromoHeading: "지금 무료로\n예상키 측정",
  ctaLinePill: "LINE 상담 @894qhqtu",
```

- [ ] **Step 6: `th` 로케일에 프로모 키 추가**

`th` 객체의 마지막 필드(`ctaClinic: "187 Growth Clinic · Yonsei Saebom",`) 다음 줄에 추가:
```ts
  bridgeLine: "อยากให้ลูกสูงกว่านี้? ช่วงเวลาทองคือตอนนี้",
  clinicName: "187 Growth Clinic · Yonsei Saebom",
  clinicYears: "คลินิกเพิ่มความสูง กังนัม เกาหลี · 10 ปี",
  clinicChips: ["อายุกระดูก", "ฮอร์โมน", "กราฟการเจริญเติบโต"],
  casesActorsLine: "เด็กๆ เหล่านี้ก็มาที่คลินิกของเรา",
  casesBarsLine: "เด็กที่สูงเกินกว่าที่คาดการณ์",
  ctaPromoHeading: "วัดส่วนสูงฟรี\nตอนนี้เลย",
  ctaLinePill: "ปรึกษาผ่าน LINE @894qhqtu",
```

- [ ] **Step 7: 타입 게이트**

Run: `npx tsc --noEmit`
Expected: 에러 없이 종료(exit 0). (신규 키가 ko/th 양쪽에 다 있어야 통과.)

- [ ] **Step 8: 커밋**

```bash
git add remotion/public/images/director.png remotion/public/images/logo_en.png remotion/public/images/actors-grid.jpg remotion/src/lib/constants.ts remotion/src/lib/texts.ts
git commit -m "feat(remotion): 태국 프로모 릴스용 에셋·LINE 색·프로모 카피 키 추가"
```

---

## Task 2: ClinicScene — 브릿지 + 원장 신뢰 블록

**Files:**
- Create: `remotion/src/scenes/ClinicScene.tsx`

- [ ] **Step 1: `ClinicScene.tsx` 작성**

```tsx
// Promo Scene 4: Bridge line + clinic trust (director portrait)
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS } from "../lib/constants";
import { ensureFonts, NOTO_SANS_KR } from "../lib/fonts";
import { t } from "../lib/texts";

ensureFonts();

const PURPLE_BG =
  "linear-gradient(180deg, #667eea 0%, #764ba2 60%, #5b3a8c 100%)";
const TRUST_DELAY = 42;

export const ClinicScene: React.FC = () => {
  const L = t();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Bridge line: fade in 0-12, hold, fade out 35-48
  const bridgeOpacity = interpolate(frame, [0, 12, 35, 48], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Trust block reveal
  const portraitSpring =
    frame >= TRUST_DELAY
      ? spring({ frame: frame - TRUST_DELAY, fps, config: { damping: 14 } })
      : 0;

  const reveal = (delay: number) => {
    const p = interpolate(
      frame,
      [TRUST_DELAY + delay, TRUST_DELAY + delay + 12],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    return { opacity: p, transform: `translateY(${(1 - p) * 24}px)` };
  };

  return (
    <AbsoluteFill style={{ background: PURPLE_BG }}>
      {/* Trust block */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          padding: "0 80px",
        }}
      >
        <div
          style={{
            transform: `scale(${portraitSpring})`,
            width: 360,
            height: 360,
            borderRadius: "50%",
            overflow: "hidden",
            border: `6px solid ${COLORS.whiteAlpha80}`,
            boxShadow: "0 16px 50px rgba(0,0,0,0.35)",
          }}
        >
          <Img
            src={staticFile("images/director.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <span
          style={{
            ...reveal(8),
            fontFamily: NOTO_SANS_KR,
            fontSize: 46,
            fontWeight: 900,
            color: COLORS.white,
            textAlign: "center",
          }}
        >
          {L.clinicName}
        </span>

        <span
          style={{
            ...reveal(14),
            fontFamily: NOTO_SANS_KR,
            fontSize: 26,
            fontWeight: 500,
            color: COLORS.whiteAlpha80,
            textAlign: "center",
          }}
        >
          {L.clinicYears}
        </span>

        <div style={{ ...reveal(20), display: "flex", gap: 12 }}>
          {L.clinicChips.map((chip) => (
            <span
              key={chip}
              style={{
                fontFamily: NOTO_SANS_KR,
                fontSize: 22,
                fontWeight: 600,
                color: COLORS.white,
                backgroundColor: COLORS.whiteAlpha15,
                borderRadius: 50,
                padding: "10px 24px",
              }}
            >
              {chip}
            </span>
          ))}
        </div>
      </AbsoluteFill>

      {/* Bridge line overlay (covers trust block while visible) */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 80px",
          opacity: bridgeOpacity,
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 52,
            fontWeight: 800,
            color: COLORS.white,
            textAlign: "center",
            lineHeight: 1.3,
            textShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}
        >
          {L.bridgeLine}
        </span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

타이밍 노트: 브릿지 0~48f(페이드아웃), 신뢰 블록 42f부터 등장(칩까지 42+20+12=74f 완성),
105f까지 유지. 두 구간이 42~48f에서 크로스페이드.

- [ ] **Step 2: 타입 게이트**

Run: `npx tsc --noEmit`
Expected: exit 0, 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add remotion/src/scenes/ClinicScene.tsx
git commit -m "feat(remotion): ClinicScene — 브릿지 + 원장 신뢰 블록(프로모)"
```

---

## Task 3: CasesScene — 아역배우 그리드 + 익명 막대

**Files:**
- Create: `remotion/src/scenes/CasesScene.tsx`

규정 분리 원칙: 아역배우 그리드에는 **방문 인증 카피만**(`casesActorsLine`). 효과 단정
숫자(예측→도달)는 **익명 막대 패널에만** 둔다. 셀럽 얼굴에 cm 수치를 직접 붙이지 않는다.

- [ ] **Step 1: `CasesScene.tsx` 작성**

```tsx
// Promo Scene 5: Child-actor proof grid (visit) + anonymized predicted->reached bars
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { COLORS } from "../lib/constants";
import { ensureFonts, NOTO_SANS_KR, INTER } from "../lib/fonts";
import { t } from "../lib/texts";

ensureFonts();

// Anonymized synthetic cases (predicted adult height -> reached). Marketing illustration only.
const CASES = [
  { predicted: 165, reached: 178 },
  { predicted: 158, reached: 171 },
  { predicted: 170, reached: 181 },
];
const BARS_DELAY = 60;
const BAR_MIN = 140;
const BAR_MAX = 190;

export const CasesScene: React.FC = () => {
  const L = t();
  const frame = useCurrentFrame();

  const gridOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const gridScale = interpolate(frame, [0, 150], [1.0, 1.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const capOpacity = interpolate(frame, [8, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const panelY = interpolate(
    frame,
    [BARS_DELAY - 12, BARS_DELAY + 6],
    [400, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.tealDarkest }}>
      {/* Actors grid (top) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1080,
          overflow: "hidden",
          opacity: gridOpacity,
        }}
      >
        <Img
          src={staticFile("images/actors-grid.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${gridScale})`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 40%, rgba(26,58,50,0.92) 100%)",
          }}
        />
      </div>

      {/* Visit-proof caption (no efficacy numbers near faces) */}
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: capOpacity,
        }}
      >
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 28,
            fontWeight: 700,
            color: COLORS.white,
            backgroundColor: "rgba(0,0,0,0.55)",
            borderRadius: 50,
            padding: "14px 32px",
          }}
        >
          {L.casesActorsLine}
        </span>
      </div>

      {/* Anonymous bars panel (efficacy claim isolated here) */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: COLORS.white,
          borderRadius: "32px 32px 0 0",
          padding: "32px 48px 56px",
          transform: `translateY(${panelY}px)`,
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 30,
            fontWeight: 800,
            color: COLORS.gray900,
            textAlign: "center",
          }}
        >
          {L.casesBarsLine}
        </span>

        {CASES.map((c, i) => {
          const start = BARS_DELAY + 10 + i * 14;
          const grow = interpolate(frame, [start, start + 40], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const current = c.predicted + (c.reached - c.predicted) * grow;
          const predPct = ((c.predicted - BAR_MIN) / (BAR_MAX - BAR_MIN)) * 100;
          const curPct = ((current - BAR_MIN) / (BAR_MAX - BAR_MIN)) * 100;
          return (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", gap: 16 }}
            >
              <div
                style={{
                  position: "relative",
                  flex: 1,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: COLORS.gray100,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${curPct}%`,
                    background: `linear-gradient(90deg, ${COLORS.teal} 0%, ${COLORS.accent} 100%)`,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: `${predPct}%`,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    backgroundColor: COLORS.gray500,
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: INTER,
                  fontSize: 28,
                  fontWeight: 900,
                  color: COLORS.teal,
                  width: 150,
                  textAlign: "right",
                }}
              >
                {c.predicted} → {current.toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
```

타이밍 노트: 그리드 0f 페이드+줌, 캡션 8~22f, 막대 패널 48f 슬라이드업, 막대 60~138f 성장,
150f까지 유지.

- [ ] **Step 2: 타입 게이트**

Run: `npx tsc --noEmit`
Expected: exit 0, 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add remotion/src/scenes/CasesScene.tsx
git commit -m "feat(remotion): CasesScene — 아역배우 방문 인증 그리드 + 익명 예측→도달 막대"
```

---

## Task 4: CtaPromoScene — 홈페이지 메인 + LINE 보조 CTA

**Files:**
- Create: `remotion/src/scenes/CtaPromoScene.tsx`

- [ ] **Step 1: `CtaPromoScene.tsx` 작성**

기존 `CtaScene`의 `item(delay)` 스프링 패턴을 복제하되, 로고는 `logo_en.png`,
메인은 홈페이지 측정, 보조는 LINE pill.

```tsx
// Promo Scene 6: CTA — homepage primary + LINE secondary (Thai)
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import { COLORS, WEBSITE_URL } from "../lib/constants";
import { ensureFonts, NOTO_SANS_KR, INTER } from "../lib/fonts";
import { t } from "../lib/texts";

ensureFonts();

const PURPLE_BG =
  "linear-gradient(180deg, #667eea 0%, #764ba2 60%, #5b3a8c 100%)";

export const CtaPromoScene: React.FC = () => {
  const L = t();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const item = (delay: number) => {
    const p = spring({ frame, fps, delay, config: { damping: 200 } });
    return { transform: `translateY(${(1 - p) * 60}px)`, opacity: p };
  };

  return (
    <AbsoluteFill
      style={{
        background: PURPLE_BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 30,
        padding: "0 80px",
      }}
    >
      {/* English wordmark logo */}
      <div style={{ ...item(0) }}>
        <div
          style={{
            backgroundColor: COLORS.white,
            borderRadius: 24,
            padding: "22px 30px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
          }}
        >
          <Img
            src={staticFile("images/logo_en.png")}
            style={{
              width: 380,
              height: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      </div>

      {/* Heading */}
      <div style={{ ...item(8), textAlign: "center" }}>
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 52,
            fontWeight: 900,
            color: COLORS.white,
            lineHeight: 1.3,
            whiteSpace: "pre-line",
          }}
        >
          {L.ctaPromoHeading}
        </span>
      </div>

      {/* Primary CTA: homepage measure */}
      <div
        style={{
          ...item(16),
          backgroundColor: COLORS.white,
          borderRadius: 20,
          padding: "20px 48px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        }}
      >
        <span style={{ fontSize: 22 }}>📐</span>
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 24,
            fontWeight: 800,
            color: COLORS.teal,
          }}
        >
          {L.ctaButton}
        </span>
      </div>

      {/* Homepage URL */}
      <div
        style={{
          ...item(22),
          backgroundColor: COLORS.whiteAlpha15,
          borderRadius: 16,
          padding: "12px 32px",
        }}
      >
        <span
          style={{
            fontFamily: INTER,
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.whiteAlpha80,
          }}
        >
          {WEBSITE_URL}
        </span>
      </div>

      {/* Secondary CTA: LINE pill */}
      <div
        style={{
          ...item(28),
          backgroundColor: COLORS.lineGreen,
          borderRadius: 50,
          padding: "14px 32px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxShadow: "0 8px 24px rgba(6,199,85,0.35)",
        }}
      >
        <span style={{ fontSize: 20 }}>💬</span>
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.white,
          }}
        >
          {L.ctaLinePill}
        </span>
      </div>

      {/* Clinic subtext */}
      <div style={{ ...item(34) }}>
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 20,
            color: COLORS.whiteAlpha65,
          }}
        >
          {L.ctaClinic}
        </span>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: 타입 게이트**

Run: `npx tsc --noEmit`
Expected: exit 0, 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add remotion/src/scenes/CtaPromoScene.tsx
git commit -m "feat(remotion): CtaPromoScene — 홈페이지 메인 + LINE 보조 CTA(태국)"
```

---

## Task 5: 컴포지션 조립 + Root 등록 + 런타임 검증

**Files:**
- Create: `remotion/src/HeightReelsTHPromo.tsx`
- Modify: `remotion/src/Root.tsx`

- [ ] **Step 1: `HeightReelsTHPromo.tsx` 작성**

```tsx
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { HookScene } from "./scenes/HookScene";
import { InputScene } from "./scenes/InputScene";
import { ResultScene } from "./scenes/ResultScene";
import { ClinicScene } from "./scenes/ClinicScene";
import { CasesScene } from "./scenes/CasesScene";
import { CtaPromoScene } from "./scenes/CtaPromoScene";
import { setLocale } from "./lib/texts";

// Thai locale before render
setLocale("th");

const T = 15;

export const HeightReelsTHPromo: React.FC = () => {
  setLocale("th");

  return (
    <AbsoluteFill>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={90}>
          <HookScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={150}>
          <InputScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={195}>
          <ResultScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={105}>
          <ClinicScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={150}>
          <CasesScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={120}>
          <CtaPromoScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
```

길이 검증: 90+150+195+105+150+120 = 810, 전환 5×15=75 차감 → **735프레임 = 24.5s**.

- [ ] **Step 2: `Root.tsx`에 컴포지션 등록**

기존 import 블록에 추가:
```tsx
import { HeightReelsTHPromo } from "./HeightReelsTHPromo";
```

기존 `HeightReelsTH` Composition 블록 다음(닫는 `</>` 직전)에 추가:
```tsx
      <Composition
        id="HeightReelsTHPromo"
        component={HeightReelsTHPromo}
        durationInFrames={735}
        fps={30}
        width={1080}
        height={1920}
      />
```

- [ ] **Step 3: 컴포지션 등록 확인(컴파일 게이트)**

Run: `npx remotion compositions`
Expected: 출력 목록에 `HeightReelsTHPromo` 가 포함됨(번들 성공 = import/타입 OK).

- [ ] **Step 4: 씬별 대표 프레임 still 렌더(런타임 게이트)**

각 씬 타임라인 대표 프레임(전환 15f overlap 반영: Hook 0-90, Input 75-225, Result 210-405,
Clinic 390-495, Cases 480-630, Cta 615-735)을 still로 렌더한다.

```bash
npx remotion still HeightReelsTHPromo out/still-hook.png --frame=45
npx remotion still HeightReelsTHPromo out/still-input.png --frame=150
npx remotion still HeightReelsTHPromo out/still-result.png --frame=300
npx remotion still HeightReelsTHPromo out/still-clinic.png --frame=450
npx remotion still HeightReelsTHPromo out/still-cases.png --frame=560
npx remotion still HeightReelsTHPromo out/still-cta.png --frame=690
```
Expected: 6개 PNG가 throw 없이 생성됨.

- [ ] **Step 5: 육안 검증**

6개 PNG를 열어 확인:
- `still-clinic.png`: 원장 초상(원형) + "187 Growth Clinic..." + 칩 3개(태국어), 한국어 텍스트 없음.
- `still-cases.png`: 상단 아역배우 그리드(또는 플레이스홀더) + 방문 인증 캡션, 하단 막대 3개 + "165 → …" 숫자. 셀럽 얼굴 근처에 cm 수치 없음.
- `still-cta.png`: `logo_en.png` 워드마크 + 태국어 헤딩 + 홈페이지 URL + 초록 LINE pill.
- `still-result.png`: 차트 + 큰 예상키 수치(교육용 자막 없음).
- 모든 태국어 글리프가 깨지지 않고 렌더됨(폰트 폴백 정상).

문제 발견 시 해당 씬 소스를 수정하고 Step 4부터 재실행.

- [ ] **Step 6: 커밋**

```bash
git add remotion/src/HeightReelsTHPromo.tsx remotion/src/Root.tsx
git commit -m "feat(remotion): HeightReelsTHPromo 컴포지션 조립 + Root 등록(735f/24.5s)"
```

---

## Task 6: 최종 렌더 + 스크립트 + 문서

**Files:**
- Modify: `remotion/package.json` (scripts)
- Modify: `CLAUDE.md` (루트, Remotion 섹션)

- [ ] **Step 1: 최종 mp4 렌더(통합 검증)**

```bash
npx remotion render HeightReelsTHPromo out/reels-th-promo.mp4
```
Expected: `out/reels-th-promo.mp4`(24.5초, 1080×1920) 생성, 에러 없음. 재생해 6씬 흐름·전환·
오디오(클릭/딩/whoosh) 정상 확인.

- [ ] **Step 2: `package.json`에 렌더 스크립트 추가**

기존:
```json
    "render": "remotion render HeightReels out/reels.mp4",
    "build": "remotion render HeightReels out/reels.mp4"
```
변경 후(`build` 다음에 추가):
```json
    "render": "remotion render HeightReels out/reels.mp4",
    "render:th": "remotion render HeightReelsTH out/reels-th.mp4",
    "render:th-promo": "remotion render HeightReelsTHPromo out/reels-th-promo.mp4",
    "build": "remotion render HeightReels out/reels.mp4"
```

- [ ] **Step 3: 루트 `CLAUDE.md` Remotion 섹션 갱신**

`## Remotion (Instagram Reels)` 섹션의 Compositions 줄을 갱신:

기존:
```
- **Compositions**: `HeightReels` (한국어), `HeightReelsTH` (태국어)
```
변경 후:
```
- **Compositions**: `HeightReels` (한국어), `HeightReelsTH` (태국어 예측키 데모), `HeightReelsTHPromo` (태국어 병원 홍보 — 예측키+원장 신뢰+아역배우 사례+홈페이지/LINE CTA, 24.5초)
```

그리고 Commands 블록에 한 줄 추가:
```
  cd remotion && npx remotion render HeightReelsTHPromo out/reels-th-promo.mp4 # Thai promo
```

- [ ] **Step 4: 커밋**

```bash
git add remotion/package.json CLAUDE.md
git commit -m "docs(remotion): 태국 프로모 릴스 렌더 스크립트 + CLAUDE.md 컴포지션 문서화"
```

---

## Self-Review (작성자 점검 결과)

**1. 스펙 커버리지**
- §2 6씬 구조 → Task 5 컴포지션(정확한 frame 수 일치: 90/150/195/105/150/120). ✅
- §3 Scene 1~3 재활용(미수정) → Task 5에서 Sequence 길이만 지정. ✅
- §3 Scene 4 Clinic(브릿지+원장+칩) → Task 2. ✅
- §3 Scene 5 Cases(그리드+익명 막대, 규정 분리) → Task 3. ✅
- §3 Scene 6 CtaPromo(logo_en+홈페이지+LINE) → Task 4. ✅
- §4.1 신규 8키 → Task 1 Step 4~6. ✅
- §4.2 KR LMS 그대로(TSPE 미포팅) → ResultScene 미수정으로 자동 충족. ✅
- §5 에셋 3종 → Task 1 Step 1~2. ✅
- §6 규정 가드레일 → Task 3 분리 구현 + Task 5 Step 5 육안 체크. ✅
- §7 렌더 명령 → Task 6. ✅

**2. 플레이스홀더 스캔:** 모든 코드 스텝에 완전한 코드 포함, "TBD/추후" 없음. ✅

**3. 타입 일관성:** 신규 키(`bridgeLine`/`clinicName`/`clinicYears`/`clinicChips`(string[])/
`casesActorsLine`/`casesBarsLine`/`ctaPromoHeading`/`ctaLinePill`)가 interface·ko·th·각 씬
사용처에서 동일 철자. `COLORS.lineGreen`은 Task 1에서 정의 후 Task 4에서 사용. `clinicChips`만
배열, 나머지 문자열 — ClinicScene에서 `.map` 사용 일치. ✅
