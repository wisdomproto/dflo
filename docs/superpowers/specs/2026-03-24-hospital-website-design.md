# Hospital Website Redesign — Design Spec

## Goal

Build a conversion-focused hospital landing page inside the existing v4 project, reusing app modules (growth calculator, exercises, Supabase content). Replace the current Wix website at yssaebomq.com with a modern, mobile-first design that drives KakaoTalk inquiries.

## Tech Stack

- Existing v4: React 19 + TypeScript 5 + Vite 7 + Tailwind CSS 4
- Supabase (existing DB: recipes, growth_guides, growth_cases)
- Existing modules: growthStandard.ts, age.ts, growth.ts, exercises.ts, SwipeableSection, contentService

## Scope

- Public pages (no auth required)
- Mobile-first responsive design
- Landing page + 7 program detail sub-pages (about/contact deferred to phase 2)
- All content sliders use horizontal swipe pattern (SwipeableSection)
- Floating KakaoTalk CTA on all pages

## Page Structure — Main Landing

### Section Order (top → bottom)

1. **Hero** — Green gradient background, "우리 아이, 얼마나 클까?", CTA button scrolls to calculator
2. **Trust Stats** — 15,000+ 누적 치료 아동 / 94.7% 성장 목표 달성률 / 20년+ 전문 진료 경험
3. **Height Calculator Widget** — Interactive form (gender, age, height, weight, father/mother height) → result with percentile + predicted adult height → KakaoTalk CTA
4. **187 Growth Programs** — 7 program cards in horizontal slider:
   - 성장 호르몬 밸런스
   - 성조숙증 관리
   - 신체 비율이 예뻐지는
   - 비만 아이 특화 성장
   - 성장 체형 교정운동
   - 곧은 발육 케어
   - 성장 시기를 놓친 아이를 위한 프로그램
5. **Growth Guide Slider** — from Supabase `growth_guides` table, horizontal slider
6. **Recipe Slider** — from Supabase `recipes` table, horizontal slider
7. **Exercise Slider** — from `exercises.ts` data, horizontal slider with YouTube thumbnails
8. **Treatment Cases Slider** — from Supabase `growth_cases` table, horizontal slider (bottom of page)
9. **Footer** — Hospital info, hours, address, copyright
10. **Floating KakaoTalk** — Fixed bottom-right, always visible, links to KakaoTalk channel

### NO app download section

## File Structure

```
v4/src/features/website/
  components/
    WebsiteLayout.tsx        (~60 lines) — header nav + footer + FloatingKakao wrapper
    WebsiteHeader.tsx         (~50 lines) — logo + hamburger menu (mobile) / full nav (desktop)
    HeroSection.tsx           (~40 lines) — gradient bg, title, subtitle, CTA
    TrustStats.tsx            (~30 lines) — 3 stat cards in a row
    HeightCalculator.tsx      (~120 lines) — form + result + KakaoTalk CTA
    ProgramSlider.tsx         (~60 lines) — 7 program cards in SwipeableSection
    GrowthGuideSlider.tsx     (~50 lines) — fetches from Supabase, renders slider
    RecipeSlider.tsx           (~50 lines) — fetches from Supabase, renders slider
    ExerciseSlider.tsx        (~50 lines) — uses exercises.ts data, renders slider
    CaseSlider.tsx            (~50 lines) — fetches from Supabase, renders slider
    FloatingKakao.tsx         (~20 lines) — fixed position KakaoTalk button
    WebsiteFooter.tsx         (~40 lines) — hospital info, hours, copyright
  pages/
    WebsiteHomePage.tsx       (~80 lines) — composes all sections
    ProgramDetailPage.tsx     (~100 lines) — dynamic program detail by slug
  data/
    programs.ts               (~80 lines) — 7 program data (title, slug, description, icon, features)
```

## Routing

Add to `router.tsx` as public routes (no ProtectedRoute wrapper):

```
/website                        → WebsiteHomePage
/website/program/:slug          → ProgramDetailPage
```

## Module Reuse

