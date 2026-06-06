// src/features/marketing/components/BlogPreviewPage.tsx
// 자체 사이트 블로그 동적 미리보기 — blog_published 런타임 렌더. noindex(공개 인덱싱은 정적만).
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { fetchPublished, type PublishedBlog } from '../services/blogPublishService';

export function BlogPreviewPage() {
  const { articleId = '' } = useParams();
  const [params] = useSearchParams();
  const lang = params.get('lang') || 'ko';
  const [post, setPost] = useState<PublishedBlog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchPublished(articleId).then((rows) => {
      if (!alive) return;
      setPost(rows.find((r) => r.language === lang) ?? null);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [articleId, lang]);

  if (loading) return <div className="p-10 text-center text-sm text-gray-400">불러오는 중…</div>;
  if (!post) return <div className="p-10 text-center text-sm text-gray-400">발행본이 없습니다. 먼저 발행하세요.</div>;

  return (
    <div className="mx-auto max-w-[740px] px-6 py-8">
      <div className="mb-4 rounded bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
        미리보기 (noindex) · 상태: {post.status} · /{post.language}/blog/{post.slug}
      </div>
      <h1 className="text-3xl font-black leading-snug text-gray-900">{post.seoTitle}</h1>
      <article
        className="prose mt-6 max-w-none text-[16px] leading-[1.85] text-gray-800"
        dangerouslySetInnerHTML={{ __html: post.htmlBody }}
      />
    </div>
  );
}
