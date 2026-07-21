# v4 Frontend Guide

## Project Structure (src/)
```
app/              # App.tsx, router.tsx
stores/           # Zustand stores (authStore, childrenStore, uiStore)
shared/
  components/     # Layout, BottomNav, Modal, Card, Toast, ChildSelector,
                  # LoadingSpinner, GenderIcon, GrowthChart, MeasurementTable,
                  # SwipeableSection
  lib/            # supabase.ts, logger.ts, storage.ts
  types/          # All TypeScript interfaces (index.ts)
  utils/          # age.ts, growth.ts, date.ts, gender.ts, image.ts
  data/           # growthStandard.ts (WHO LMS data)
  services/       # aiService.ts (client-side AI proxy)
features/
  auth/           # LoginPage, ProtectedRoute, AdminRoute
  children/       # ChildFormModal (+ desired_height field), childrenService
  growth/         # measurementService (hospital_measurements CRUD)
  hospital/       # services/ visitService, hospitalMeasurementService (+upsert),
                  #   medicationService, labTestService, prescriptionService,
                  #   intakeSurveyService (updateChildField, updateIntakeSurvey)
                  # components/ VisitList (inline inputs, collapsible rail, lab upload),
                  #   XrayPanel (atlas matching, drag/paste/pick, editable BA, predicted adult),
                  #   AdminPatientGrowthChart (BA+CA dual projection, per-visit highlight),
                  #   VisitsTimeline, VisitForm, MeasurementEditor,
                  #   LifestyleSummary, LabTestsBlock, AllergyLabEditor,
                  #   FreeformLabEditor, MedicationPicker, PrescriptionsBlock
                  # components/intake/ IntakeSurveyPanel (기본 정보 tab root),
                  #   IntakeBasicInfoSection, IntakeGrowthHistoryTable (TSV paste),
                  #   IntakeFamilySection, IntakeMedicalSection, IntakeCausesSection
  bone-age/       # lib/ types, atlas, matcher, growthPrediction, growthStandard
                  # components/ PatientForm, XrayUpload, XrayPreview, MatchResultView,
                  #   BoneAgeInput, PredictionResult, BoneAgeChart, BoneAgeTool
                  # services/ xrayReadingService (+fetchVisitIdsWithXray)
  routine/        # routineService, CalendarView, GrowthModalContent
                  # Cards: SleepCard, MealCard, ExerciseCard, SupplementCard
  content/        # contentService, useHomeContent hook
                  # SwipeCards: GrowthGuideSwipeCard, RecipeSwipeCard, GrowthCaseSwipeCard
                  # Details: RecipeDetail, CaseDetail, GuideDetail, CasePredictionBadge
  meal/           # MealCard, MealAnalysisSection, mealService
  exercise/       # ExerciseCard, YouTubeModal, exercises data
  admin/          # AdminLayout, ImageUploader, adminService (+fetchRegionDistribution)
                  # components/ PatientDistributionMap (17 시도 타일 카토그램 + 서울 구 bar chart)
                  # utils/ region.ts (주소 → Region 파서, 99.6% 커버리지)
  website/        # Public hospital website (연세새봄의원 리뉴얼)
    components/   # HeroBanner, WebsiteHeader/Footer/Layout, WebsiteSlider,
                  # HeroSection, TrustStats, HeightCalculator/Result,
                  # ProgramSlider, GrowthGuideSlider, RecipeSlider, ExerciseSlider,
                  # CaseSlider, CaseDetailModal, YouTubeModal,
                  # InfoModal, AboutModal, FloatingButtons, LocationModal, HoursModal
    pages/        # WebsiteHomePage, ProgramDetailPage, AdminBannerPage
    data/         # programs.ts (7 growth programs)
    assets/       # Hospital images
pages/            # HomePage, RoutinePage, BodyAnalysisPage, InfoPage
  admin/          # AdminDashboardPage, AdminPatientsPage, AdminPatientDetailPage,
                  # AdminVisitNewPage, AdminVisitDetailPage, AdminBoneAgePage,
                  # AdminMedicationsPage, AdminImportPage
scripts/
  create_admin.mjs, setup_storage.mjs, upload_growth_cases.mjs
  migrations/     # 000_initial_schema.sql, 001_permissive_clinical_writes.sql,
                  #   002_add_desired_height.sql + README
  seeds/          # seed_treatment_cases.sql (7 patients, 48 visits),
                  #   seed_xray_atlas_matches.sql (47 xray readings)
```

## Database Tables

