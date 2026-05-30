# 태국 홍보 릴스 v2 — "키크는 병원 + 예측키 + 홈페이지 유도" 설계

- 작성일: 2026-05-30
- 대상: 태국 시장(🇹🇭) Instagram Reels (9:16, 1080×1920, 30fps)
- 디렉토리: `remotion/`
- 신규 컴포지션: `HeightReelsTHPromo` (기존 `HeightReelsTH`는 보존)

## 1. 목적

태국 부모를 우리 홈페이지(`dflo-production.up.railway.app`)로 유입시키는 광고용 릴스.
하나의 메시지("무료 예측키 측정")로 클릭을 만들고, 병원 소개와 치료 사례는 그 메시지를
받쳐주는 보조 역할로만 배치한다.

### 퍼널 역할 분리 (핵심 원칙)
- **예측키 측정 = 훅 + 메인 CTA.** 무료·인터랙티브·호기심 자극. 영상의 처음(Hook)과 끝(CTA)을 잡는다.
- **치료 사례 = 증거(proof).** 중간에 짧게. "예측키 결과가 아쉬워도 따라잡을 수 있다"를 증명.
- **클리닉 소개 = 신뢰 도장(trust).** 원장 얼굴 한 컷이면 충분. 길게 소개하지 않는다.

세 가지를 "이것도 되고 저것도 됩니다" 식으로 나열하지 않는다. 셋을 모두 보여주는 건
영상이 아니라 **홈페이지**(하단 탭 프로그램/병원/예상키/사례)의 몫이다.

## 2. 길이 & 구조

총 ≈ 24.5초. 6개 씬, 씬 사이 15프레임 페이드 전환 ×5.

> **길이 결정**: 브레인스토밍 단계에서 ~22초를 목표로 잡았으나, 공유 씬(`InputScene`·
> `ResultScene`는 한국어 릴스 `HeightReels`도 사용)을 speed-hack으로 압축하면 회귀 위험이
> 크다. 대신 씬은 자연 길이를 유지하되 **Sequence 길이를 자연 종료 지점에서 truncate**
> 하는 방식(예: Result는 교육용 자막이 시작되기 전에 끊어 차트+수치만 남김)을 택했고,
> 그 결과 ~24.5초로 안착. 기존 릴스와 동일 길이라 방어 가능한 트레이드오프.

| # | 씬 | 프레임@30fps | 시간 | 재활용 | 핵심 내용 |
|---|----|------|------|--------|----------|
| 1 | **Hook** | 90 | 3.0s | 기존 `HookScene`(그대로) | "ลูกของเราจะสูงเท่าไหร่?" (우리 아이 몇까지 클까?) 호기심 훅, 보라 그라데이션 |
| 2 | **Input** | 150 | 5.0s | 기존 `InputScene`(그대로) | 성별·생일·키 폼이 채워지고 "คำนวณ" 계산 버튼 클릭 |
| 3 | **Result** | 195 | 6.5s | 기존 `ResultScene`(자막 전 truncate) | 예측키 차트 + 18세 예상키 카운트업. 교육용 자막 4종은 잘림(프로모엔 불필요) |
| 4 | **Clinic** ⭐신규 | 105 | 3.5s | 신규 `ClinicScene` | 브릿지("골든타임은 지금") + **원장 얼굴** + "한국 강남 187 성장클리닉 · 10년" |
| 5 | **Cases** ⭐신규 | 150 | 5.0s | 신규 `CasesScene` | **아역배우 바둑판** 줌인 + 익명 "예측키→도달키" 막대 애니메이션 |
| 6 | **CTA** | 120 | 4.0s | 신규 `CtaPromoScene`(기존 `CtaScene` 분기) | 홈페이지 측정(메인) + LINE 상담(보조), `logo_en.png` |

- 합계 프레임: 90+150+195+105+150+120 = 810, 전환 overlap 5×15=75 차감 → **735프레임 = 24.5s**
- `Root.tsx`에 `HeightReelsTHPromo` Composition 추가 (`durationInFrames=735`).
- ⚠️ CTA는 공유 `CtaScene`를 직접 수정하지 않고 **신규 `CtaPromoScene`**로 분기 — 한국어/기존
  태국 릴스의 CTA(로고 `logo.jpg`·카카오)를 깨지 않기 위함.

