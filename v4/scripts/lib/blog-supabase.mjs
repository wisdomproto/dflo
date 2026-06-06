import { createClient } from '@supabase/supabase-js';

// blog_published row → 기존 블로그 템플릿이 기대하는 포스트 shape.
export function publishedRowToPost(r) {
  return {
    slug: r.slug,
    title: r.seo_title ?? '',
    meta_description: r.meta_description ?? '',
    body_html: r.html_body ?? '',
    published_at: r.published_at ?? null,
  };
}

// 정적 빌드 시 published 블로그를 언어별로 로드. 키/URL 없으면 빈 객체(graceful).
export async function loadPublishedBlogAll(langs) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const result = {};
  for (const lang of langs) result[lang] = [];
  if (!url || !key) {
    console.warn('  [blog] VITE_SUPABASE_URL/ANON_KEY missing — skipping published blog load');
    return result;
  }
  const supabase = createClient(url, key);
  for (const lang of langs) {
    const { data, error } = await supabase
      .from('blog_published')
      .select('slug, seo_title, meta_description, html_body, published_at')
      .eq('language', lang)
      .eq('status', 'published');
    if (error) {
      console.warn(`  [blog] published load failed for ${lang}: ${error.message}`);
      continue;
    }
    result[lang] = (data ?? []).map(publishedRowToPost);
    console.log(`  [blog] loaded ${result[lang].length} published posts for ${lang}`);
  }
  return result;
}