### Identity
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `users` | id, email, name, phone, role, password | role: 'parent' \| 'doctor' \| 'admin' |
| `children` | id, parent_id, name, gender, birth_date, father_height, mother_height, desired_height, grade, class_height_rank, nationality(KR/CN 성장곡선용), country(범용 국적, migration 017), intake_survey (jsonb) | Every child is a patient; intake_survey holds paper-form Q4/Q9~Q16 |
| `intake_submissions` | id, token, lang, country, status(pending/approved/rejected), 기본정보 컬럼들, intake_survey(jsonb), uploads(jsonb), child_id, reviewed_at | 환자 셀프 설문(공개 폼) 대기함. 승인 시 children 생성. migration 018 |

### Hospital data (doctor-entered, visit-centric)
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `visits` | id, child_id, visit_date, doctor_id, chief_complaint, plan, notes | Hospital-data hub |
| `hospital_measurements` | id, visit_id, child_id, measured_date, height, weight, bone_age, pah | One per visit |
| `xray_readings` | id, visit_id, child_id, xray_date, image_path, bone_age_result, atlas_match_younger/older | Atlas-matched, storage: `xray-images` |
| `lab_tests` | id, visit_id, child_id, test_type, result_data jsonb, attachments jsonb | allergy \| organic_acid \| blood \| attachment |
| `medications` | id, code, name, default_dose, unit, is_active | Drug master (admin CRUD) |
| `prescriptions` | id, visit_id, child_id, medication_id, dose, frequency, duration_days | Per-visit prescriptions |

### Lifestyle data (patient-entered)
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `daily_routines` | id, child_id, routine_date, sleep_time, wake_time, water_intake_ml, basic_supplements[], growth_injection | Daily log |
| `meals` | id, daily_routine_id, meal_type, meal_time, description | breakfast/lunch/dinner/snack |
| `meal_photos` | id, meal_id, photo_url | Storage: `meal-photos` |
| `meal_analyses` | id, meal_id, menu_name, calories, carbs, protein, fat, growth_score, advice | AI analysis |
| `exercise_logs` | id, daily_routine_id, exercise_name, duration_minutes, completed | Exercise logs |

### Content (admin-managed)
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `exercises` | id, category, name, youtube_url, order_index, is_active | Reference library |
| `recipes` | id, title, image_url, is_published, order_index | Recipes |
| `growth_guides` | id, title, image_url, content, is_published, order_index | Guides |
| `growth_cases` | id, chart_number, patient_name, gender, is_published | Website treatment cases |
| `consulting_qa` | id(=1 singleton), categories(jsonb), updated_at | 해외 환자 상담 매뉴얼 Q&A. `/consulting.html` 편집기가 읽고 씀 (migration 029). categories 는 `{version, markets:{kr,en,th,vn}}` 객체 — 시장별 매뉴얼 + 질문/답변 `{ko,loc}` 이중언어. 레거시 배열은 로드 시 자동 마이그레이션(전 시장 복사) |

## Storage Buckets
- `content-images` (public, 5MB) — guides/recipes/cases + lab attachments
- `meal-photos` (public, 5MB) — patient meal uploads
- `xray-images` (PRIVATE, 10MB) — PHI, signed URL only
- `intake-uploads` (PRIVATE, 10MB) — 환자 셀프 설문 첨부(X-ray·검사), anon insert (migration 018)

## DB Column Naming
- `users`, `children`, `exercises`, `medications`: use `is_active`
- `recipes`, `growth_guides`, `growth_cases`: use `is_published`

## Schema & Migrations

> 🚨 **"수동 적용 필요" 주석을 믿지 말 것 — DB 에 직접 물어볼 것.** 2026-07-17 전수 실측 결과
> 대기로 적혀 있던 것(017·018·019·043·050·057·060·063·064·065·068 등)이 **전부 이미 적용돼 있었고**,
> 정작 진짜 미적용이던 **009 는 이 목록에 아예 없었다**(그래서 설문 승인 → 환자 등록이
> `42703 column children.phone does not exist` 로 죽었는데 원인이 안 보였다).
> 주석은 "적용했다"를 아무도 안 고쳐서 썩는다. **확인은 실측으로**:
> ```bash
> cd ai-server && node -e "require('dotenv/config');const u=process.env.SUPABASE_URL,k=process.env.SUPABASE_SERVICE_ROLE_KEY;
> fetch(u+'/rest/v1/children?select=phone&limit=1',{headers:{apikey:k,Authorization:'Bearer '+k}}).then(r=>console.log(r.ok?'적용됨':'미적용'))"
> ```
> ★**CHECK 제약 확장(008·043)은 컬럼 조회로 판정 불가** — 그 값을 실제로 insert 해봐야 안다
> (거부 코드가 `23514`=CHECK 위반이어야 미적용. `23502`=NOT NULL 은 딴 이유니 오판 금지).