| Existing Module | Used By | How |
|----------------|---------|-----|
| `shared/data/growthStandard.ts` | HeightCalculator | `predictAdultHeightLMS`, `calculateHeightPercentileLMS` |
| `shared/utils/age.ts` | HeightCalculator | `calculateAgeAtDate` for decimal age |
| `shared/utils/growth.ts` | HeightCalculator | `calculateMidParentalHeight` |
| `shared/components/SwipeableSection.tsx` | All sliders | Base swipe container |
| `features/exercise/data/exercises.ts` | ExerciseSlider | Exercise names, descriptions, YouTube IDs |
| `features/content/services/contentService.ts` | Guide/Recipe/Case sliders | `fetchRecipes`, `fetchGrowthGuides`, `fetchGrowthCases` |

## Height Calculator Widget

### Input Fields
- 성별 (male/female toggle)
- 생년월일 (date input, used with `calculateAgeAtDate` to get decimal age)
- 현재 키 (cm)
- 현재 체중 (kg)
- 아버지 키 (cm)
- 어머니 키 (cm)

### Calculation Logic (reuse from v4)
1. `calculateAgeAtDate` → decimal age
2. `calculateHeightPercentileLMS` → percentile
3. `predictAdultHeightLMS` → predicted height
4. `calculateMidParentalHeight` → MPH range

### Result Display
- Predicted adult height (big number)
- Percentile badge
- MPH comparison
- "전문 상담 받아보세요" KakaoTalk CTA button

## Slider Pattern

All sliders use the same pattern. Each slider section has an inline header (tag + title text) followed by `SwipeableSection`:
```tsx
<section className="py-8 px-6">
  <p className="text-xs font-semibold text-primary">태그</p>
  <h2 className="text-xl font-extrabold">제목</h2>
  <SwipeableSection>
    {items.map(item => <Card key={item.id} ... />)}
  </SwipeableSection>
</section>
```

Each slider has its own card design but shares the swipe mechanics.

## 187 Growth Program Cards

Static data in `programs.ts`. Each card:
- Icon/emoji
- Title
- Short description (1 line)
- Links to `/website/program/:slug`

### Program Detail Page

Each program page shows:
- Hero with program title + description
- Key features list
- Before/after illustration area
- "이 프로그램이 필요한 아이" checklist
- KakaoTalk CTA

Content is static (defined in `programs.ts`) — no Supabase needed for program pages.

## Design Tokens

Use existing v4 Tailwind theme colors where possible. Add website-specific overrides in `index.css`:
- Primary: `#0F6E56` (dark green, from Pencil design)
- Primary light: `#E8F5F0`
- Background: `#FFFFFF`
- Surface: `#F4F4F5`
- KakaoTalk: `#FEE500`

## Floating KakaoTalk CTA

- Fixed position: `bottom-6 right-6`
- Yellow (#FEE500) pill with shadow
- "💬 카카오톡 상담" text
- Links to: env variable `VITE_KAKAO_CHANNEL_URL` (fallback: `https://pf.kakao.com/` — actual channel URL to be configured)
- `z-50` to stay above all content

## Responsive Strategy

- Mobile-first (< 768px): Single column, full-width sliders
- Tablet (768-1024px): 2-column grids where appropriate
- Desktop (> 1024px): Max-width 1200px container, larger cards in sliders

## Navigation & Layout Isolation

- Website pages use `WebsiteLayout` (own header/footer), NOT the app's `Layout`/`BottomNav`
- Website header includes: logo, nav links (프로그램, 소개, 상담), KakaoTalk CTA
- No link to app login from website (separate concerns)
- Authenticated users visiting `/website` see the same public page (no special behavior)
- App's `BottomNav` only renders inside `Layout` component, which website pages don't use

## About & Contact Pages

Deferred to phase 2. For now, the main landing page is the priority. About/Contact can link to the existing Wix pages or be added later. Remove from scope.

## SEO

SPA limitations noted. For phase 1:
- Set `document.title` per page via `useEffect`
- Add basic `<meta>` tags via a small `Helmet`-style utility or direct DOM manipulation
- Full SSR/SSG migration (Next.js) is a future consideration if search traffic becomes important

## Testing Strategy

- `npx tsc --noEmit` after each component
- `npm run build` must pass
- Visual check via dev server
- Test calculator with known values against v4 app results
