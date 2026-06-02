# 마케팅 SP1 — 프로젝트 설정 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dflo `/marketing` 섹션에 연세새봄 브랜드 보이스 설정을 편집·저장하는 `marketing_config`(단일 행 Supabase) + `/marketing/settings` 폼을 추가한다.

**Architecture:** dflo 공용 Supabase 브라우저 클라이언트(`@/shared/lib/supabase`)로 client-direct read/write하는 단일 행 config 테이블. 마케팅 feature 최초의 DB 연동. UI는 기존 PIN 게이트 쉘의 5번째 사이드바 항목 + lazy 자식 라우트. 외부 의존 0, 비밀 미저장(외부 API 키는 SP2/SP4에서 ai-server env).

**Tech Stack:** React 19, TypeScript(strict, `verbatimModuleSyntax`), Vite 6, React Router 7, Tailwind 4, `@supabase/supabase-js`(기존 클라이언트).

**Spec:** `docs/superpowers/specs/2026-06-02-marketing-sp1-project-config-design.md`

---

## 검증/실행 전략 (읽고 시작)

- dflo `v4`에는 **React/TS src 단위 테스트 하니스가 없다**(Phase 1과 동일). SP1 검증 = `npx tsc --noEmit`(strict 통과) + `npm run lint`(마케팅 파일 클린) + **사용자가 migration 적용 후 폼 동작 직접 확인**. preview 브라우저 자동 검증은 사용자 선호상 사용 안 함.
- **migration은 코드가 적용하지 않는다** — `v4/scripts/migrations/016_marketing_config.sql` 파일을 만들고, **사용자가 Supabase Dashboard SQL Editor에서 수동 적용**(dflo 관례, 기존 000~015와 동일). 폼은 테이블이 없거나 빈 경우에도 crash 없이 빈 기본값을 보여줘야 한다.
- strict 주의: 타입 전용 import는 `import type`. 미사용 변수 금지. `@/*`→`src/*`.
- **router.tsx WIP 공존**: 작업 트리의 router.tsx에는 사용자의 미커밋 GrowthLab 변경이 있다. Task 2.3에서 router.tsx를 수정·커밋하기 전, **컨트롤러가 `git stash push -- v4/src/app/router.tsx`로 사용자 WIP를 격리**하고, 청크 커밋 후 `git stash pop`으로 복원한다(Phase 1과 동일 절차). 구현 서브에이전트는 router.tsx에 마케팅 추가분만 넣고, 자신의 파일만 `git add`한다.
- 커밋 메시지 끝에 항상 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.
- 모든 명령은 `c:\projects\dflo_0.1\v4`에서. 셸 cwd가 호출 간 리셋될 수 있으니 명시 경로/`git -C` 사용.

---

## File Structure

```
v4/scripts/migrations/016_marketing_config.sql        # CREATE 테이블 + RLS + 시드 INSERT (사용자 수동 적용)
v4/src/features/marketing/
  types.ts                                            # MODIFY: BlogCategory, MarketingConfig 추가
  services/marketingConfigService.ts                  # CREATE fetchConfig/saveConfig + snake↔camel 매핑
  components/
    SettingsFields.tsx                                # CREATE 재사용 입력: Field, TagInput, CategoryEditor
    MarketingSettings.tsx                             # CREATE 4섹션 편집 폼 (load/save/state)
    MarketingSidebar.tsx                              # MODIFY: "설정" 5번째 NAV 항목
v4/src/app/router.tsx                                 # MODIFY: /marketing/settings 자식 라우트(lazy)
```

---

## Chunk 1: 데이터 계층 (migration + types + service)

### Task 1.1: migration SQL

**Files:**
- Create: `v4/scripts/migrations/016_marketing_config.sql`

- [ ] **Step 1: SQL 작성** (EXACT content)