- Fresh-project setup SQL: `v4/scripts/migrations/000_initial_schema.sql`
- Permissive writes for anon: `001_permissive_clinical_writes.sql`
- Desired height column: `002_add_desired_height.sql`
- Intake survey columns: `003_children_intake_survey.sql`
- **⚠️ 유일한 미적용: `008_lab_tests_panel_types.sql`** — lab_tests.test_type CHECK 를 `attachment`/`food_intolerance`/`mast_allergy`/`nk_activity`/`hair_mineral` 까지 확장. **2026-07-17 실측 확인(`attachment` insert → 23514 거부)**. 현재 쓰이는 값은 blood·allergy·organic_acid 셋뿐이라 당장 지장 없음
- 환자 연락처/주소: `009_children_contact_fields.sql` — children 에 address·zipcode·phone·email·rrn (**2026-07-17 적용** — 이게 빠져서 설문 승인 환자 등록이 계속 실패했음)
- 범용 국적: `017_children_country.sql` (적용 완료)
- 환자 셀프 설문 대기함 + 채번 함수 + intake-uploads 버킷: `018_intake_submissions.sql` (적용 완료)
- 설문 현재 키·몸무게: `019_intake_current_height.sql` (적용 완료)
- 마케팅 도구: `020_marketing_config.sql` ~ `028_marketing_ad_campaigns.sql`
- 상담 매뉴얼 Q&A 싱글톤: `029_consulting_qa.sql` (적용 완료)
- 마케팅 확장: `030_marketing_articles_confirmed.sql` ~ `033_marketing_article_translations.sql`
- 클리니컬 RAG: `034_medication_legend.sql` ~ `036_clinical_insights.sql`
- 마케팅/발행 확장: `037_marketing_channel_active.sql` ~ `042_channels_meta_target_and_queue_result.sql`
- 치료완료 단계: `043_children_treatment_completed.sql` — treatment_status CHECK 에 `completed` 추가 (적용 완료 — `completed` 행이 실재해 확인됨)
- 광고 소재 기존게시물(boosting): `052_marketing_ads_source_post.sql` — marketing_ads 에 source_post_id/source_channel/source_url (적용 완료)
- 광고 Meta 푸시 id 매핑: `053_marketing_ad_meta_ids.sql` — campaigns/sets/ads 에 meta_*_id + pushed_at/push_error (적용 완료)
- 광고 전용 소재 라이브러리(다크 포스트): `054_marketing_ad_creatives.sql` — marketing_ad_creatives 테이블 (적용 완료)
- 콘텐츠 정규/커스텀(ad-hoc 릴스) 구분: `055_marketing_articles_kind.sql` — marketing_articles.kind 'regular'|'custom' (적용 완료)
- 원장 저서 RAG: `056_knowledge_documents.sql` — `knowledge_documents`(pgvector 768d) + `match_knowledge_documents` RPC. 원장 저서 청크를 처방추천 1차 권위 지식소스로(상세 memory `book_knowledge_rag.md`). (적용 완료)
- 릴스 라이트 에디터: `057_reels_editor.sql` — 릴스 라이트 에디터: reel_script/reel_runtime + 잡 큐 + 워커 heartbeat + 스티커 (적용 완료)
- 익명 예측키 적재: `060_anonymous_predictions.sql` — `anonymous_predictions`(홈페이지 익명 계산기 결과 = 랜덤 현지 이름·성별·생년월일·현재키·예측키·백분위·국적(언어 기반)·UTM). 실환자 테이블과 분리, **anon INSERT만**(SELECT 차단, 조회는 추후 service_role). (적용 완료)
- 환자관리 즐겨찾기 DB화: `063_children_is_favorite.sql` — `children.is_favorite` boolean + 치료사례 후보 58명 별표 시드. 옛 localStorage 즐겨찾기 폐기. (적용 완료 — 코드의 42703 폴백은 안전망으로 잔존)
- 발행 큐 자동 재시도: `064_publish_queue_retry_count.sql` — `marketing_publish_queue.retry_count`. 발행 실패 시 `publishExecutor.fail()` 이 백오프 재예약(상세 ai-server/CLAUDE.md). (적용 완료)
- 예약(콜백) 신청: `068_reservations.sql` — `reservations`(name·phone·contact_method·message·locale·status·consent·referrer·utm). 한글 하단 바 "예약하기" 리드. **RLS on·anon 정책 없음**(실명+전화 PII) → ai-server service_role 로만 접근. 조회는 `/marketing/predictions` 드롭다운 📞 예약 신청(ai-server PIN 경유). (적용 완료)
- 설문 어드민 메모: `069_intake_admin_note.sql` — `intake_submissions.admin_note text`. `/admin/intake` 접수함 = 리스트 각 행에 메모 미리보기(📝 앰버, 없으면 "메모 추가") → 클릭 시 편집 팝업(`AdminIntakePage.MemoModal`, `updateSubmissionNote`), 저장 시 리스트 즉시 갱신. 우측 상세엔 설문 내용만(메모 편집칸은 팝업으로 이관). ⚠️ **수동 적용 필요**(미적용 시 읽기는 graceful·저장은 42703 안내). 어드민 전용(anon 불필요)
- Seeds: `v4/scripts/seeds/seed_treatment_cases.sql`, `seed_xray_atlas_matches.sql`