### 내러티브 아크
호기심(1) → 직접 측정(2~3) → 결과 + "따라잡을 수 있다"(4) → 남의 증거(5) → "너도 홈페이지에서 무료로"(6).
예측키가 처음과 끝을 잡고, 클리닉·사례는 중간에서 받쳐준다.

## 3. 씬별 상세

### Scene 1 — Hook (재활용)
- 기존 `HookScene` 그대로. 태국어 카피는 `texts.ts`의 `th` 로케일 사용.
- 변경 없음. 90프레임 유지.

### Scene 2 — Input (재활용, 그대로)
- 기존 `InputScene`을 수정 없이 사용. 자연 길이 150프레임(폼 채움 → 버튼 클릭 SFX 포함).

### Scene 3 — Result (재활용, Sequence truncate)
- 기존 `ResultScene`을 수정 없이 사용하되 Sequence durationInFrames=195로 설정.
- ResultScene 내부 차트 드로잉(10~80f) + 트래젝토리/카운트업(80~180f) + 최종점(180f~)은
  195f 안에 모두 포함됨. 교육용 자막 4종(`sub1`~`sub4`, 20~340f)은 195f에서 잘려 노출 안 됨
  — 프로모는 "수치+차트"만 필요하므로 의도된 동작.
- 성장 표준: remotion에는 KR LMS만 존재(`remotion/src/data/growthStandard.ts`). 차트는
  마케팅용 예시 곡선이므로 기존 `SAMPLE_*`(KR LMS) 그대로 사용. TSPE 포팅은 범위 밖(§8).

### Scene 4 — Clinic ⭐신규 `ClinicScene`
- **전반(브릿지, ~1.2s)**: 보라 배경에 자막 "예측키가 아쉽다면? 골든타임은 지금."
  (태국어: 신규 `bridgeLine` 키)
- **후반(신뢰, ~2.8s)**: 원장 초상(`director.png`, 원형/라운드 마스크) 페이드인 +
  자막 "한국 강남 187 성장클리닉 · 10년" + 키워드 칩(뼈나이 / 호르몬 / 성장곡선).
- 톤: K-medical 프리미엄. 보라 시그니처 유지.
- 신규 텍스트 키: `clinicBridge`, `clinicName`, `clinicYears`, `clinicChips`(배열).

### Scene 5 — Cases ⭐신규 `CasesScene`
- **아역배우 바둑판**(`actors-grid.jpg`) 한 장을 살짝 줌인(scale 1.0→1.08)하며 페이드인.
  자막은 **방문 인증 톤**: "이런 아이들이 다니는 클리닉" (신규 `casesActorsLine` 키).
  ⚠️ 셀럽 얼굴에 치료효과(몇 cm)를 직접 붙이지 않는다.
- **익명 막대(하단 오버레이, ~2.5s)**: 익명 케이스 3건의 "예측키 → 도달키" 막대가
  위로 자라는 애니메이션(예: 165→178). 이 효과 단정은 **익명 데이터에만** 둔다.
  자막 "예측보다 더 자란 아이들" (신규 `casesBarsLine` 키).
- 규정 분리: 셀럽=방문 인증 / 효과 단정=익명 막대. 두 클레임을 시각적으로 분리.

### Scene 6 — CTA (신규 `CtaPromoScene`, 기존 `CtaScene` 분기)
- 기존 `CtaScene`의 레이아웃/애니메이션 패턴을 복제한 **별도 파일**. 공유 `CtaScene`는 미수정.
- **로고**: `logo_en.png` 사용(태국판 고해상도 영문 워드마크).
- **메인 CTA**: "지금 무료로 측정" + 홈페이지 URL(`WEBSITE_URL`). 영상 약속과 일치.
- **보조 CTA**: LINE 상담 pill — `@894qhqtu`, LINE 그린 `#06C755` 액센트.
- 신규 텍스트 키: `ctaLinePill`(예: "LINE 상담 @894qhqtu").

