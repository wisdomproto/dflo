-- 045: SEO blog content (62 topics × 4 languages) stored per-language on the content row.
-- Non-destructive: base article (title/body/translations) is untouched. The structured
-- SEO blog lives in a new JSONB column shown in the "블로그(SEO)" tab of /marketing/content.
--
-- blog shape:
-- {
--   "ko"|"en"|"th"|"vi": {
--     "seoTitle": str, "slug": str, "metaDescription": str, "h1": str,
--     "primaryKeyword": str, "secondaryKeywords": [str],
--     "sections": [{ "heading": str, "html": str, "imagePrompt": str, "imageUrl": str|null }],
--     "faq": [{ "q": str, "a": str }]
--   }
-- }
alter table marketing_articles
  add column if not exists blog jsonb default '{}'::jsonb;