## Admin Patient Detail
- **Tabs**: `?tab=info` (기본 정보) / `?tab=visits` (진료 기록, default)
- **기본 정보 tab**: `IntakeSurveyPanel` — 5 sections
  - Basic info (children columns: name/birth/parent heights/grade/class_rank/...)
  - Growth history table (8~16세, TSV paste modal, delta auto-calc)
  - Family/interest (Q9/Q10/Q12/Q13 yes-no + sports event)
  - Medical/development (Q14 chronic conditions, Q15 Tanner 1-5)
  - Short stature causes (Q16 multi-select chips + free-text)
  - **스캔 초진기록지** (`IntakeScannedSection`): `intake_survey.scanned_intake` 있으면 표시 — 손글씨 초진기록지 OCR을 생년월일+이름 매칭 검토 툴(`/intake-review/match-review.html`, 루트 CLAUDE.md 데이터 파이프라인 참조)에서 연결한 미검증 데이터. 접힘 `<details>` + 앞/뒤 스캔 이미지 + 추출 필드(저신뢰/검토필요 강조). 정식 문진과 별도(검증 후 수기 반영 전제)
- **진료 기록 tab — 3-Column Layout**
  - **Left**: Visit list — inline height/weight inputs, collapsible rail, CA/BA/PAH display, lab file upload (drag/paste/pick)
  - **Center**: X-ray panel — younger/patient/older atlas, ↑↓ step, editable bone age, predicted adult height, drag&drop/paste/file-pick
  - **Right**: Growth chart — `[성장 곡선][예측키 추세]` 2-tab (`chartTab` state)
    - **성장 곡선** (`AdminPatientGrowthChart`): KDCA 2017 percentiles (40% alpha), BA + CA dual projection curves, per-visit highlight, toggle chips. `baOnly`(뼈나이 측정만) 기본 ON, Y축 90~190(`Y_MAX`). 예측키(baProj) 곡선 기본 off — `defaultHidePrediction` prop, 상단 `BA 예측` 칩으로 켜기 (simplified/첫상담 미영향)
      - **수평 기준선 2개**(`ToggleKey`= boneAge/baProj/caProj/**desired**/**mph**): 희망키 보라 `#9333ea` 점선 `[2,3]` + **MPH 주황 `#d97706` 점선 `[6,3]`**(2026-07-17 추가, 기본 ON). 둘 다 **`!simplified` 조건 = 어드민 전용**. MPH 는 `child.father_height`·`mother_height` 로 공용 `calculateMidParentalHeight`(shared/utils/growth) 호출 — **첫 상담 8페이지 gaussian 슬라이드와 같은 공식**(`(부+모±13)/2`, 슬라이드는 `(부+모)/2±6.5` 로 표기하나 수학적으로 동일). 부모키 없으면 `mph>0` 가드로 미표시. ★새 기준선 추가 시 **`chartData` useMemo 의존성 배열에 값을 넣을 것**(빠뜨리면 조용히 stale)
    - **예측키 추세** (`PredictedHeightTrend`, 신규): 예측키(키+뼈나이 18세 예측) 라인 한 줄 + 각 포인트 위에 백분위 라벨(`30%ile`, `pctLabels` Chart.js 플러그인, 예측키가 백분위 유지 투영이라 또래 18세 백분위와 동일) + X축 아래 측정날짜/만나이/뼈나이/Δ(뼈−만, 조숙 +빨강·지연 −초록), 호버 툴팁 없음, Y축 폭 `afterFit` 고정으로 HTML 행 정렬
  - Grid: visits `minmax(220px, 1fr)` | X-ray `360px/44px` | chart `60%`
  - Chart: BA 예측 (indigo dashed) + CA 예측 (teal dashed) + solid horizontal lines at predicted adult heights
  - 좌하단 `🔍 비슷한 케이스`/`🧠 환자 분석` 플로팅 버튼은 숨김 (JSX 주석 처리, 모달·state 보존 → 되살리기 쉬움). `🧠 AI 처방 추천` 버튼도 숨김 — 옛 그래프 우하단 플로팅에서 **`VisitDetailPanel` 탭 바의 생활습관 탭 옆**(`ml-auto` pill)으로 이동 후 주석 처리(state·`RxRecommendModal` 보존)

