# 프로그램 이미지 폴더 정리 — 설계

- 날짜: 2026-06-02
- 대상: `v4/public/programs/images/` + i18n 빌드 파이프라인
- 동기: 한국어 이미지가 prefix 없는 루트에 섞여 있고, 정적 프로그램 페이지(폐기 예정) 전용 orphan 이미지가 다수, 공통/언어별 이미지가 구분 없이 모든 언어 폴더에 중복 복사되어 있어 유지보수가 혼란스러움.

## 배경 (현재 상태)

이미지 소비처가 두 종류이고 서로 다른 이미지 세트를 쓴다.

| 소비처 | 경로 | 다국어 | 세대 |
|---|---|---|---|
| A. i18n 랜딩 (`i18n/template/index.html` → ko/th/vi/en) | 절대경로 `/programs/images/{slug}/`, 빌드가 비한국어에 `{lang}/` swap | ✅ | Phase 27/28 리뉴얼 최신 |
| B. 정적 프로그램 상세 (`public/programs/*.html` 8개) | 상대경로 `images/{slug}/` | ❌ ko 전용 | 구버전 (medal-panel·solution-diagram·feature-1~7 등 A가 버린 이미지 참조) |

- B 8개 페이지로 가는 링크는 코드에 없음(라우터는 `/program/:slug` React `ProgramDetailPage`로 감). 배너 어드민 cta_target 수동 지정만 가능 → **폐기 결정**.
- 루트 `programs/images/{slug}/`(한국어)를 A·B가 동시에 봄.
- th 폴더는 거의 완비(번역 일부), en/vi는 `compare-1vs6.webp` 1개씩만 있고 사실상 빈 폴더 → swap 시 404 위험.

### 객관적 분류 근거 (루트 vs th 바이트 비교)
- **SAME (th == ko) = 64개** → 단순 복사 = 언어무관 공통
- **DIFF (th != ko) = 12개** → 실제 번역됨 = 언어별
- **ROOTONLY (th 없음) = 3개** (`obesity/body-bmi`, `precocious/chart`, `late-growth/growth-chart`) → 차트류, th 미제작

## 결정 사항

1. 정적 B 페이지(`public/programs/*.html` 8개) 폐기.
2. A(i18n 랜딩) 화이트리스트 49개만 생존, 나머지(orphan 30개) 삭제.
3. 폴더를 `_common`(공통) + `{lang}`(언어별)로 재편.
4. 빌드 swap을 1단계 fallback 해석으로 교체(언어 폴더 우선 → 없으면 `_common` 한국어본) → en/vi 미번역 시 한국어본 자동 노출(404 차단).

## A 화이트리스트 (실사용 49개)

동적 `{{#each}}` 배열 길이는 `i18n/locales/ko.yml` 기준.

- **growth-hormone-balance** (11): `hero`, `golden-time`, `compare-1vs6.webp`, `process-grid`, `director`, `need-1`~`need-6`
- **obesity-growth** (15): `body-bmi`, `waffle-photo`, `fat-cell`, `risk-1`~`4`, `cause-1`~`4`, `life-1`~`4`
- **precocious-puberty** (9): `chart`, `height-boy`, `arrow-illust`, `cause-1`~`6`
- **body-proportion** (2): `ratio`, `comparison`
- **feet-care** (5): `back`, `problem-1`~`4`
- **posture-exercise** (2): `equipment-main`, `equipment-row`
- **late-growth** (5): `growth-chart`, `card-1`~`4`

화이트리스트에 없는 루트 파일 = orphan = 삭제:
- ghb: `feature-1`~`7`, `medal-panel`, `solution-diagram` (9)
- obesity: `covid-chart`, `director`, `hero`, `percentile`, `process-grid` (5)
- precocious: `director`, `hero`, `life-1`~`4`, `process-grid` (7)
- late-growth: `director`, `hero`, `process-grid`, `thinking-couple` (4)
- body-proportion: `director`, `hero`, `process-grid` (3)
- feet-care: `hero` (1)
- posture-exercise: `hero` (1)

## 목표 폴더 구조

```
programs/images/
  _common/{slug}/...   # 공통 = 한국어 기본본 (화이트리스트 49개 전부 여기로)
  th/{slug}/...        # 태국어 번역 오버라이드만 (DIFF의 th본 7개)
  vi/  en/             # 추후 번역 시 채움 (지금은 비움)
```

핵심: **`_common` = 한국어 기본본**(= 모든 언어의 fallback). 언어 폴더(`th`/`vi`/`en`)에는 **번역된 것만** 둔다. 별도 `ko/` 폴더 없음 — 한국어 빌드는 언어 폴더가 비어 있으니 항상 `_common`을 본다.

