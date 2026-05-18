import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePost } from './usePosts';

interface Props { lang: 'ko' | 'th' }

export default function BlogPost({ lang }: Props) {
  const { slug = '' } = useParams<{ slug: string }>();
  const { post, loading } = usePost(lang, slug);

  // Remove prerendered article node (build-blog.mjs injects it for bots)
  useEffect(() => {
    document.querySelectorAll(`[data-blog-prerendered][data-slug="${slug}"][data-lang="${lang}"]`)
      .forEach((el) => el.remove());
  }, [slug, lang]);

  if (loading) return <div className="p-8 text-center">로딩 중…</div>;
  if (!post) return <div className="p-8 text-center">글을 찾을 수 없습니다.</div>;

  return (
    <main className="max-w-3xl mx-auto p-6 prose">
      <h1>{post.title}</h1>
      <time className="text-sm text-gray-500">
        {new Date(post.published_at).toLocaleDateString(lang)}
      </time>
      <div dangerouslySetInnerHTML={{ __html: post.body_html }} />
    </main>
  );
}
