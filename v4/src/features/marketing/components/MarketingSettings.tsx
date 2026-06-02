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
            type="button"
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
                type="button"
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
