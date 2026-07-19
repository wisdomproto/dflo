import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
// constants.mjs 가 빌드 상수의 단일 소스 — 여기 사본을 두면 `SITE_PATH_PREFIX` 가 조용히 어긋난다
// (staging 은 /test 로 오버라이드하므로, 사본이 남으면 JSON-LD 의 @id·url 만 옛 프리픽스를 가리켜
//  같은 페이지의 canonical/hreflang 과 다른 URL 을 주장하게 된다).
// ★seo.mjs 가 아니라 constants.mjs 에서 가져오는 이유: seo.mjs 는 이 파일을 import 하므로
//  여기서 seo.mjs 를 되짚으면 순환 참조가 된다.
import { ORIGIN, PATH_PREFIX } from './constants.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const CLINIC_NAME = '연세새봄의원 187 성장클리닉';
const CLINIC_PHONE = '+82-10-6693-2838'; // 해외 페이지 — 국제 발신 가능한 휴대폰(1599 는 국제 착신 불가)
const CLINIC_PHONE_KR = '1599-0741';     // 한국어 페이지 대표번호(전국대표번호)
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
  // th markets a Bangkok-office remote-consult flow, so signal TH as a served area too.
  const areaServed = lang === 'th' ? ['KR', 'TH'] : 'KR';
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalClinic',
    name: CLINIC_NAME,
    url: `${ORIGIN}${PATH_PREFIX}/${lang}/`,
    logo: `${ORIGIN}/images/logo.jpg`,
    image: `${ORIGIN}${PATH_PREFIX}/og/og-${lang}.jpg`,
    medicalSpecialty: 'Pediatrics',
    telephone: lang === 'ko' ? CLINIC_PHONE_KR : CLINIC_PHONE,
    address: CLINIC_ADDRESS,
    areaServed,
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
    image: `${ORIGIN}/images/doctor.jpg`,
    url: `${ORIGIN}${PATH_PREFIX}/${lang}/clinic.html`,
    jobTitle: 'Director',
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
    // 저자 = 원장(소아과 전문의). E-E-A-T/GEO 권위 신호 — AI 인용 시 "누가 썼나"의 근거.
    // physicianJsonLd 와 같은 이름·clinic.html url 로 엔티티 연결.
    author: {
      '@type': 'Person',
      name: DIRECTOR_NAME,
      jobTitle: 'Pediatrician',
      url: `${ORIGIN}${PATH_PREFIX}/${lang}/clinic.html`,
    },
    reviewedBy: {
      '@type': 'Person',
      name: DIRECTOR_NAME,
      jobTitle: 'Pediatrician',
    },
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
