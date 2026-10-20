import type { IntakeSubmission, UploadMeta } from '@/features/intake/types';
import type { IntakeSurvey } from '@/shared/types';
// 런타임 import 는 상대경로 — scripts/test 의 node --test(tsx)가 @/ 별칭을 못 푼다.
// (위 두 줄은 `import type` 이라 컴파일 시 지워지므로 별칭이어도 무방.)
import { ACQUISITION_KO, INTAKE_LABELS, optLabelKo } from '../../intake/intakeLabels';

// ================================================
// intakeDoc
// 설문 제출 1건 → 인쇄용(PDF) HTML. 순수 함수 — 어드민이 새 창에 써서 window.print().
// 라벨은 한국어(스태프용, intakeLabels.ko 재사용), 값은 환자가 제출한 원문 그대로.
// 소견서(referralDoc.ts)와 같은 패턴.
// ================================================

/** 마법사가 저장하지만 IntakeSurvey 타입엔 아직 없는 필드들. */
type SurveyExtras = {
  growth_ref_country?: string;
  growth_standard?: string;
  acquisition_keyword?: string | null;
};

const L = INTAKE_LABELS.ko;

function esc(v: unknown): string {
  return String(v ?? '').replace(
    /[&<>]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string,
  );
}

function val(v: unknown): string {
  return v === null || v === undefined || v === '' ? '—' : String(v);
}

function yn(v: boolean | null | undefined): string {
  return v === true ? L.yes : v === false ? L.no : '—';
}

function unit(v: unknown, u: string): string {
  return v === null || v === undefined || v === '' ? '—' : `${v} ${u}`;
}

/** 생년월일 → 제출 시점의 만 나이. 둘 중 하나라도 없으면 빈 문자열. */
export function ageAt(birthDate: string | undefined, isoAt: string): string {
  if (!birthDate) return '';
  const bd = new Date(birthDate);
  const at = new Date(isoAt);
  if (Number.isNaN(bd.getTime()) || Number.isNaN(at.getTime())) return '';
  let months = (at.getFullYear() - bd.getFullYear()) * 12 + (at.getMonth() - bd.getMonth());
  if (at.getDate() < bd.getDate()) months -= 1;
  if (months < 0) return '';
  return `만 ${Math.floor(months / 12)}세 ${months % 12}개월`;
}

function row(label: string, value: string): string {
  return `<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>`;
}

function section(title: string, rows: string): string {
  return rows.trim() ? `<section><h2>${esc(title)}</h2><table>${rows}</table></section>` : '';
}

export const INTAKE_DOC_CSS = `
@page { size: A4; margin: 14mm 12mm; }
* { box-sizing: border-box; }
/* Malgun Gothic = 한글, Leelawadee UI/Noto Sans Thai = 태국어 이름 등 원문 값 */
body { font-family: "Malgun Gothic", "맑은 고딕", "Leelawadee UI", "Noto Sans Thai", "Nirmala UI", sans-serif; color: #1a1a1a; font-size: 10.5pt; margin: 0; }
h1 { font-size: 16pt; margin: 0 0 2px; }
.sub { color: #666; font-size: 9pt; margin-bottom: 14px; }
h2 { font-size: 11pt; margin: 16px 0 6px; padding: 4px 8px; background: #f1eef7; border-left: 3px solid #703080; }
table { width: 100%; border-collapse: collapse; margin-bottom: 2px; }
th, td { border: 1px solid #d8d8d8; padding: 4px 7px; text-align: left; vertical-align: top; }
th { background: #fafafa; width: 30%; font-weight: 600; color: #444; }
table.hist th, table.hist td { text-align: center; width: auto; }
table.up th { width: auto; }
section { break-inside: avoid; }
.note { white-space: pre-wrap; background: #fffbe9; border: 1px solid #f0e0a0; padding: 8px; font-size: 9.5pt; }
footer { margin-top: 18px; color: #888; font-size: 8pt; border-top: 1px solid #ddd; padding-top: 6px; }
/* 첨부: 한 장당 한 페이지. 원본 PDF 페이지·X-ray 를 이미지로 얹는다(intakeAttachments.ts) */
.att { page-break-before: always; break-before: page; margin: 0; }
.att figcaption { font-size: 9pt; color: #666; margin: 0 0 4px; }
.att img { display: block; width: 100%; height: auto; }
.att-miss { page-break-before: always; break-before: page; color: #b45309; font-size: 10pt; }
`;

/** 파일명·제목에 쓸 환자 이름. 영문명 우선(현지 병원·OS 양쪽에서 안전). */
export function intakeSubjectName(sub: IntakeSubmission): string {
  return sub.name_en?.trim() || sub.name?.trim() || '설문';
}

/** 인쇄 창 제목 + 사용자가 저장할 때 뜨는 파일명. */
export function intakeDocTitle(sub: IntakeSubmission): string {
  return `${intakeSubjectName(sub)} 사전 문진`;
}

/**
 * @param attachmentsHtml 첨부 페이지 HTML(`buildAttachmentPagesHtml`). 비우면 목록만 나간다.
 */