## 소견서 작성 (referral note, `/admin/referral`)
해외 환자가 현지 병원에서 X-ray·피검사를 받을 때 지참하는 의뢰서 생성기. admin 사이드바 "설문 접수" 밑 📝 소견서 작성(`CONSULT_ITEMS`). 환자 정보(이름·생년월일·성별·주소) 수동 입력 + X-ray/피검사 선택(둘 다 가능) + 언어 선택 → 실시간 미리보기 + 🖨 인쇄/PDF(별도 창 `window.print`). **언어 7종**(en 기본/ko/th/vi/zh-hans/zh-hant/ja) — **서술문만 현지어, 검사 항목명·서명자 블록은 영어 유지**(현지 검사실 국제 표준). 성별 따라 성호르몬 항목 자동(남 Testosterone/여 Estradiol), 오늘 날짜 자동, 둘 다 선택 시 2장(페이지 분리·1./2. 번호). 하단 서명 = `public/images/referral-signature.png`(원장 실서명 투명 PNG, tracked). 파일: `features/admin/referral/referralTemplates.ts`(7언어 문자열+영어 검사 리스트+SIGNATORY) · `referralDoc.ts`(순수 HTML/CSS 빌더 `buildReferralHtml`+`REFERRAL_DOC_CSS`, 입력 escape) · `pages/admin/AdminReferralPage.tsx`. ⚠️ **비영어 서술문은 초안 — 원장/전문 감수 권장**(검사명 영어라 의료 핵심은 언어 무관). **(2026-07-21) 설문 접수함 연동**: `/admin/intake` 각 제출 상세(`IntakeSubmissionDetail`)에 `📝 소견서 작성` 버튼 — 클릭 시 그 환자 이름·생년월일·성별·주소를 소견서 폼에 자동 채워 이동(react-router `navigate(state)` + `ReferralPrefill`(referralDoc.ts), `AdminReferralPage` 가 `location.state` 로 프리필 + `location.key` 변경 시 재프리필해 다른 환자로 재진입 시 stale 방지). 이름은 현지 병원이 읽을 전체명 `name` 우선(비면 `name_en` 폴백), 언어는 설문 언어 `sub.lang` 기본값(INTAKE_LANGS≡ReferralLang라 1:1). 수동 재입력 제거.

## Admin Access
- **App admin**: `admin@187growth.com` / `admin187!` (routes: `/admin/*`)
- **Cases parent**: `cases@187growth.com` / `cases187!` (7 treatment case children)
- **Banner admin**: PIN `8054` (route: `/banner-admin`, sessionStorage)

## App Navigation (login required, mounted under `/app`)
모든 `/app/*` 라우트는 `ProtectedRoute` 로 보호됨. 환자는 차트번호 + 비밀번호 (기본 `1234`) 로 로그인.

**환자 단계별 BottomNav 분기** — `selectedChild.treatment_status` 기준
- **`treatment` (치료 중)**: 진료기록(📋) / 생활 다이어리(📔) / 생활 통계(📊) / 1:1상담. `/app` 진입 시 `/app/records` 로 자동 redirect.
- **`consultation` (상담만 한 환자)**: 홈(🏠) / 첫 상담 기록(📋) / 1:1상담. 마케팅 + 데이터 기반 공포 카드로 치료 시작 유도.

| Route | Page | 노출 단계 |
|-------|------|----------|
| `/app` | HomePage (단계별 분기 — IntakeGrowthChartCard 또는 redirect) | consultation |
| `/app/records` | RecordsPage (treatment→진료 회차 타임라인 / consultation→`ConsultationRecordView` 풀 14카드) | both |
| `/app/routine` | RoutinePage (생활 다이어리, 입력 전용 — 통계 분리됨) | treatment |
| `/app/stats` | StatsPage (월별 통계, 6 카테고리 + 일별/주별 토글) | treatment |
| `/app/info[/*]` | 성장가이드 / 레시피 / 케이스 (탭 없음, 홈에서 진입) | consultation |
| 1:1상담 | (외부) 카카오톡 https://pf.kakao.com/_mxbWxfX | both |

