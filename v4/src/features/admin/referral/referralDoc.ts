// Builds the printable referral-note HTML (used by both on-screen preview and the print window).
import {
  REFERRAL_STRINGS,
  SIGNATORY,
  XRAY_ITEMS,
  labGroups,
  type DocKind,
  type ReferralLang,
} from './referralTemplates';

export interface ReferralPatient {
  name: string;
  dob: string; // ISO yyyy-mm-dd
  gender: 'male' | 'female';
  address: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** yyyy-mm-dd → "28 November 2007" (English format, universally readable). */
export function formatDocDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso || '—';
  const [, y, mo, d] = m;
  return `${Number(d)} ${MONTHS[Number(mo) - 1] ?? mo} ${y}`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const paras = (text: string): string =>
  text
    .split('\n\n')
    .map((p) => `<p class="rf-body">${esc(p)}</p>`)
    .join('');

export const REFERRAL_DOC_CSS = `
.rf-doc { font-family: 'Times New Roman', Georgia, serif; color: #1a1a1a; max-width: 720px;
  margin: 0 auto; padding: 32px 40px; font-size: 13.5px; line-height: 1.65; background: #fff; }
.rf-doc + .rf-doc { page-break-before: always; margin-top: 48px; }
.rf-title { text-align: center; font-size: 16px; font-weight: 700; letter-spacing: .3px;
  margin: 0 0 20px; }
.rf-meta { margin: 2px 0; }
.rf-h3 { font-size: 14px; font-weight: 700; margin: 18px 0 6px; }
.rf-info { list-style: none; padding: 0; margin: 0 0 14px; }
.rf-info li { margin: 1px 0; }
.rf-info b { font-weight: 400; display: inline-block; min-width: 130px; }
.rf-greeting { margin: 14px 0 8px; }
.rf-body { margin: 8px 0; }
.rf-req-h { font-weight: 700; margin: 14px 0 6px; }
.rf-list { margin: 4px 0 12px; padding-left: 22px; }
.rf-list li { margin: 2px 0; }
.rf-grp { font-weight: 700; margin: 10px 0 2px; }
.rf-sincerely { margin: 18px 0 0; }
.rf-sign { display: block; height: 64px; margin: 6px 0 2px; object-fit: contain; }
.rf-sig p { margin: 1px 0; }
.rf-sig .nm { font-weight: 700; }
@media print { body { margin: 0; } .rf-doc { padding: 24px 32px; } }
`;

function buildOne(
  kind: DocKind,
  lang: ReferralLang,
  patient: ReferralPatient,
  today: string,
  index: number | null,
): string {
  const S = REFERRAL_STRINGS[lang];
  const title = kind === 'xray' ? S.titleXray : S.titleLab;
  const to = kind === 'xray' ? S.toXray : S.toLab;
  const subject = kind === 'xray' ? S.subjectXray : S.subjectLab;
  const body = kind === 'xray' ? S.bodyXray : S.bodyLab;
  const reqHeading = kind === 'xray' ? S.reqXrayHeading : S.reqLabHeading;
  const closing = kind === 'xray' ? S.closingXray : S.closingLab;
  const genderLabel = patient.gender === 'female' ? S.female : S.male;

  const list =
    kind === 'xray'
      ? `<ol class="rf-list">${XRAY_ITEMS.map((i) => `<li>${esc(i)}</li>`).join('')}</ol>`
      : labGroups(patient.gender)
          .map(
            (g) =>
              `<p class="rf-grp">${esc(g.title)}</p><ul class="rf-list">${g.items
                .map((i) => `<li>${esc(i)}</li>`)
                .join('')}</ul>`,
          )
          .join('');

  const titleText = index !== null ? `${index}. ${title}` : title;

  return `<div class="rf-doc">
  <h2 class="rf-title">${esc(titleText)}</h2>
  <p class="rf-meta">${esc(S.dateLabel)}: ${esc(today)}</p>
  <p class="rf-meta">${esc(to)}</p>
  <p class="rf-meta">${esc(subject)}</p>
  <h3 class="rf-h3">${esc(S.patientInfo)}</h3>
  <ul class="rf-info">
    <li><b>${esc(S.lblName)}</b>${esc(patient.name || '—')}</li>
    <li><b>${esc(S.lblDob)}</b>${esc(formatDocDate(patient.dob))}</li>
    <li><b>${esc(S.lblGender)}</b>${esc(genderLabel)}</li>
    <li><b>${esc(S.lblAddress)}</b>${esc(patient.address || '—')}</li>
  </ul>
  <p class="rf-greeting">${esc(S.greeting)}</p>
  ${paras(body)}
  <p class="rf-req-h">${esc(reqHeading)}</p>
  ${list}
  <p class="rf-body">${esc(closing)}</p>
  <p class="rf-body">${esc(S.thanks)}</p>
  <p class="rf-sincerely">${esc(S.sincerely)}</p>
  <img class="rf-sign" src="/images/referral-signature.png" alt="${esc(S.signatureLabel)}" />
  <div class="rf-sig">
    <p class="nm">${esc(SIGNATORY.name)}</p>
    <p>${esc(SIGNATORY.title)}</p>
    <p>${esc(SIGNATORY.address)}</p>
    <p>${esc(SIGNATORY.phone)}</p>
  </div>
</div>`;
}

/** Build the inner HTML for the selected doc kinds (numbered only when both). */
export function buildReferralHtml(
  lang: ReferralLang,
  kinds: DocKind[],
  patient: ReferralPatient,
): string {
  const today = formatDocDate(new Date().toISOString().slice(0, 10));
  const both = kinds.length > 1;
  return kinds
    .map((k, i) => buildOne(k, lang, patient, today, both ? i + 1 : null))
    .join('\n');
}
