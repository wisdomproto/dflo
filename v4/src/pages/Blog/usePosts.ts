import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_CONTENTFLOW_API || 'https://contentflow.vercel.app';
const PROJECT_ID = import.meta.env.VITE_CONTENTFLOW_PROJECT_ID || '6cc3c9c6-1718-4097-b7a0-0f95ae74d913';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  meta_description: string;
  body_html: string;
  published_at: string;
  language: string;
  tags: string[];
}

export function usePosts(lang: 'ko' | 'th') {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/api/blog/by-project/${PROJECT_ID}/posts?lang=${lang}`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) { setPosts(j.posts || []); setLoading(false); }})
      .catch(() => { if (!cancelled) { setLoading(false); }});
    return () => { cancelled = true; };
  }, [lang]);
  return { posts, loading };
}

export function usePost(lang: 'ko' | 'th', slug: string) {
  const { posts, loading } = usePosts(lang);
  return { post: posts.find((p) => p.slug === slug) || null, loading };
}
