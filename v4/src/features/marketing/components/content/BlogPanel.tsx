// src/features/marketing/components/content/BlogPanel.tsx
import { useEffect, useRef, useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
  MarketingArticle, BlogContent, BlogCard, BlogCardContent, BlogCardType, GlobalCardStyle,
} from '../../types';
import {
  fetchBlogContents, createBlogContent, updateBlogContent,
  addCard, updateCard, deleteCard, reorderCards, generateBlog,
} from '../../services/blogChannelService';
import { calculateNaverSeoScore } from '../../utils/seoScorer';
import { WorkflowStepBar } from './WorkflowStepBar';
import { SeoScorePanel } from './SeoScorePanel';
import { BlogCardItem } from './BlogCardItem';

const ACCENT = '#4A2D6B';
type Step = 1 | 2 | 3 | 4;

interface Props {
  article: MarketingArticle;
}

// ── Sortable wrapper around BlogCardItem ────────────────────────────────────
function SortableCard({
  card, globalStyle, onChange, onDelete,
}: {
  card: BlogCard;
  globalStyle: GlobalCardStyle;
  onChange: (content: BlogCardContent) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <BlogCardItem
        card={card}
        globalStyle={globalStyle}
        onChange={onChange}
        onDelete={onDelete}
        dragHandleProps={{ ...listeners, style: { touchAction: 'none' } }}
      />
    </div>
  );
}