```sql
-- 016_marketing_config.sql
-- 마케팅 SP1: 연세새봄 브랜드 보이스 설정 (단일 행). Supabase Dashboard SQL Editor에서 1회 적용.
create table if not exists marketing_config (
  id            int primary key default 1,
  brand_name        text,
  brand_description text,
  target_audience   text,
  usp               text,
  brand_tone        text,
  banned_keywords   text[] default '{}',
  marketer_name      text,
  marketer_expertise text,
  marketer_style     text,
  marketer_phrases   text[] default '{}',
  blog_rules        text,
  blog_categories   jsonb default '[]'::jsonb,
  blog_image_style  text,
  target_languages  text[] default '{ko,th,vi,en}',
  ai_model          text default 'gemini-2.5-flash',
  updated_at        timestamptz default now(),
  constraint marketing_config_singleton check (id = 1)
);

-- dflo 관례(013과 동일): RLS on + anon/authenticated 전체 허용 정책.
alter table marketing_config enable row level security;
drop policy if exists marketing_config_all on marketing_config;
create policy marketing_config_all on marketing_config
  for all to anon, authenticated using (true) with check (true);

-- 연세새봄 시드 (출발점; 이후 /marketing/settings 에서 편집).
insert into marketing_config (
  id, brand_name, brand_description, target_audience, usp, brand_tone, banned_keywords,
  marketer_name, marketer_expertise, marketer_style, marketer_phrases,
  blog_rules, blog_categories, blog_image_style, target_languages, ai_model
) values (
  1,
  '187 성장클리닉',
  '소아 성장·성조숙증 전문 클리닉(연세새봄의원, 강남 압구정). 뼈나이 분석·성장호르몬 치료·생활습관 코칭. 국내외(의료관광) 진료.',
  '키 성장이 고민인 아이의 부모(주 결정자: 어머니)',
  '1,000+ 치료사례, 호르몬 통합 관점의 성장 진료, 원장 직접 진료',
  '부모 눈높이의 쉬운 설명 + 의학적 근거, 과장 없는 신뢰형 톤',
  '{과장,확정적 효과 보장}',
  '채용현 원장',
  '소아 성장·성조숙증 전문의, 뼈나이/성장호르몬',
  '쌍둥이 아빠 의사 — 전문성과 부모 공감을 함께 가진 화자',
  '{우리 아이 키}',
  E'1. 순수 텍스트만 출력 (HTML 태그·마크다운·코드블록 금지)\n2. 첫 줄에 검색에 잘 걸리는 매력적인 제목\n3. 소제목은 ■ 기호 사용 (예: ■ 성장호르몬이란?)\n4. 단락 구분은 빈 줄\n5. 1500~2500자\n6. 부모 눈높이에 맞는 쉬운 설명\n7. 의학적 근거 + 실제 임상 경험 기반\n8. 과장 금지, 의료 광고법 준수\n9. 마지막에 "※ 본 글은 의학적 정보 제공을 목적으로 하며, 개인마다 차이가 있을 수 있습니다."\n10. 네이버 SEO를 위해 핵심 키워드를 자연스럽게 3~5회 반복',
  '[
    {"code":"A","name":"성장과학","context":"성장 의학/과학 지식을 쉽게 풀어 설명하는 정보형 콘텐츠입니다. 의학적 근거를 바탕으로 부모님이 이해하기 쉽게 작성합니다."},
    {"code":"B","name":"부모공감","context":"부모님의 걱정과 고민에 공감하면서 전문의 시각으로 답변하는 콘텐츠입니다. Q&A 형식이나 고민 해결형으로 작성합니다."},
    {"code":"D","name":"생활습관","context":"키 성장에 도움이 되는 실질적인 생활 습관 가이드입니다. 수면, 식단, 운동, 자세 등 실천 가능한 팁 위주로 작성합니다."},
    {"code":"E","name":"기타/트렌드","context":"시즌별 이슈, 통계, 트렌드 등 시의성 있는 콘텐츠입니다. 최신 데이터와 흥미로운 관점으로 작성합니다."}
  ]'::jsonb,
  '깔끔한 의료/건강 정보 일러스트, 밝고 신뢰감 있는 톤, 텍스트 최소',
  '{ko,th,vi,en}',
  'gemini-2.5-flash'
)
on conflict (id) do nothing;
```

- [ ] **Step 2: SQL 문법 sanity 체크** (적용은 사용자가) — 따옴표 균형·`E'...'` 이스케이프 확인. 실제 적용은 Step 3에서 사용자에게 안내만 한다(코드가 dflo Supabase에 접근 불가).

- [ ] **Step 3: Commit**

```bash
git add scripts/migrations/016_marketing_config.sql
git commit -m "feat(marketing): add marketing_config table migration + seed"
```

> ⚠️ 이 migration은 **사용자가 Supabase Dashboard에서 적용**해야 폼이 데이터를 읽고 쓸 수 있다. 구현/리뷰는 코드 레벨까지만 검증.

---

### Task 1.2: 타입 추가

**Files:**
- Modify: `v4/src/features/marketing/types.ts`

- [ ] **Step 1: 파일 끝에 추가** (EXACT content)

