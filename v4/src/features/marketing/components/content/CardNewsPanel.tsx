// src/features/marketing/components/content/CardNewsPanel.tsx
// 프롬프트 중심 카드뉴스 패널: 언어 탭 + 슬라이드별 이미지 프롬프트 + 완성 이미지 업로드 + 전체 복사 + 인라인 편집 + AI 재생성.
import { useEffect, useRef, useState } from 'react';
import type { Cardnews, CardnewsSlide, CardLang, MarketingArticle } from '../../types';
import { CARD_LANGS } from '../../types';
import {
  fetchCardnews, createCardnews, updateCardnews,
  addSlide, updateSlide, deleteSlide,
  generateCardnewsI18n, generateCaptions,
} from '../../services/cardnewsService';
import { uploadImageFile } from '../../services/aiImageService';

interface Props { article: MarketingArticle; }

const ACCENT = '#4A2D6B';
const LANG_LABELS: Record<CardLang, string> = { ko: '🇰🇷 한국어', en: '🇬🇧 EN', th: '🇹🇭 TH', vi: '🇻🇳 VI', ch: '🇹🇼 中文' };
const DOMAINS: Record<CardLang, string> = {
  ko: 'www.dr187growup.com', en: 'www.dr187growup.com/en', th: 'www.dr187growup.com/th',
  vi: 'www.dr187growup.com/vi', ch: 'www.dr187growup.com/ch',
};
const COMMON_STYLE = [
  '· 비율: 세로 2:3 (1024×1536)',
  '· 아트 스타일: 플랫 2D 벡터 일러스트. 굵고 둥근 형태, 단색 면(그라데이션 없음)에 옅은 드롭섀도우만. 사진·3D 아님.',
  '· 배경: 부드러운 보라색 세로 그라데이션 (#667eea → #764ba2), 넓은 여백.',
  '· 캐릭터: 모든 장에 같은 7~9세 한국 어린이(밝은 표정, 파스텔 옷). 장마다 동일 인물 유지.',
  '· 색: 텍스트는 흰색, 포인트 색은 민트(#33D6B5) 절제 사용.',
  '· 텍스트: 굵은 둥근 고딕, 또렷하게, 잘림·오타 없이. 지정된 문구만 넣고 다른 글자 추가 금지.',
  '· 피할 것: 사실적 사진, 무섭거나 우울한 분위기, 복잡한 배경, 잘린 글자, 깨진 글자, 워터마크.',
].join('\n');

function slidePromptText(s: CardnewsSlide, lang: CardLang): string {
  const t = s.texts[lang] ?? { headline: '', subtext: '' };
  let p = `[일러스트]\n${s.illustration}`;
  if (t.headline) p += `\n[헤드라인·정확히] 「${t.headline}」`;
  if (t.subtext) p += `\n[보조문구] 「${t.subtext}」`;
  if (s.isCta) p += `\n[로고] 상단 중앙에 첨부한 로고 이미지를 배치\n[도메인·하단] 「${DOMAINS[lang]}」`;
  return p;
}
function fullSlide(s: CardnewsSlide, lang: CardLang): string {
  return `[공통 스타일]\n${COMMON_STYLE}\n\n${slidePromptText(s, lang)}`;
}
function allSlides(slides: CardnewsSlide[], lang: CardLang): string {
  let p = `[공통 스타일 — 모든 카드 동일]\n${COMMON_STYLE}\n`;
  slides.forEach((s) => { p += `\n\n=== ${s.sortOrder}. ${s.role || '슬라이드'} ===\n${slidePromptText(s, lang)}`; });
  return p;
}