**`treatment_status` 의사 수동 토글 (3단계)** — `consultation`(상담) / `treatment`(치료 중) / `completed`(완료). AdminPatientDetailPage 헤더 좌측 `[상담][치료 중][완료]` 버튼 + AdminPatientsPage(환자 관리) 목록의 "단계" 컬럼 인라인 셀렉트(표시+변경) + 단계 필터칩(완료 환자는 행 opacity 흐림). 라벨/색상은 `shared/utils/treatmentStage.ts` 단일 소스. **`completed`는 환자앱에선 `treatment`와 동일 취급**(BottomNav·HomePage가 `consultation`만 별도 분기 → 완료해도 진료기록 뷰 유지). `migration 014` 의 자동 백필 (visits 1건 이상 → treatment) 결과 244명 전원 `treatment` 로 시작, `completed`는 `migration 043` 으로 CHECK 확장.

**환자 빠른 데이터 입력** — `AdminPatientsPage` 우상단 "+ 환자 추가" 아래 "＋ 환자 데이터 입력"(`PatientDataEntryModal`). 환자번호 입력(디바운스 `fetchChildByChartNumber` 정확 조회)→이름 자동 채움, 날짜(기본 오늘·변경 가능)+키(필수)+몸무게로 해당 날짜 측정 저장(같은 날짜 일반 visit 재사용·없으면 `createVisit`, 후 `createMeasurement`). 없는 번호면 안내 + "새 환자 등록" → `AddPatientModal`(`initialChartNumber` 미리채움) 로 전환.

**헤더** (Layout.tsx): 로고(앱홈으로) + ← 화살표 + "홈페이지" pill 버튼(공식 사이트로 빠져나가는 동선) + 톱니바퀴(콘텐츠 관리 PIN) + 햄버거(로그아웃).

