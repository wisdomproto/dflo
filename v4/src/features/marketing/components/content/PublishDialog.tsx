// src/features/marketing/components/content/PublishDialog.tsx
// 콘텐츠별 발행 모달. contentKind에 따라 타겟이 달라진다:
//  - blog  → 자체 사이트(언어 자동). [미리보기] upsert draft + 미리보기 열기 / [발행] upsert published + 큐(website) 행.
//  - cardnews/post → 선택 언어와 locale 일치하는 활성 소셜 계정(IG/FB/Threads) 선택 → 큐 행.
import { useEffect, useMemo, useState } from 'react';
import type { MarketingArticle } from '../../types';
import {
  fetchChannels,
  localeFlag,
  type MarketingChannel,
} from '../../services/marketingChannelService';
import { enqueue, type PublishChannel } from '../../services/marketingPublishService';
import type { ContentKind } from '../../utils/publishRows';
import {
  upsertPublishedBlog,
  blogPreviewPath,
  blogStaticPath,
} from '../../services/blogPublishService';

const SOCIAL_PLATFORMS: PublishChannel[] = ['instagram', 'facebook', 'threads'];

interface Props {
  article: MarketingArticle;
  contentKind: ContentKind;
  initialLanguage: string;
  onClose: () => void;
  onDone: () => void;
}

export function PublishDialog({ article, contentKind, initialLanguage, onClose, onDone }: Props) {
  const [language, setLanguage] = useState(initialLanguage);
  const [channels, setChannels] = useState<MarketingChannel[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // 발행 가능한 언어 = 마스터(ko) + 본문 있는 번역
  const languageOptions = useMemo(() => {
    const opts = ['ko'];
    for (const [lang, t] of Object.entries(article.translations ?? {})) {
      if (t?.body?.trim()) opts.push(lang);
    }
    return opts;
  }, [article.translations]);

  useEffect(() => {
    fetchChannels().then(setChannels).catch(() => setChannels([]));
  }, []);

  const matchingChannels = channels.filter(
    (c) => c.isActive && c.locale === language && SOCIAL_PLATFORMS.includes(c.platform as PublishChannel),
  );

  const igSelectedForText = contentKind === 'post' &&
    matchingChannels.some((c) => selected.has(c.id) && c.platform === 'instagram');

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── 블로그: 미리보기 / 정식 발행 ──
  const publishBlog = async (status: 'draft' | 'published') => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const pub = await upsertPublishedBlog(article, language, 'draft');
      if (status === 'draft') {
        window.open(blogPreviewPath(article.id, language), '_blank');
        setMsg('미리보기로 저장했습니다. 새 탭에서 확인하세요.');
      } else {
        await enqueue({
          articleId: article.id,
          language,
          contentKind: 'blog',
          targets: [{ channelId: null, channel: 'website' }],
        });
        setMsg(`발행 큐에 등록 완료. 다음 배포 시 ${blogStaticPath(language, pub.slug)} 로 반영됩니다.`);
        onDone();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : '발행 실패');
    } finally {
      setBusy(false);
    }
  };

  // ── 소셜: 선택 계정 큐 추가 ──
  const publishSocial = async () => {
    if (selected.size === 0) {
      setErr('계정을 1개 이상 선택하세요.');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const targets = matchingChannels
        .filter((c) => selected.has(c.id))
        .map((c) => ({ channelId: c.id, channel: c.platform as PublishChannel }));
      await enqueue({ articleId: article.id, language, contentKind, targets });
      setMsg('발행 큐에 추가했습니다.');
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '큐 추가 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">
            발행 큐에 넣기 — {contentKind === 'blog' ? '자체 사이트 블로그' : contentKind === 'cardnews' ? '카드뉴스' : '기본글'}
          </h2>
          <button type="button" aria-label="닫기" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">언어 버전</span>
          <select
            value={language}
            onChange={(e) => { setLanguage(e.target.value); setSelected(new Set()); }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {languageOptions.map((l) => (
              <option key={l} value={l}>{localeFlag(l)} {l}</option>
            ))}
          </select>
        </label>

        {contentKind === 'blog' ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">자체 사이트 <code>/{language}/blog/…</code> 에 발행합니다. (구글 SEO)</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => publishBlog('draft')}
                disabled={busy}
                className="flex-1 rounded-lg border border-[#4A2D6B] px-3 py-2 text-sm font-semibold text-[#4A2D6B] disabled:opacity-40"
              >
                미리보기
              </button>
              <button
                type="button"
                onClick={() => publishBlog('published')}
                disabled={busy}
                className="flex-1 rounded-lg bg-[#4A2D6B] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                발행 큐에 넣기
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <span className="block text-xs font-medium text-gray-500">
              발행 계정 ({localeFlag(language)} {language} · 활성 소셜)
            </span>
            {matchingChannels.length === 0 ? (
              <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">
                이 언어의 활성 IG/FB/Threads 계정이 없습니다. "채널 설정"에서 먼저 등록하세요.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {matchingChannels.map((c) => {
                  const on = selected.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggle(c.id)}
                      className={`rounded-full px-3 py-1 text-xs ${on ? 'bg-[#4A2D6B] text-white font-semibold' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {on ? '✓ ' : ''}{c.platform} · {c.name}
                    </button>
                  );
                })}
              </div>
            )}
            {igSelectedForText && (
              <p className="text-[11px] text-amber-600">⚠️ 기본글(텍스트)은 Instagram에 발행할 수 없습니다 — IG는 카드뉴스(이미지)만.</p>
            )}
            <button
              type="button"
              onClick={publishSocial}
              disabled={busy || matchingChannels.length === 0 || igSelectedForText}
              className="w-full rounded-lg bg-[#4A2D6B] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              발행 큐에 넣기
            </button>
          </div>
        )}

        {msg && <p className="text-xs text-emerald-600">{msg}</p>}
        {err && <p className="text-xs text-red-500">{err}</p>}
      </div>
    </div>
  );
}