export function BlogPanel({ article }: Props) {
  const [blog, setBlog] = useState<BlogContent | null>(null);
  const [cards, setCards] = useState<BlogCard[]>([]);
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local editable copies (debounced-persisted)
  const [primaryKeyword, setPrimaryKeyword] = useState('');
  const [secondaryRaw, setSecondaryRaw] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [globalStyle, setGlobalStyle] = useState<GlobalCardStyle>({});

  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSeoScore = useRef<number>(-1);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  // Load / create the single blog content for this article.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const list = await fetchBlogContents(article.id);
        let b = list[0] ?? null;
        if (!b) b = await createBlogContent(article.id, 'naver_blog');
        if (cancelled) return;
        setBlog(b);
        setCards(b.cards);
        setPrimaryKeyword(b.primaryKeyword);
        setSecondaryRaw(b.secondaryKeywords.join(', '));
        setSeoTitle(b.seoTitle);
        setGlobalStyle(b.globalStyle ?? {});
        lastSeoScore.current = b.seoScore;
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '불러오기 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [article.id]);

  function debouncedPersist(patch: Parameters<typeof updateBlogContent>[1]) {
    if (!blog) return;
    if (debRef.current) clearTimeout(debRef.current);
    const id = blog.id;
    debRef.current = setTimeout(() => {
      updateBlogContent(id, patch).catch((e) =>
        setError(e instanceof Error ? e.message : '저장 실패'));
    }, 800);
  }

  const secondaryKeywords = secondaryRaw.split(',').map((s) => s.trim()).filter(Boolean);

  function onKeywordsChange(primary: string, raw: string) {
    setPrimaryKeyword(primary);
    setSecondaryRaw(raw);
    const secondary = raw.split(',').map((s) => s.trim()).filter(Boolean);
    debouncedPersist({ primaryKeyword: primary, secondaryKeywords: secondary });
  }

  function onStyleChange(patch: Partial<GlobalCardStyle>) {
    const next = { ...globalStyle, ...patch };
    setGlobalStyle(next);
    debouncedPersist({ globalStyle: next });
  }

  async function refetchCards() {
    if (!blog) return;
    const list = await fetchBlogContents(article.id);
    const fresh = list.find((b) => b.id === blog.id);
    if (fresh) setCards(fresh.cards);
  }

  async function handleGenerate() {
    if (!blog) return;
    setGenerating(true);
    setError(null);
    try {
      const generated = await generateBlog({
        title: article.title,
        body: article.body,
        primaryKeyword,
        secondaryKeywords,
        channel: blog.channel,
      });
      for (let i = 0; i < generated.length; i++) {
        const gc = generated[i];
        const created = await addCard(blog.id, gc.cardType, i);
        await updateCard(created.id, { text: gc.text, imagePrompt: gc.imagePrompt });
      }
      await refetchCards();
    } catch (e) {
      setError(e instanceof Error ? e.message : '블로그 생성 실패');
    } finally {
      setGenerating(false);
    }
  }

  async function handleAddCard(cardType: BlogCardType) {
    if (!blog) return;
    try {
      await addCard(blog.id, cardType, cards.length);
      await refetchCards();
    } catch (e) {
      setError(e instanceof Error ? e.message : '카드 추가 실패');
    }
  }

  function handleCardChange(id: string, content: BlogCardContent) {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, content } : c)));
    updateCard(id, content).catch((e) => setError(e instanceof Error ? e.message : '저장 실패'));
  }

  function handleCardDelete(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id));
    deleteCard(id).catch((e) => setError(e instanceof Error ? e.message : '삭제 실패'));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = cards.findIndex((c) => c.id === active.id);
    const newIdx = cards.findIndex((c) => c.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(cards, oldIdx, newIdx);
    setCards(reordered);
    reorderCards(reordered.map((c) => c.id)).catch((e) =>
      setError(e instanceof Error ? e.message : '순서 변경 실패'));
  }

  function onSeoTitleChange(value: string) {
    setSeoTitle(value);
    debouncedPersist({ seoTitle: value });
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center text-sm text-gray-400">불러오는 중…</div>;
  }
  if (!blog) {
    return <div className="flex h-full items-center justify-center text-sm text-gray-400">N블로그 채널을 불러올 수 없습니다.</div>;
  }

  const seo = calculateNaverSeoScore(seoTitle, cards, {
    primary: primaryKeyword,
    secondary: secondaryKeywords,
  });
  // Persist score on step 4 when it changes.
  if (step === 4 && seo.score !== lastSeoScore.current) {
    lastSeoScore.current = seo.score;
    debouncedPersist({ seoScore: seo.score });
  }

  const inputCls = 'w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 focus:border-gray-400 focus:outline-none';

  // ── Editable cards list (steps 2/3) ──
  const cardsEditor = (
    <div className="space-y-3">
      {/* Global style bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-600">
        <select
          value={globalStyle.align ?? 'left'}
          onChange={(e) => onStyleChange({ align: e.target.value as GlobalCardStyle['align'] })}
          className="rounded border border-gray-200 px-1.5 py-1"
        >
          <option value="left">왼쪽</option>
          <option value="center">가운데</option>
          <option value="right">오른쪽</option>
          <option value="justify">양쪽</option>
        </select>
        <select
          value={globalStyle.bodyFont ?? 'Noto Sans KR'}
          onChange={(e) => onStyleChange({ bodyFont: e.target.value })}
          className="rounded border border-gray-200 px-1.5 py-1"
        >
          <option value="Noto Sans KR">Noto Sans KR</option>
          <option value="serif">Serif</option>
        </select>
        <label className="flex items-center gap-1">본문
          <input type="number" min={10} max={32} value={globalStyle.bodySize ?? 16}
            onChange={(e) => onStyleChange({ bodySize: Number(e.target.value) })}
            className="w-14 rounded border border-gray-200 px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1">제목
          <input type="number" min={14} max={40} value={globalStyle.headingSize ?? 22}
            onChange={(e) => onStyleChange({ headingSize: Number(e.target.value) })}
            className="w-14 rounded border border-gray-200 px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={globalStyle.headingBold ?? false}
            onChange={(e) => onStyleChange({ headingBold: e.target.checked })} />제목 볼드
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={globalStyle.bodyBold ?? false}
            onChange={(e) => onStyleChange({ bodyBold: e.target.checked })} />본문 볼드
        </label>
      </div>

      {/* Cards */}
      {cards.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">카드가 없습니다. 생성하거나 추가하세요.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {cards.map((c) => (
              <SortableCard
                key={c.id}
                card={c}
                globalStyle={globalStyle}
                onChange={(content) => handleCardChange(c.id, content)}
                onDelete={() => handleCardDelete(c.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {/* Add card row */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="self-center text-gray-400">+ 카드 추가:</span>
        {(['text', 'image', 'divider'] as BlogCardType[]).map((t) => (
          <button key={t} type="button" onClick={() => handleAddCard(t)}
            className="rounded-md border border-gray-200 px-2.5 py-1 font-medium text-gray-600 hover:bg-gray-50">
            {t === 'text' ? '본문' : t === 'image' ? '이미지' : '구분선'}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-gray-200 p-3">
        <WorkflowStepBar current={step} onJump={setStep} />
      </div>

      {error && <p className="px-4 pt-2 text-xs text-red-500">{error}</p>}

      <div className="flex-1 overflow-y-auto p-4">
        {step === 1 && (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">주요 키워드</span>
              <input type="text" value={primaryKeyword}
                onChange={(e) => onKeywordsChange(e.target.value, secondaryRaw)}
                placeholder="예: 소아 성장" className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">보조 키워드 (쉼표 구분)</span>
              <input type="text" value={secondaryRaw}
                onChange={(e) => onKeywordsChange(primaryKeyword, e.target.value)}
                placeholder="예: 키 크는 법, 성장판" className={inputCls} />
            </label>
            <p className="text-xs text-gray-400">키워드는 SEO 점수에 반영됩니다.</p>
          </div>
        )}

        {(step === 2 || step === 3) && (
          <div className="space-y-4">
            <button type="button" onClick={handleGenerate} disabled={generating}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}>
              {generating ? '생성 중… (수십 초)' : '✨ 블로그 카드 생성'}
            </button>
            {cardsEditor}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">SEO 제목</span>
              <input type="text" value={seoTitle}
                onChange={(e) => onSeoTitleChange(e.target.value)}
                placeholder="검색 노출용 제목" className={inputCls} />
            </label>
            <SeoScorePanel result={seo} />
          </div>
        )}
      </div>
    </div>
  );
}