## Website Navigation (public, root)
| Route | Page |
|-------|------|
| `/` | WebsiteHomePage (KR 랜딩페이지) |
| `/program/:slug` | ProgramDetailPage (7개 프로그램) |
| `/guide`, `/guide/:cardId` | GrowthGuidePage / Detail |
| `/diagnosis` | IntakeDiagnosisPage (AI 진단 intake) |
| `/intake` · `/intake/:lang` | 환자 셀프 설문(공개 **7스텝** 마법사). **(2026-07-19 구조)** 위저드 본체 = 공유 컴포넌트 `components/IntakeWizard.tsx`(lang prop). **`/intake` = `GlobalIntakePage`** — 진입 시 **언어 선택 팝업**(en 맨 위·7언어) → 선택 언어로 위저드, 우상단 `🌐 언어 변경`. **`/intake/:lang` = `PublicIntakePage`**(어드민 공유용 직링크, 위저드에 위임) — 없는/잘못된 코드는 **en 폴백(default=영어)**. 언어 = ko/th/vi/en/**zh-hans/zh-hant/ja**(2026-07-19 간체·번체·일본어 추가 — `IntakeLang`+`INTAKE_LABELS`+`LANG_DEFAULT_COUNTRY`(CN/TW/JP)+`AdminIntakePage.SHARE_LANGS`, 전 문항 번역. `lang` 컬럼 CHECK 없어 마이그레이션 X. ⚠️중/일 원어민 감수 대기). 어드민 검토는 `/admin/intake`. **(2026-07-17 설문 통일)** 구글 폼 초진 설문지·`/diagnosis` 와 문항 세트 동일화 — 출생 정보(임신 주수·출생 몸무게·특이사항, StepBasic)·최근 1년 성장(StepGrowth)·**생활 습관 스텝 신설**(StepLifestyle — 취침/기상·운동 빈도·우유·식사 규칙성)·사춘기 상세 성별 분기(StepMedical — 남: 변성기·수염/체모, 여: 초경·유방 발달)·복용 약/영양제·추가 메모(StepCauses). 전부 `intake_survey` JSONB optional 필드(마이그레이션 X, 구접수 하위호환). 유입 경로에 `ai`(ChatGPT 등 AI) 옵션 4언어 추가. 셀렉트는 코드값 저장 + `intakeLabels.optLabelKo` 로 어드민 한국어 표시 |
| `/banner-admin` | AdminWebsitePage (PIN 보호) |
| `/consulting.html` | 해외 환자 상담 매뉴얼 Q&A 편집기 (정적 HTML, noindex). **시장 4탭(🇰🇷한글/🇺🇸영어/🇹🇭태국어/🇻🇳베트남어)** + 비한국 탭은 **한글↔현지어 토글**. 카테고리/질문/답변 + 질문별 공개토글, Supabase `consulting_qa` 싱글톤에 저장, supabase-js CDN 직접 연동. **🌐 현지어 번역 버튼**(ai-server `/api/marketing/translate`, dev-only) 로 한글→현지어 일괄 번역. admin 사이드바 "상담 매뉴얼"(`/admin/consulting`)이 iframe 으로 임베드 |

## Legacy Route Redirects
router.tsx has `<Navigate>` entries for the pre-restructure paths so old bookmarks and banner `cta_target` values in R2 keep working:
- `/website` → `/`, `/website/program/:slug` → `/program/:slug`, `/website/guide[/*]` → `/guide[/*]`, `/website/diagnosis` → `/diagnosis`, `/website/admin` → `/banner-admin`
- `/routine` → `/app/routine`, `/info[/*]` → `/app/info[/*]`
- `/body-analysis` & `/app/body-analysis` → `/app/routine` (체형 분석 페이지는 `PhotoCaptureCard` 로 흡수됨)
- `/app/stats` → `/app/routine` (통계 페이지는 RoutinePage 안 탭으로 통합됨)

## AI Features
- **Meal analysis**: WORKING - photo → compress → Gemini analyze → DB save
- **Body analysis**: MOCK - placeholder, needs Gemini integration
- **RAG chatbot**: DEFERRED

## Refactoring History
- AdminContentPage: removed (content authoring dropped from admin)
- AdminPatientDetailPage: 3-column redesign with inline editing
- RoutinePage: 402→~200 lines (extracted cards)
- HeightCalculator: 336→~120+170 lines (form/result split)
- BodyAnalysisPage: deleted, condensed into `features/routine/components/PhotoCaptureCard.tsx` and embedded at the bottom of RoutinePage's input tab.

## RAG (Phase 21, 인프라+UI 완성·임베딩 배치 대기)

**A. 의사 보조 — 비슷한 케이스 검색**
- migration 015 (수동 실행 대기): pgvector + `patient_embeddings(child_id PK, embedding vector(768))` + RPC `match_patient_embeddings(query_child_id, match_count)` (cosine top-k).
- ai-server: `services/embedder.ts` 가 child 의 인구학·MPH·키 추이·뼈나이·처방 패턴·lab 강반응·메모를 한국어 brief 텍스트로 정규화 → Gemini `text-embedding-004` (REST 직접 호출) → upsert.
- endpoints: `POST /api/embeddings/build/:childId` · `POST /api/embeddings/build-all` (skipExisting, 0.4s 간격) · `GET /api/similar-cases/:childId?k=5` (유사도% + 환자 demographics + 첫·마지막 키/PAH + 처방 top-5).
- 어드민 UI: AdminPatientDetailPage 좌하단 `🔍 비슷한 케이스` 플로팅 버튼 (기존 `🧠 환자 분석` 위) → `SimilarCasesModal` (5장 카드: 유사도/키 변화/PAH 변화/처방 칩/환자 상세 링크). 임베딩 없을 때 "임베딩 만들고 다시 검색" fallback 버튼.

**B. 환자 코칭 — 식단/잠/운동 가이드**
- migration 015: `coaching_cards(child_id, content_date UNIQUE, content jsonb)` — 1일 1회 캐시.
- ai-server: `services/coachingGenerator.ts` 가 child + 최근 7일 daily_routines(meal/sleep/water/injection 평균) + intake → Gemini 2.5 Flash → `{meal, sleep, exercise, summary}` JSON.
- endpoints: `GET /api/coaching/:childId` (오늘 캐시 또는 자동 생성) · `POST /api/coaching/:childId` (강제 재생성).
- 환자 UI: RoutinePage 입력 탭 HeightWeightCard 직후 `CoachingCard` (3개 가이드 카드 + 격려 한 줄 + 🔄 새로 받기). 매일 1회 자동 호출.

## features/records/ — 환자용 진료기록 (NEW)
환자가 병원에서 측정·진료받은 read-only 데이터를 모바일 친화적으로 보여주는 새 영역.
`treatment_status` 에 따라 RecordsPage 가 두 가지 뷰로 분기.

**공통**
- `services/patientRecordsService.ts` — 한 child 의 visits + measurements + prescriptions(medication name 조인) + lab_tests + xray_readings 를 한 번에 fetch 하는 `fetchPatientRecords(childId)` 함수. is_intake 가상 visit 제외.

**치료 환자 뷰** (`treatment_status='treatment'`) — RecordsPage 정상 흐름
- `components/PatientHeaderCard.tsx` — 그라데이션 헤더 + 이름·생년월일·만나이 한 줄 + 차트번호 + 진료/뼈나이/처방/검사 4-stat + 최초/마지막 진료일.
- `components/GrowthComparisonCard.tsx` — "📊 최종 예측키 변화 ±N cm" (default 접힘). 펼치면 어드민 `GrowthComparisonDiagram` 3 픽토그램 (초기 키 / 최초 예측 / 최종 예측). BA 측정 ≥2 일 때만.
- `components/BoneAgeCompareCard.tsx` — "🦴 뼈나이 / 예측키" 3 그리드 (실제 나이 / 뼈나이 / 예측키) + 친근한 한 줄 해석 + 이전 측정 펼침 (회차별 예측키 포함).
- `components/VisitTimelineCard.tsx` — 회차 카드. BA 회차는 amber 톤 강조. 펼치면 **처방/검사/X-ray/메모 4탭**. X-ray 탭은 image_path 있는 reading 만 노출 + signed URL 라이트박스. 검사 탭의 panel 칩 클릭 시 LabDetailModal.
- `components/LabDetailModal.tsx` — 어드민 `LabHistoryPanel` 의 `PanelContent`/`panelTypeOf` 재사용. 한 회차에 panel 여러 개면 상단 탭.
- 회차 필터 체크박스 (🦴 뼈나이 / 🧪 검사 / 📝 메모) — OR 필터, 진료기록 헤더에서 토글.
- 성장 추이 그래프: `[성장 곡선][예측키 추세]` 2-tab (모바일 pill 버튼). 성장 곡선 = `AdminPatientGrowthChart` simplified (BA 회차만 다이아 + 클릭 시 예측키 banner + 보라 점선 hide), 예측키 추세 = `PredictedHeightTrend` (admin과 동일 컴포넌트 재사용). treatment 뷰만 (consultation 제외).

**상담 환자 뷰** (`treatment_status='consultation'` 또는 visits=0) — `ConsultationRecordView`
어드민의 `firstConsultContent.ko` 11 슬라이드 + 환자 데이터를 합쳐 모바일 14 카드 스택으로 풀 재구성. 가족·지인 공유 가능.

1. 187 Cover (다크그린 hero, 원장명·웹사이트)
2. 환자 인사 ("{이름} 님의 첫 상담 기록 · 자유롭게 공유")
3. 채용현 원장 소개 (사진 + 인용구 + 2002/2010/2023/2025 타임라인 + 활동·출연 펼침)
4. 병원 진료 소개 사진 x2
5. 핵심 수치 hero (현재 키 / 18세 예측 / MPH + 공포 카피 "MPH 보다 -Ncm")
6. 성장 추이 그래프 (intake history + 18세 LMS 예측)
7. 설문 발췌 (성장 패턴/Tanner/원인 칩/학교/만성/관심도)
8. MPH vs PAH 방법론 (firstConsultContent 그대로)
9. MPH 가우시안 분포 (자체 모바일 SVG bell curve, ±1σ 68% / ±2σ / 외각 + tick labels)
10. 뼈나이 분석 (이미지 + 설명)
11. 뼈나이 아틀라스 (이미지 + 설명)
12. X-ray 판독 모듈 안내 ("진료 시작 시 누적")
13. 성장 그래프 모듈 안내 ("진료 시작 시 매 회차 업데이트")
14. **원장 마무리 한마디** — amber 톤 손편지 카드, 환자 데이터 기반 동적 4문단 (백분위·MPH 갭·Tanner·원인 별 분기) + "잘 치료하면 충분히 좋아질 케이스" + 채용현 원장 서명
15. 카톡 1:1 상담 CTA

**기타 환자용 컴포넌트**
- `features/home/components/IntakeGrowthChartCard.tsx` — 상담 단계 홈 첫 섹션. 공포 마케팅 카드.
- `features/home/components/TreatmentDashboardCard.tsx` — 치료 단계 홈 (실제로는 redirect 되니 stub 역할). 마지막 진료 N일 + 진료기록·다이어리 quick entry.
- `pages/RecordsPage.tsx` — 위 두 뷰 조립 + `treatment_status` 분기.
