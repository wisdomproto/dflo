import { Link } from 'react-router-dom';
import { usePosts } from './usePosts';

interface Props { lang: 'ko' | 'th' }

export default function BlogList({ lang }: Props) {
  const { posts, loading } = usePosts(lang);
  const pathBase = lang === 'ko' ? '/blog' : `/${lang}/blog`;
  if (loading) return <div className="p-8 text-center">로딩 중…</div>;

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        {lang === 'ko' ? '187 성장 가이드' : '187 Growth Guide'}
      </h1>
      <ul className="space-y-4">
        {posts.map((p) => (
          <li key={p.id} className="border-b pb-4">
            <Link to={`${pathBase}/${p.slug}`} className="block hover:opacity-70">
              <h2 className="text-xl font-semibold">{p.title}</h2>
              <p className="text-sm text-gray-600 mt-1">{p.meta_description}</p>
              <time className="text-xs text-gray-400 mt-1 block">
                {new Date(p.published_at).toLocaleDateString(lang)}
              </time>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
