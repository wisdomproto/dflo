// src/features/marketing/components/content/CardNewsPanel.tsx
import { useEffect, useRef, useState } from 'react';
import type { Cardnews, CardnewsSlide, CardCanvasData, CardnewsTemplate, MarketingArticle } from '../../types';
import {
  fetchCardnews,
  createCardnews,
  updateCardnews,
  addSlide,
  updateSlide,
  deleteSlide,
  generateCardnewsSlides,
  type GeneratedSlide,
} from '../../services/cardnewsService';
import { CARDNEWS_TEMPLATES } from '../../data/cardnewsTemplates';
import { CardCanvas } from './CardCanvas';
import { ImageGenButton } from './ImageGenButton';

interface Props {
  article: MarketingArticle;
}

const ACCENT = '#4A2D6B';

const EMPTY_CANVAS: CardCanvasData = { bgColor: '#1b1340', imageUrl: null, imageY: 50, textBlocks: [] };

function slideToCanvas(s: GeneratedSlide): CardCanvasData {
  return {
    bgColor: '#1b1340',
    imageUrl: null,
    imageY: 50,
    textBlocks: [
      {
        id: crypto.randomUUID(),
        text: s.headline,
        x: 10,
        y: 15,
        fontSize: 30,
        color: '#ffffff',
        fontWeight: 'bold',
        textAlign: 'left',
        width: 80,
      },
      {
        id: crypto.randomUUID(),
        text: s.body,
        x: 10,
        y: 45,
        fontSize: 18,
        color: '#f0f0f0',
        fontWeight: 'normal',
        textAlign: 'left',
        width: 80,
      },
    ],
  };
}