## 4. 데이터 & 로케일

### 4.1 신규 `LocaleTexts` 키
`texts.ts`의 `LocaleTexts` 인터페이스 + `ko`/`th`에 추가:
```
bridgeLine, clinicBridge, clinicName, clinicYears, clinicChips(string[]),
casesActorsLine, casesBarsLine, ctaLinePill
```
ko는 한국어 원문, th는 태국어 번역. (ja/zh-tw/id 등은 이번 범위 아님.)

### 4.2 성장 표준 (태국)
- remotion 패키지에는 KR LMS만 존재(`remotion/src/data/growthStandard.ts`의
  `calculateHeightPercentileLMS`/`predictAdultHeightLMS`/`heightAtSamePercentile`).
  TSPE(태국)는 v4 앱에만 있고 remotion으로 포팅돼 있지 않다.
- Result 차트는 마케팅용 예시 곡선이므로 기존 `SAMPLE_*`(KR LMS) 그대로 사용.
  차트 캡션은 th 로케일의 `chartSource`("Korea CDC Growth Standards") 유지 — 한국 클리닉
  포지셔닝과 정합.
- TSPE LMS를 remotion으로 포팅하는 작업은 이번 범위 밖(§8). 추후 정확도가 필요하면 별도 작업.

### 4.3 폰트
- 태국어 렌더링을 위해 Thai 글리프 포함 폰트 스택 사용(`fonts.tsx`에 Noto Sans Thai
  이미 로드됨). 신규 씬의 텍스트는 Thai 포함 스택으로 지정.

## 5. 필요 에셋

`remotion/public/images/`에 배치(Remotion은 자체 `public/`만 서빙):
| 파일 | 출처 | 비고 |
|------|------|------|
| `director.png` | `v4/public/first_session/원장님.png` 복사 | 원장 초상 |
| `actors-grid.jpg` | 사용자 제공(동의 완료) | 아역배우 바둑판 1장 |
| `logo_en.png` | `v4/public/images/logo_en.png` 복사 | 태국판 워드마크 |

- 막대 애니메이션 데이터(예측키→도달키 3건)는 합성 수치 — 코드 상수로 둠(사진/실데이터 불필요).

## 6. 규정(의료광고) 가드레일
- 효과 단정("예측보다 더 자랐다")은 **익명 막대**에만 둔다.
- 아역배우 바둑판은 **방문 인증** 톤("이런 아이들이 다니는 클리닉")으로만 사용,
  특정 셀럽에 "우리가 N cm 키웠다" 식 치료효과를 직접 결합하지 않는다.
- 초상권: 바둑판 이미지는 사용 동의 완료된 소재만 사용(사용자 확인됨).

## 7. 렌더 명령 (예정)
```
cd remotion && npx remotion preview
cd remotion && npx remotion render HeightReelsTHPromo out/reels-th-promo.mp4
```
- `remotion/CLAUDE.md`(또는 루트 CLAUDE.md의 Remotion 섹션)에 새 컴포지션/명령 추가.

## 8. 범위 밖 (YAGNI)
- 한국어/베트남어/영어 프로모 버전(이번엔 태국만).
- 실제 환자 사진·실데이터 막대(합성으로 충분).
- 내레이션 음성(자막 기반). 배경음악/SFX는 기존 에셋 범위 내에서만.
- 15초 숏컷 버전(추후 별도).
- **TSPE(태국) LMS를 remotion으로 포팅** — 차트는 예시용이라 KR LMS 샘플로 충분.
- 기존 공유 씬(`HookScene`/`InputScene`/`ResultScene`/`CtaScene`) 내부 로직 수정.

## 9. 확정된 결정 로그
1. 사례 씬: 합성 익명 막대 + 동의된 아역배우 바둑판 하이브리드. ✅
2. 마지막 CTA: 홈페이지 측정(메인) + LINE(보조). ✅
3. 로고/색: `logo_en.png` + 보라 시그니처, 액센트 LINE 그린. ✅
4. 길이: ~22초. ✅
5. 원장 얼굴: Clinic 씬에 포함. ✅