export function buildIntakeHtml(sub: IntakeSubmission, attachmentsHtml = ''): string {
  const q = (sub.intake_survey ?? {}) as Partial<IntakeSurvey> & SurveyExtras;
  const age = ageAt(sub.birth_date, sub.created_at);

  const basic = [
    row(L.name, val(sub.name)),
    row(L.nameEn, val(sub.name_en)),
    row(L.gender, sub.gender === 'male' ? L.male : sub.gender === 'female' ? L.female : '—'),
    row(L.birth, age ? `${val(sub.birth_date)} (${age})` : val(sub.birth_date)),
    row(L.country, val(sub.country)),
    row(L.currentH, unit(sub.current_height, 'cm')),
    row(L.currentW, unit(sub.current_weight, 'kg')),
    row(L.fatherH, unit(sub.father_height, 'cm')),
    row(L.motherH, unit(sub.mother_height, 'cm')),
    row(L.desiredH, unit(sub.desired_height, 'cm')),
    row(L.grade, val(sub.grade)),
    row(L.classRank, val(sub.class_height_rank)),
    row('성장 기준 국가', val(q.growth_ref_country ?? q.growth_standard)),
    row(L.phone, val(sub.phone)),
    row(L.email, val(sub.email)),
    row(L.address, val(sub.address)),
    row(L.gestWeeks, unit(q.gestational_weeks, '주')),
    row(L.birthWeight, unit(q.birth_weight, 'kg')),
    row(L.birthNote, val(q.birth_note)),
  ].join('');

  const hist = q.growth_history ?? [];
  const histTable = hist.length
    ? `<table class="hist"><tr><th>${esc(L.ageCol)}</th>${hist
        .map((h) => `<td>${esc(h.age)}</td>`)
        .join('')}</tr><tr><th>${esc(L.heightCol)}</th>${hist
        .map((h) => `<td>${h.height ?? '—'}</td>`)
        .join('')}</tr></table>`
    : '';
  const flags = q.growth_flags;
  const growth =
    row(L.yearlyGrowth, val(q.yearly_growth)) +
    row(L.flagRapid, yn(flags?.rapid_growth)) +
    row(L.flagSlowed, yn(flags?.slowed)) +
    row(L.flagPuberty, yn(flags?.puberty_concern));

  const family = [
    row(L.pastConsult, yn(q.past_clinic_consult)),
    row(L.parentsInterested, yn(q.parents_interested)),
    row(L.childInterested, yn(q.child_interested)),
    row(L.sportsAthlete, yn(q.sports_athlete)),
    row(L.sportsEvent, val(q.sports_event)),
    row(
      L.acquisitionChannel,
      q.acquisition_channel
        ? (ACQUISITION_KO[q.acquisition_channel] ?? q.acquisition_channel) +
            (q.acquisition_keyword ? ` (${q.acquisition_keyword})` : '')
        : '—',
    ),
  ].join('');

  const life = [
    row(L.sleepTime, val(q.sleep_time)),
    row(L.wakeTime, val(q.wake_time)),
    row(L.exerciseFreq, optLabelKo(L.exerciseOpts, q.exercise_frequency)),
    row(L.milkDaily, optLabelKo(L.milkOpts, q.milk_daily)),
    row(L.mealReg, optLabelKo(L.mealOpts, q.meal_regularity)),
  ].join('');

  const isMale = sub.gender === 'male';
  const medical = [
    row(L.chronic, val(q.chronic_conditions)),
    row(L.currentMeds, val(q.current_medications)),
    row(
      L.tanner,
      q.tanner_stage ? `${q.tanner_stage}단계 — ${L.tannerOpts[q.tanner_stage - 1] ?? ''}` : '—',
    ),
    isMale ? row(L.voiceChange, optLabelKo(L.voiceOpts, q.voice_change)) : '',
    isMale ? row(L.facialHair, optLabelKo(L.facialOpts, q.facial_hair)) : '',
    !isMale ? row(L.menarche, optLabelKo(L.menarcheOpts, q.menarche)) : '',
    !isMale ? row(L.breastDev, optLabelKo(L.breastOpts, q.breast_development)) : '',
  ].join('');

  const causes = [
    row(
      L.causes,
      (q.short_stature_causes ?? []).map((c) => optLabelKo(L.causeOpts, c)).join(', ') || '—',
    ),
    row(L.causesOther, val(q.short_stature_other)),
    row(L.additionalNotes, val(q.additional_notes)),
  ].join('');

  const uploads: UploadMeta[] = sub.uploads ?? [];
  const upRows = uploads
    .map(
      (u, i) =>
        `<tr><td>${i + 1}</td><td>${esc(u.kind)}</td><td>${esc(u.filename)}</td><td>${Math.round(
          (u.size ?? 0) / 1024,
        )} KB</td></tr>`,
    )
    .join('');

  return (
    `<h1>${esc(intakeDocTitle(sub))}</h1>` +
    `<div class="sub">제출일 ${esc(new Date(sub.created_at).toLocaleString('ko-KR'))} · 언어 ${esc(
      sub.lang,
    )} · 국가 ${esc(sub.country)} · 상태 ${esc(sub.status)}</div>` +
    section('기본 정보 / 출생 정보', basic) +
    (histTable
      ? `<section><h2>최근 성장 기록 (나이 · 키 cm)</h2>${histTable}<table>${growth}</table></section>`
      : section('최근 성장 기록', growth)) +
    section('가족 · 관심도 · 유입', family) +
    section(L.sLifeTitle, life) +
    section(L.s4Title, medical) +
    section(L.s5Title, causes) +
    (uploads.length
      ? `<section><h2>첨부 파일 (${uploads.length}건)</h2><table class="up"><tr><th>#</th><th>종류</th><th>파일명</th><th>크기</th></tr>${upRows}</table></section>`
      : '') +
    (sub.admin_note
      ? `<section><h2>내부 메모 (원내용)</h2><div class="note">${esc(sub.admin_note)}</div></section>`
      : '') +
    `<footer>187 성장클리닉 · 환자 셀프 문진 제출본 · submission ${esc(sub.id)}</footer>` +
    attachmentsHtml
  );
}