export function CardNewsPanel({ article }: Props) {
  const [cardnews, setCardnews] = useState<Cardnews | null>(null);
  const [slides, setSlides] = useState<CardnewsSlide[]>([]);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Local header field state (debounced to DB).
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');

  const canvasTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const headerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const sortSlides = (list: CardnewsSlide[]) => [...list].sort((a, b) => a.sortOrder - b.sortOrder);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        let cn = await fetchCardnews(article.id);
        if (!cn) cn = await createCardnews(article.id);
        if (!alive) return;
        setCardnews(cn);
        setCaption(cn.caption);
        setHashtags(cn.hashtags.join(', '));
        const sorted = sortSlides(cn.slides);
        setSlides(sorted);
        setSelectedSlideId(sorted[0]?.id ?? null);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : '카드뉴스 로드 실패');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [article.id]);

  const reload = async () => {
    const cn = await fetchCardnews(article.id);
    if (!cn) return;
    setCardnews(cn);
    const sorted = sortSlides(cn.slides);
    setSlides(sorted);
    if (!sorted.find((s) => s.id === selectedSlideId)) setSelectedSlideId(sorted[0]?.id ?? null);
  };

  const onHeaderChange = (next: { caption?: string; hashtags?: string }) => {
    if (next.caption !== undefined) setCaption(next.caption);
    if (next.hashtags !== undefined) setHashtags(next.hashtags);
    if (!cardnews) return;
    if (headerTimer.current) clearTimeout(headerTimer.current);
    headerTimer.current = setTimeout(() => {
      const cap = next.caption !== undefined ? next.caption : caption;
      const tagsStr = next.hashtags !== undefined ? next.hashtags : hashtags;
      const tags = tagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      void updateCardnews(cardnews.id, { caption: cap, hashtags: tags });
    }, 800);
  };

  const handleGenerate = async () => {
    if (!cardnews) return;
    setGenerating(true);
    setError(null);
    try {
      const gen = await generateCardnewsSlides({ title: article.title, body: article.body, count: 6 });
      for (let i = 0; i < gen.length; i++) {
        const created = await addSlide(cardnews.id, slideToCanvas(gen[i]), slides.length + i);
        if (gen[i].imagePrompt) await updateSlide(created.id, { imagePrompt: gen[i].imagePrompt });
      }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '카드뉴스 생성 실패');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddBlank = async () => {
    if (!cardnews) return;
    try {
      const created = await addSlide(cardnews.id, { ...EMPTY_CANVAS }, slides.length);
      const next = sortSlides([...slides, created]);
      setSlides(next);
      setSelectedSlideId(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : '슬라이드 추가 실패');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSlide(id);
      const next = slides.filter((s) => s.id !== id);
      setSlides(next);
      if (selectedSlideId === id) setSelectedSlideId(next[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '슬라이드 삭제 실패');
    }
  };

  const patchSlideLocal = (id: string, patch: Partial<CardnewsSlide>) =>
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const onCanvasChange = (slide: CardnewsSlide, next: CardCanvasData) => {
    patchSlideLocal(slide.id, { canvas: next });
    if (canvasTimers.current[slide.id]) clearTimeout(canvasTimers.current[slide.id]);
    canvasTimers.current[slide.id] = setTimeout(() => {
      void updateSlide(slide.id, { canvas: next });
    }, 800);
  };

  const onPromptChange = (slide: CardnewsSlide, value: string) => {
    patchSlideLocal(slide.id, { imagePrompt: value });
    if (promptTimers.current[slide.id]) clearTimeout(promptTimers.current[slide.id]);
    promptTimers.current[slide.id] = setTimeout(() => {
      void updateSlide(slide.id, { imagePrompt: value });
    }, 800);
  };

  const applyTemplate = (slide: CardnewsSlide, tpl: CardnewsTemplate) => {
    const next: CardCanvasData = {
      ...slide.canvas,
      bgColor: tpl.bgColor,
      imageY: tpl.imageY,
      textBlocks: tpl.textBlocks.map((b) => ({ ...b, id: crypto.randomUUID() })),
    };
    patchSlideLocal(slide.id, { canvas: next });
    void updateSlide(slide.id, { canvas: next });
  };

  const onImageGenerated = (slide: CardnewsSlide, url: string) => {
    const next: CardCanvasData = { ...slide.canvas, imageUrl: url };
    patchSlideLocal(slide.id, { canvas: next });
    void updateSlide(slide.id, { canvas: next });
  };

  if (loading) return <div className="flex h-full items-center justify-center text-sm text-gray-400">불러오는 중…</div>;
  if (error && !cardnews)
    return <div className="flex h-full items-center justify-center text-sm text-red-600">{error}</div>;

  const selected = slides.find((s) => s.id === selectedSlideId) ?? null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 flex-col gap-2 border-b border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <input
            value={caption}
            onChange={(e) => onHeaderChange({ caption: e.target.value })}
            placeholder="캡션"
            className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="shrink-0 rounded px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: ACCENT }}
          >
            {generating ? '생성 중… (수십 초)' : '✨ 슬라이드 생성'}
          </button>
        </div>
        <input
          value={hashtags}
          onChange={(e) => onHeaderChange({ hashtags: e.target.value })}
          placeholder="해시태그 (쉼표로 구분)"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        />
        {error && <span className="text-[11px] text-red-600">{error}</span>}
      </div>

      {/* Two-pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT */}
        <div className="flex w-56 shrink-0 flex-col gap-3 overflow-y-auto border-r border-gray-200 p-3">
          <div>
            <div className="mb-1 text-xs font-semibold text-gray-500">템플릿</div>
            <div className="flex flex-col gap-1">
              {CARDNEWS_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  disabled={!selected}
                  onClick={() => selected && applyTemplate(selected, tpl)}
                  className="rounded border border-gray-300 px-2 py-1 text-left text-xs hover:border-[#4A2D6B] disabled:opacity-40"
                >
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-gray-500">슬라이드 ({slides.length})</div>
            <div className="flex flex-col gap-1">
              {slides.map((s, i) => (
                <div
                  key={s.id}
                  className={`flex items-center justify-between rounded border px-2 py-1 text-xs ${
                    s.id === selectedSlideId ? 'border-[#4A2D6B] bg-[#4A2D6B]/10' : 'border-gray-200'
                  }`}
                >
                  <button type="button" onClick={() => setSelectedSlideId(s.id)} className="flex-1 text-left">
                    슬라이드 {i + 1}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    className="ml-1 text-gray-400 hover:text-red-600"
                    title="삭제"
                  >
                    🗑
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddBlank}
                className="rounded border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-500 hover:border-[#4A2D6B] hover:text-[#4A2D6B]"
              >
                + 슬라이드
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex-1 overflow-y-auto p-4">
          {selected ? (
            <div className="flex flex-col gap-3">
              <CardCanvas canvas={selected.canvas} onChange={(next) => onCanvasChange(selected, next)} />
              <input
                value={selected.imagePrompt}
                onChange={(e) => onPromptChange(selected, e.target.value)}
                placeholder="이미지 프롬프트"
                className="rounded border border-gray-300 px-3 py-1.5 text-sm"
              />
              <ImageGenButton
                prompt={selected.imagePrompt}
                onGenerated={(url) => onImageGenerated(selected, url)}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              슬라이드가 없습니다. ✨ 슬라이드 생성 또는 + 슬라이드를 눌러 시작하세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