```ts
export interface BlogCategory {
  code: string;
  name: string;
  context: string;
}

export interface MarketingConfig {
  brandName: string;
  brandDescription: string;
  targetAudience: string;
  usp: string;
  brandTone: string;
  bannedKeywords: string[];
  marketerName: string;
  marketerExpertise: string;
  marketerStyle: string;
  marketerPhrases: string[];
  blogRules: string;
  blogCategories: BlogCategory[];
  blogImageStyle: string;
  targetLanguages: string[];
  aiModel: string;
}
```

- [ ] **Step 2: 타입 체크** → `npx tsc --noEmit` 통과

---

### Task 1.3: 설정 서비스

**Files:**
- Create: `v4/src/features/marketing/services/marketingConfigService.ts`

> 참고: `saveConfig`는 스펙 §6의 `Partial<MarketingConfig>` 스케치 대신 **전체 객체**를 받는다(폼이 항상 완전한 config를 들고 있고 싱글턴 행을 통째 upsert하므로 더 단순·정확). SP3a 계약은 `fetchConfig()` + `MarketingConfig` 타입에만 의존하므로 영향 없음.

- [ ] **Step 1: 작성** (EXACT content) — 기존 공용 클라이언트 `@/shared/lib/supabase` 사용.

```ts
// src/features/marketing/services/marketingConfigService.ts
import { supabase } from '@/shared/lib/supabase';
import type { MarketingConfig, BlogCategory } from '../types';

const EMPTY: MarketingConfig = {
  brandName: '',
  brandDescription: '',
  targetAudience: '',
  usp: '',
  brandTone: '',
  bannedKeywords: [],
  marketerName: '',
  marketerExpertise: '',
  marketerStyle: '',
  marketerPhrases: [],
  blogRules: '',
  blogCategories: [],
  blogImageStyle: '',
  targetLanguages: ['ko'],
  aiModel: 'gemini-2.5-flash',
};

type Row = Record<string, unknown>;

function rowToConfig(r: Row | null): MarketingConfig {
  if (!r) return { ...EMPTY };
  return {
    brandName: (r.brand_name as string) ?? '',
    brandDescription: (r.brand_description as string) ?? '',
    targetAudience: (r.target_audience as string) ?? '',
    usp: (r.usp as string) ?? '',
    brandTone: (r.brand_tone as string) ?? '',
    bannedKeywords: (r.banned_keywords as string[]) ?? [],
    marketerName: (r.marketer_name as string) ?? '',
    marketerExpertise: (r.marketer_expertise as string) ?? '',
    marketerStyle: (r.marketer_style as string) ?? '',
    marketerPhrases: (r.marketer_phrases as string[]) ?? [],
    blogRules: (r.blog_rules as string) ?? '',
    blogCategories: (r.blog_categories as BlogCategory[]) ?? [],
    blogImageStyle: (r.blog_image_style as string) ?? '',
    targetLanguages: (r.target_languages as string[]) ?? ['ko'],
    aiModel: (r.ai_model as string) ?? 'gemini-2.5-flash',
  };
}

function configToRow(c: MarketingConfig): Row {
  return {
    id: 1,
    brand_name: c.brandName,
    brand_description: c.brandDescription,
    target_audience: c.targetAudience,
    usp: c.usp,
    brand_tone: c.brandTone,
    banned_keywords: c.bannedKeywords,
    marketer_name: c.marketerName,
    marketer_expertise: c.marketerExpertise,
    marketer_style: c.marketerStyle,
    marketer_phrases: c.marketerPhrases,
    blog_rules: c.blogRules,
    blog_categories: c.blogCategories,
    blog_image_style: c.blogImageStyle,
    target_languages: c.targetLanguages,
    ai_model: c.aiModel,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchConfig(): Promise<MarketingConfig> {
  const { data, error } = await supabase
    .from('marketing_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    // 테이블 미적용/네트워크 등 — 폼이 빈 기본값으로 뜨도록 swallow.
    console.warn('[marketing] fetchConfig failed:', error.message);
    return { ...EMPTY };
  }
  return rowToConfig(data as Row | null);
}

export async function saveConfig(config: MarketingConfig): Promise<void> {
  const { error } = await supabase
    .from('marketing_config')
    .upsert(configToRow(config), { onConflict: 'id' });
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 2: 타입 체크** → `npx tsc --noEmit` 통과

- [ ] **Step 3: Commit**

```bash
git add src/features/marketing/types.ts src/features/marketing/services/marketingConfigService.ts
git commit -m "feat(marketing): MarketingConfig type + config service (client-direct Supabase)"
```

---

## Chunk 2: UI (필드 헬퍼 + 폼 + 사이드바/라우터)

### Task 2.1: 재사용 입력 컴포넌트

**Files:**
- Create: `v4/src/features/marketing/components/SettingsFields.tsx`

- [ ] **Step 1: 작성** (EXACT content)

```tsx
// src/features/marketing/components/SettingsFields.tsx
import type { BlogCategory } from '../types';

