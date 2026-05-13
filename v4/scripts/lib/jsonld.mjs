import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const ORIGIN = 'https://www.dr187growup.com';
const CLINIC_NAME = '연세새봄의원 187 성장클리닉';
const CLINIC_PHONE = '+82-2-XXX-XXXX';  // TODO: confirm with clinic admin
const CLINIC_ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: 'TBD',
  addressLocality: 'Seoul',
  addressRegion: 'Seoul',
  postalCode: 'TBD',
  addressCountry: 'KR',
};
const DIRECTOR_NAME = 'TBD';

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
    url: `${ORIGIN}/${lang}/`,
    logo: `${ORIGIN}/images/logo.jpg`,
    image: `${ORIGIN}/test/og/og-${lang}.jpg`,
    medicalSpecialty: 'Pediatrics',
    telephone: CLINIC_PHONE,
    address: CLINIC_ADDRESS,
    areaServed: 'KR',
  };
}

export function physicianJsonLd(lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    name: DIRECTOR_NAME,
    medicalSpecialty: 'Pediatrics',
    worksFor: {
      '@type': 'MedicalClinic',
      name: CLINIC_NAME,
      url: `${ORIGIN}/${lang}/`,
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

export function renderJsonLd(obj) {
  return `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;
}