### 분류 규칙 (화이트리스트 49개에만 적용)
- **화이트리스트 49개 전부 → `_common/{slug}/`** (루트 한국어본을 이동). SAME/DIFF/ROOTONLY 구분 없이 한국어본은 모두 `_common`이 기본값.
- **번역 오버라이드 → `th/{slug}/`**: 기존 th 폴더에서 실제 번역된(DIFF) 7개만 이동. 나머지 th(루트와 동일한 복사본)는 폐기.
- **예외 — `need-1`~`need-6`**: th에서 4·6만 DIFF지만 한 세트이고 곧 CHECK 섹션 아이콘 리뉴얼로 전부 텍스트 없는 아이콘으로 교체 예정 → **6개 전부 `_common`만**, th의 need-4/need-6 변형본은 폐기.

분류 결과(요약):
- `_common`(49개): ghb(`hero`,`golden-time`,`compare-1vs6.webp`,`process-grid`,`director`,`need-1`~`6`), obesity(`body-bmi`,`waffle-photo`,`fat-cell`,`risk-1`~`4`,`cause-1`~`4`,`life-1`~`4`), precocious(`chart`,`height-boy`,`arrow-illust`,`cause-1`~`6`), body-proportion(`ratio`,`comparison`), feet-care(`back`,`problem-1`~`4`), posture(`equipment-main`,`equipment-row`), late(`growth-chart`,`card-1`~`4`)
- `th` 오버라이드(7개, 진짜 태국어 번역본): ghb(`golden-time`,`director`,`process-grid`), obesity(`fat-cell`), precocious(`arrow-illust`), body-proportion(`ratio`,`comparison`)
- `vi`/`en`: 지금은 빈 폴더 → 전 항목 `_common`(한국어본) fallback.

**주의 — `compare-1vs6.webp`**: th/vi/en 폴더에 byte-DIFF 사본이 있지만 번역본이 아니라 **옛 한국어 사본**(Phase 27 잔재). 루트본은 Task 1에서 새 통합성장 이미지로 교체됨 → `_common`에는 새 한국어본만 두고, **th/vi/en의 옛 사본은 삭제**(번역 들어오면 그때 채움).

**주의 — th 스트레이 파일**: `th/obesity-growth/cause-1.png`(2.8MB)는 webp 변환 전 원본 잔재 → 삭제([[feedback_delete_png_after_convert]]).

## 빌드 로직 변경

현재 `build-i18n.mjs` 후처리: 비한국어일 때 `/programs/images/` → `/programs/images/{lang}/` 단순 치환, 한국어는 루트 그대로.

신규: 모든 언어(ko 포함)에 대해 각 `/programs/images/{slug}/{file}` 참조를 **1단계 fallback**으로 해석 — 언어 폴더에 있으면 그걸, 없으면 `_common`(한국어 기본본).

```
resolve(lang, slug, file):
  if exists(`{lang}/{slug}/{file}`)   → `/programs/images/{lang}/{slug}/{file}`   # 번역본 우선
  elif exists(`_common/{slug}/{file}`)→ `/programs/images/_common/{slug}/{file}`  # 한국어 기본본
  else → 빌드 경고 (누락 표면화)
```

- ko 빌드: `ko/` 폴더 없음 → 항상 `_common`(한국어본).
- th 빌드: 번역된 7개는 `th/`에 있으니 사용, 나머지는 `_common`(한국어본).
- vi/en 빌드: 폴더 비어 있으니 전부 `_common`(한국어본) → 404 차단.

구현 메모:
- 치환은 정규식으로 `src="/programs/images/{slug}/{file}"` 매칭 후 위 resolve 적용.
- 동적 `need-{{@index1}}` 등은 렌더 후(=실제 파일명이 박힌 HTML) 후처리 단계에서 치환되므로 정상 처리됨.
- `compare-1vs6.webp` 같은 비-jpg 확장자도 포함하도록 확장자 화이트리스트(jpg/jpeg/png/webp) 유지.

## 범위 밖 (이번 작업에서 건드리지 않음)
- `/images/logo.jpg` ↔ `logo_en.png` (programs/images 밖, 별도 런타임 분기 로직).
- CHECK 섹션 need 아이콘 → 이모티콘+텍스트 리스트 리뉴얼 (이미지 수령 후 별도 작업; 폴더상 need는 `_common`에 자리만 잡아둠).
- React `ProgramDetailPage`(`/program/:slug`)와 `programs.ts` (정적 B와 무관, 유지).

## 검증 계획
- 정리 후 `cd v4 && npm run build:i18n` → 빌드 경고 0(누락 없음) 확인.
- `public/{ko,th,vi,en}/index.html`의 모든 `programs/images` src가 실제 존재 파일을 가리키는지 grep + existsSync 점검 스크립트.
- ko/th는 기존과 동일 이미지, vi/en은 한국어본 fallback이 뜨는지 확인.
- sitemap/hreflang 영향 없음(이미지 경로만 변경).

## 롤백
- 모든 삭제 파일은 git tracked → `git checkout`으로 복구 가능.
- 폴더 이동·빌드 변경을 한 커밋으로 묶어 되돌리기 쉽게 함.
