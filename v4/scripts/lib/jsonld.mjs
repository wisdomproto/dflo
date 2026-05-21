import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const ORIGIN = 'https://www.dr187growup.com';
const PATH_PREFIX = process.env.SITE_PATH_PREFIX ?? '';  // promoted to root in Phase 6 (override with /test for staging)
const CLINIC_NAME = '연세새봄의원 187 성장클리닉';
const CLINIC_PHONE = '+82-2-3395-0999';
const CLINIC_ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: '2F, Hwiseon Building, 328 Dosan-daero',
  addressLocality: 'Gangnam-gu',
  addressRegion: 'Seoul',
  postalCode: '06039',
  addressCountry: 'KR',
};
const CLINIC_SAME_AS = ['https://www.yssaebomq.com/'];
const DIRECTOR_NAME = 'Chae Young-hyun';
const DIRECTOR_NAME_KO = '채용현';

let seoCache = null;
function loadSeo() {
  if (!seoCache) seoCache = yaml.load(readFileSync(join(ROOT, 'i18n/seo.yml'), 'utf8'));
  return seoCache;
}

export function medicalClinicJsonLd(lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalClinic',
    name: CLINIC_NAME,
    url: `${ORIGIN}${PATH_PREFIX}/${lang}/`,
    logo: `${ORIGIN}/images/logo.jpg`,
    image: `${ORIGIN}${PATH_PREFIX}/og/og-${lang}.jpg`,
    medicalSpecialty: 'Pediatrics',
    telephone: CLINIC_PHONE,
    address: CLINIC_ADDRESS,
    areaServed: 'KR',
    sameAs: CLINIC_SAME_AS,
  };
}

export function physicianJsonLd(lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    name: DIRECTOR_NAME,
    alternateName: DIRECTOR_NAME_KO,
    medicalSpecialty: 'Pediatrics',
    worksFor: {
      '@type': 'MedicalClinic',
      name: CLINIC_NAME,
      url: `${ORIGIN}${PATH_PREFIX}/${lang}/`,
    },
  };
}

export function faqPageJsonLd(lang) {
  const seo = loadSeo()[lang];
  const faq = (seo && Array.isArray(seo.faq)) ? seo.faq : [];
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

export function blogPostingJsonLd({ post, lang }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.meta_description || '',
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    inLanguage: lang,
    url: `${ORIGIN}${PATH_PREFIX}/${lang}/blog/${post.slug}/`,
    publisher: {
      '@type': 'MedicalClinic',
      name: CLINIC_NAME,
      logo: { '@type': 'ImageObject', url: `${ORIGIN}/images/logo.jpg` },
    },
  };
}

export function renderJsonLd(obj) {
  return `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;
}