export function Field({
  label,
  value,
  onChange,
  textarea,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          rows={rows ?? 3}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4A2D6B] focus:outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4A2D6B] focus:outline-none"
        />
      )}
    </label>
  );
}

export function TagInput({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label} (쉼표 구분)</span>
      <input
        value={values.join(', ')}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4A2D6B] focus:outline-none"
      />
    </label>
  );
}

export function CategoryEditor({
  values,
  onChange,
}: {
  values: BlogCategory[];
  onChange: (v: BlogCategory[]) => void;
}) {
  const update = (i: number, patch: Partial<BlogCategory>) =>
    onChange(values.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  const add = () => onChange([...values, { code: '', name: '', context: '' }]);

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-gray-500">블로그 카테고리</span>
      <div className="space-y-2">
        {values.map((c, i) => (
          <div key={i} className="rounded-lg border border-gray-200 p-2">
            <div className="mb-1 flex gap-2">
              <input
                value={c.code}
                onChange={(e) => update(i, { code: e.target.value })}
                placeholder="코드"
                className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
              />
              <input
                value={c.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="이름"
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
              />
              <button onClick={() => remove(i)} className="px-2 text-sm text-gray-400 hover:text-red-500">
                ✕
              </button>
            </div>
            <textarea
              value={c.context}
              rows={2}
              onChange={(e) => update(i, { context: e.target.value })}
              placeholder="컨텍스트"
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
        ))}
      </div>
      <button onClick={add} className="mt-2 text-xs text-[#4A2D6B] hover:underline">
        + 카테고리 추가
      </button>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크** → `npx tsc --noEmit` 통과

---

### Task 2.2: 설정 폼

**Files:**
- Create: `v4/src/features/marketing/components/MarketingSettings.tsx`

- [ ] **Step 1: 작성** (EXACT content)

```tsx
// src/features/marketing/components/MarketingSettings.tsx
import { useEffect, useState, type ReactNode } from 'react';
import type { MarketingConfig } from '../types';
import { fetchConfig, saveConfig } from '../services/marketingConfigService';
import { Field, TagInput, CategoryEditor } from './SettingsFields';

const LANGS = ['ko', 'th', 'vi', 'en'];

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-bold text-[#4A2D6B]">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function MarketingSettings() {
  const [config, setConfig] = useState<MarketingConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig().then(setConfig);
  }, []);

  if (!config) return <div className="p-6 text-sm text-gray-400">불러오는 중…</div>;

  const set = <K extends keyof MarketingConfig>(key: K, value: MarketingConfig[K]) => {
    setConfig({ ...config, [key]: value });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      await saveConfig(config);
      setSaved(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const toggleLang = (l: string) =>
    set(
      'targetLanguages',
      config.targetLanguages.includes(l)
        ? config.targetLanguages.filter((x) => x !== l)
        : [...config.targetLanguages, l],
    );

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">마케팅 설정</h1>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-emerald-600">✓ 저장됨</span>}
          {err && <span className="text-xs text-red-500">{err}</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[#4A2D6B] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>

      <SectionCard title="브랜드">
        <Field label="브랜드명" value={config.brandName} onChange={(v) => set('brandName', v)} />
        <Field label="브랜드 설명" value={config.brandDescription} onChange={(v) => set('brandDescription', v)} textarea />
        <Field label="타겟 고객" value={config.targetAudience} onChange={(v) => set('targetAudience', v)} />
        <Field label="USP (차별점)" value={config.usp} onChange={(v) => set('usp', v)} textarea />
        <Field label="브랜드 톤" value={config.brandTone} onChange={(v) => set('brandTone', v)} />
        <TagInput label="금지 키워드" values={config.bannedKeywords} onChange={(v) => set('bannedKeywords', v)} />
      </SectionCard>

      <SectionCard title="마케터 페르소나">
        <Field label="이름" value={config.marketerName} onChange={(v) => set('marketerName', v)} />
        <Field label="전문성" value={config.marketerExpertise} onChange={(v) => set('marketerExpertise', v)} />
        <Field label="스타일" value={config.marketerStyle} onChange={(v) => set('marketerStyle', v)} textarea />
        <TagInput label="자주 쓰는 말투" values={config.marketerPhrases} onChange={(v) => set('marketerPhrases', v)} />
      </SectionCard>

      <SectionCard title="블로그 생성 설정">
        <Field label="작성 규칙" value={config.blogRules} onChange={(v) => set('blogRules', v)} textarea rows={10} />
        <CategoryEditor values={config.blogCategories} onChange={(v) => set('blogCategories', v)} />
        <Field label="이미지 스타일" value={config.blogImageStyle} onChange={(v) => set('blogImageStyle', v)} textarea />
      </SectionCard>

      <SectionCard title="일반">
        <div>
          <span className="mb-1 block text-xs font-medium text-gray-500">타겟 언어</span>
          <div className="flex gap-2">
            {LANGS.map((l) => (
              <button
                key={l}
                onClick={() => toggleLang(l)}
                className={`rounded-full px-3 py-1 text-xs ${
                  config.targetLanguages.includes(l) ? 'bg-[#4A2D6B] text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <Field label="AI 모델" value={config.aiModel} onChange={(v) => set('aiModel', v)} />
      </SectionCard>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크** → `npx tsc --noEmit` 통과. (`ReactNode`는 `import { ..., type ReactNode } from 'react'`로 가져온다 — `react-jsx` 자동 런타임에선 `React` 네임스페이스가 스코프에 없으므로 `React.ReactNode`를 쓰면 안 됨.)

- [ ] **Step 3: lint** → `npx eslint src/features/marketing/components/MarketingSettings.tsx src/features/marketing/components/SettingsFields.tsx` 클린

- [ ] **Step 4: Commit**

```bash
git add src/features/marketing/components/SettingsFields.tsx src/features/marketing/components/MarketingSettings.tsx
git commit -m "feat(marketing): settings form (brand/persona/blog/general sections)"
```

---

### Task 2.3: 사이드바 + 라우터 배선

> **컨트롤러 선행 작업**: router.tsx 수정 전, 사용자 WIP 격리 — `git stash push -m wip-router -- v4/src/app/router.tsx`. 이 청크 커밋 후 `git stash pop`으로 복원.

**Files:**
- Modify: `v4/src/features/marketing/components/MarketingSidebar.tsx`
- Modify: `v4/src/app/router.tsx`

- [ ] **Step 1: 사이드바에 "설정" 항목 추가** — `MarketingSidebar.tsx`의 `NAV` 배열 끝에:

```tsx
  { to: '/marketing/settings', label: '설정', end: false },
```

- [ ] **Step 2: 라우터에 lazy import 추가** — 기존 4개 마케팅 lazy import 옆에:

```tsx
const MarketingSettings = lazy(() =>
  import('@/features/marketing/components/MarketingSettings').then((m) => ({ default: m.MarketingSettings })),
);
```

- [ ] **Step 3: `/marketing` children 배열에 settings 라우트 추가** (기존 topics 자식 뒤):

```tsx
      {
        path: 'settings',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <MarketingSettings />
          </Suspense>
        ),
      },
```

- [ ] **Step 4: 타입 체크 + 빌드** → `npx tsc --noEmit` 통과, `npx vite build` 성공.

- [ ] **Step 5: lint** → `npx eslint src/features/marketing` 클린(router.tsx의 기존 react-refresh 사전 경고는 무관, 신규 위반 0).

- [ ] **Step 6: Commit** (자신의 파일만 — router.tsx는 사용자 WIP 격리 상태이므로 마케팅 추가분만 담김)

```bash
git add src/features/marketing/components/MarketingSidebar.tsx src/app/router.tsx
git commit -m "feat(marketing): wire /marketing/settings route + sidebar item"
```

> 커밋 후 컨트롤러가 `git stash pop`으로 사용자 router.tsx WIP 복원 + `npx tsc --noEmit`로 공존 확인.

---

## 완료 기준 (Definition of Done)

- `016_marketing_config.sql` 작성(테이블 + RLS-on permissive + 연세새봄 시드). **사용자가 Dashboard 적용** 후:
  - `/marketing/settings`(PIN `8054`) 4섹션에 시드값 표시 → 편집 → 저장 → 새로고침 후 유지.
- 테이블 미적용 상태에서도 폼이 빈 기본값으로 crash 없이 렌더(`fetchConfig` swallow).
- `npx tsc --noEmit` 통과, `npx vite build` 성공, 마케팅 lint 클린.
- `MarketingConfig` 타입 + `fetchConfig`/`saveConfig` 확정(SP3a가 이 계약으로 소비).
- 런타임 외부 의존 0(dflo Supabase만), 외부 API 키 미저장.
- 사용자 router.tsx WIP는 격리→복원으로 보존(제 커밋에 미포함).