export function CardNewsPanel({ article }: Props) {
  const [cardnews, setCardnews] = useState<Cardnews | null>(null);
  const [slides, setSlides] = useState<CardnewsSlide[]>([]);
  const [lang, setLang] = useState<CardLang>('ko');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [genSlides, setGenSlides] = useState(false);
  const [genCap, setGenCap] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [uploadingImg, setUploadingImg] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<string | null>(null);

  const slideTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const cnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sortSlides = (l: CardnewsSlide[]) => [...l].sort((a, b) => a.sortOrder - b.sortOrder);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    (async () => {
      try {
        let cn = await fetchCardnews(article.id);
        if (!cn) cn = await createCardnews(article.id);
        if (!alive) return;
        setCardnews(cn);
        setSlides(sortSlides(cn.slides));
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : '로드 실패');
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [article.id]);

  const reload = async () => {
    const cn = await fetchCardnews(article.id);
    if (cn) { setCardnews(cn); setSlides(sortSlides(cn.slides)); }
  };

  const flash = (key: string) => { setCopied(key); setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200); };
  const copy = (text: string, key: string) => { void navigator.clipboard.writeText(text).then(() => flash(key)); };

  // ── 캡션/해시태그 인라인 편집 ──
  const queueCn = (id: string, patch: Parameters<typeof updateCardnews>[1]) => {
    if (cnTimer.current) clearTimeout(cnTimer.current);
    cnTimer.current = setTimeout(() => void updateCardnews(id, patch), 700);
  };
  const onCaptionChange = (value: string) => {
    if (!cardnews) return;
    const captions = { ...cardnews.captions, [lang]: value };
    setCardnews({ ...cardnews, captions });
    queueCn(cardnews.id, { captions });
  };
  const onHashtagChange = (value: string) => {
    if (!cardnews) return;
    const hashtagsI18n = { ...cardnews.hashtagsI18n, [lang]: value };
    setCardnews({ ...cardnews, hashtagsI18n });
    queueCn(cardnews.id, { hashtagsI18n });
  };

  // ── 슬라이드 인라인 편집 ──
  const patchLocal = (id: string, patch: Partial<CardnewsSlide>) =>
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const queueSlide = (id: string, patch: Parameters<typeof updateSlide>[1]) => {
    if (slideTimers.current[id]) clearTimeout(slideTimers.current[id]);
    slideTimers.current[id] = setTimeout(() => void updateSlide(id, patch), 700);
  };
  const onIllustration = (s: CardnewsSlide, value: string) => {
    patchLocal(s.id, { illustration: value }); queueSlide(s.id, { illustration: value });
  };
  const onText = (s: CardnewsSlide, field: 'headline' | 'subtext', value: string) => {
    const texts = { ...s.texts, [lang]: { ...s.texts[lang], [field]: value } };
    patchLocal(s.id, { texts }); queueSlide(s.id, { texts });
  };

  // ── 완성 이미지 업로드(GPT로 만든 이미지) — canvas.imageUrl 저장 ──
  const onUploadImg = async (s: CardnewsSlide, file?: File) => {
    if (!file) return;
    setUploadingImg(s.id); setError(null);
    try {
      const url = await uploadImageFile(file);
      const canvas = { ...s.canvas, imageUrl: url };
      patchLocal(s.id, { canvas });
      await updateSlide(s.id, { canvas });
    } catch (e) { setError(e instanceof Error ? e.message : '이미지 업로드 실패'); }
    finally { setUploadingImg(null); }
  };
  const removeImg = async (s: CardnewsSlide) => {
    const canvas = { ...s.canvas, imageUrl: null };
    patchLocal(s.id, { canvas });
    await updateSlide(s.id, { canvas });
  };

  // 여러 이미지를 파일명 순으로 각 슬라이드에 순서대로 배치
  const onBulkUpload = async (files?: FileList | null) => {
    if (!files || !files.length || !slides.length) return;
    const arr = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const target = sortSlides(slides);
    const count = Math.min(arr.length, target.length);
    setError(null);
    for (let i = 0; i < count; i++) {
      setBulkProgress(`${i + 1}/${count}`);
      try {
        const url = await uploadImageFile(arr[i]);
        const canvas = { ...target[i].canvas, imageUrl: url };
        patchLocal(target[i].id, { canvas });
        await updateSlide(target[i].id, { canvas });
      } catch (e) { setError(`#${i + 1} 업로드 실패: ${e instanceof Error ? e.message : ''}`); }
    }
    if (arr.length > target.length) setError(`이미지 ${arr.length}장 중 ${count}장만 배치됨 (슬라이드 ${target.length}개). 남은 이미지는 슬라이드를 추가한 뒤 올려주세요.`);
    setBulkProgress(null);
  };

  // ── AI 재생성 ──
  const handleGenSlides = async () => {
    if (!cardnews) return;
    if (slides.length && !confirm('기존 슬라이드를 모두 지우고 다시 생성합니다. 계속할까요?')) return;
    setGenSlides(true); setError(null);
    try {
      const gen = await generateCardnewsI18n({ title: article.title, body: article.body });
      for (const s of slides) await deleteSlide(s.id);
      for (let i = 0; i < gen.length; i++) {
        await addSlide(cardnews.id, i + 1, { illustration: gen[i].illustration, texts: gen[i].texts, role: gen[i].role, isCta: gen[i].isCta });
      }
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : '슬라이드 생성 실패'); }
    finally { setGenSlides(false); }
  };
  const handleGenCaptions = async () => {
    if (!cardnews) return;
    setGenCap(true); setError(null);
    try {
      const { captions, hashtags } = await generateCaptions({ title: article.title, body: article.body });
      await updateCardnews(cardnews.id, { captions, hashtagsI18n: hashtags });
      setCardnews({ ...cardnews, captions, hashtagsI18n: hashtags });
    } catch (e) { setError(e instanceof Error ? e.message : '캡션 생성 실패'); }
    finally { setGenCap(false); }
  };

  const handleAdd = async () => {
    if (!cardnews) return;
    const created = await addSlide(cardnews.id, slides.length + 1, { role: '본문' });
    setSlides(sortSlides([...slides, created]));
  };
  const handleDelete = async (id: string) => {
    await deleteSlide(id);
    setSlides((prev) => prev.filter((s) => s.id !== id));
  };

  if (loading) return <div className="flex h-full items-center justify-center text-sm text-gray-400">불러오는 중…</div>;
  if (error && !cardnews) return <div className="flex h-full items-center justify-center text-sm text-red-600">{error}</div>;

  const caption = cardnews?.captions[lang] ?? '';
  const hashtag = cardnews?.hashtagsI18n[lang] ?? '';

  return (
    <div className="flex h-full flex-col">
      {/* 언어 탭 + 액션 */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 p-3">
        {CARD_LANGS.map((l) => (
          <button key={l} type="button" onClick={() => setLang(l)}
            className={`rounded-full px-3 py-1 text-xs ${l === lang ? 'text-white' : 'text-gray-600 ring-1 ring-gray-300'}`}
            style={l === lang ? { backgroundColor: ACCENT } : undefined}>
            {LANG_LABELS[l]}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => copy(allSlides(slides, lang), 'all')} disabled={!slides.length}
            className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40">
            {copied === 'all' ? '✅ 복사됨' : `📋 ${LANG_LABELS[lang]} 전체 복사`}
          </button>
          <label className="cursor-pointer rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
            {bulkProgress ? `업로드 ${bulkProgress}` : '🖼 이미지 일괄 업로드'}
            <input type="file" accept="image/*" multiple hidden disabled={!!bulkProgress}
              onChange={(e) => { void onBulkUpload(e.target.files); e.target.value = ''; }} />
          </label>
          <button type="button" onClick={handleGenSlides} disabled={genSlides}
            className="rounded px-3 py-1 text-xs font-semibold text-white disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
            {genSlides ? '생성 중…' : '✨ 슬라이드 재생성'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {error && <div className="mb-2 text-[11px] text-red-600">{error}</div>}

        {/* 캡션 / 해시태그 */}
        <div className="mb-4 rounded-lg border border-gray-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">📝 캡션 · 해시태그 ({LANG_LABELS[lang]})</span>
            <div className="flex gap-2">
              <button type="button" onClick={handleGenCaptions} disabled={genCap}
                className="rounded px-2 py-0.5 text-[11px] font-semibold text-white disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
                {genCap ? '생성 중…' : '✨ AI 생성'}
              </button>
              <button type="button" onClick={() => copy(`${caption}\n\n${hashtag}`, 'cap')}
                className="rounded bg-gray-700 px-2 py-0.5 text-[11px] text-white">{copied === 'cap' ? '✅' : '복사'}</button>
            </div>
          </div>
          <textarea value={caption} onChange={(e) => onCaptionChange(e.target.value)} placeholder="캡션 (게시글 본문)"
            rows={4} className="mb-2 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
          <textarea value={hashtag} onChange={(e) => onHashtagChange(e.target.value)} placeholder="#해시태그 ..."
            rows={2} className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs" />
        </div>

        {/* 공통 스타일 */}
        <details className="mb-4 rounded-lg bg-[#1a1a2e] p-3 text-[11px] text-gray-300">
          <summary className="cursor-pointer font-semibold text-indigo-300">[공통 스타일 — 모든 카드 동일]</summary>
          <pre className="mt-2 whitespace-pre-wrap font-sans">{COMMON_STYLE}</pre>
        </details>

        {/* 슬라이드 */}
        <div className="flex flex-col gap-3">
          {slides.map((s) => {
            const t = s.texts[lang] ?? { headline: '', subtext: '' };
            return (
              <div key={s.id} className="rounded-lg border border-gray-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded bg-[#eef0ff] px-2 py-0.5 text-[11px] font-semibold" style={{ color: ACCENT }}>
                    {s.sortOrder}. {s.role || '슬라이드'}{s.isCta ? ' · CTA' : ''}
                  </span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => copy(fullSlide(s, lang), s.id)}
                      className="rounded px-2 py-0.5 text-[11px] font-semibold text-white" style={{ backgroundColor: ACCENT }}>
                      {copied === s.id ? '✅ 복사됨' : '📋 이 장 복사'}
                    </button>
                    <button type="button" onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-600" title="삭제">🗑</button>
                  </div>
                </div>

                {/* 완성 이미지 (GPT로 만든 이미지 업로드) */}
                {s.canvas.imageUrl ? (
                  <div className="relative mb-2">
                    <img src={s.canvas.imageUrl} alt="" className="w-full rounded border border-gray-200" style={{ aspectRatio: '2 / 3', objectFit: 'cover' }} />
                    <label className="absolute bottom-1 left-1 cursor-pointer rounded bg-black/60 px-2 py-0.5 text-[11px] text-white">
                      {uploadingImg === s.id ? '교체 중…' : '🔄 교체'}
                      <input type="file" accept="image/*" hidden disabled={uploadingImg === s.id}
                        onChange={(e) => { void onUploadImg(s, e.target.files?.[0] ?? undefined); e.target.value = ''; }} />
                    </label>
                    <button type="button" onClick={() => removeImg(s)}
                      className="absolute right-1 top-1 rounded bg-black/60 px-2 py-0.5 text-[11px] text-white">✕</button>
                  </div>
                ) : (
                  <label className="mb-2 block cursor-pointer rounded border border-dashed border-gray-300 py-6 text-center text-xs text-gray-500 hover:border-[#4A2D6B] hover:text-[#4A2D6B]">
                    {uploadingImg === s.id ? '업로드 중…' : '🖼 GPT로 만든 이미지 업로드 (1024×1536)'}
                    <input type="file" accept="image/*" hidden disabled={uploadingImg === s.id}
                      onChange={(e) => { void onUploadImg(s, e.target.files?.[0] ?? undefined); e.target.value = ''; }} />
                  </label>
                )}

                <textarea value={s.illustration} onChange={(e) => onIllustration(s, e.target.value)} placeholder="일러스트 프롬프트 (언어 공통)"
                  rows={4} className="mb-2 w-full rounded border border-gray-300 px-2 py-1.5 text-xs" />
                <input value={t.headline} onChange={(e) => onText(s, 'headline', e.target.value)} placeholder={`헤드라인 (${lang})`}
                  className="mb-1 w-full rounded border border-gray-300 px-2 py-1 text-sm font-semibold" />
                <input value={t.subtext} onChange={(e) => onText(s, 'subtext', e.target.value)} placeholder={`보조문구 (${lang})`}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
                {s.isCta && <div className="mt-1 text-[11px] text-[#4A2D6B]">🔗 {DOMAINS[lang]} + 로고 첨부</div>}
              </div>
            );
          })}
          <button type="button" onClick={handleAdd}
            className="rounded border border-dashed border-gray-300 px-2 py-2 text-xs text-gray-500 hover:border-[#4A2D6B] hover:text-[#4A2D6B]">
            + 슬라이드
          </button>
        </div>
      </div>
    </div>
  );
}
