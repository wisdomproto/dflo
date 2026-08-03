import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/shared/lib/supabase';
import { countryLabel } from '@/shared/data/countries';
import {
  approveSubmission,
  rejectSubmission,
  reopenSubmission,
  suggestChartNumber,
} from '@/features/admin/services/intakeSubmissionService';
import type { ReferralPrefill } from '@/features/admin/referral/referralDoc';
import type { IntakeSubmission, UploadMeta } from '@/features/intake/types';
import { ACQUISITION_KO, INTAKE_LABELS, optLabelKo } from '@/features/intake/intakeLabels';
import IntakeSubmissionEditForm from './IntakeSubmissionEditForm';

// ================================================
// IntakeSubmissionDetail
// 한 건의 공개 설문 제출을 어드민용으로 전체 표시 + 승인/반려.
// 라벨은 한국어(스태프용), 값은 환자가 제출한 원문 그대로.
// ================================================

const CAUSE_LABELS: Record<string, string> = {
  parents_short: '부모님 키가 작음',
  parents_height_gap: '부모 키 대비 작음',
  picky_eating: '편식',
  parents_early_stop: '부모님이 일찍 성장 멈춤',
  insufficient_sleep: '수면 부족',
  chronic_illness: '만성 질환',
};

function str(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

function yesNo(v: boolean | null | undefined): string {
  if (v === true) return '예';
  if (v === false) return '아니오';
  return '미응답';
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        {action}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <div className="w-28 shrink-0 text-slate-500">{label}</div>
      <div className="min-w-0 flex-1 text-slate-900 break-words">{value}</div>
    </div>
  );
}

interface Props {
  sub: IntakeSubmission;
  onApproved: (childId: string) => void;
  onRejected: () => void;
  onReopened: () => void;
  onUpdated: () => void;
}

export default function IntakeSubmissionDetail({
  sub,
  onApproved,
  onRejected,
  onReopened,
  onUpdated,
}: Props) {
  const navigate = useNavigate();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // 반려된 제출을 다시 대기로. 되돌리기 쉬운 저위험 액션이라 별도 확인 모달 없이 바로 처리.
  const reopen = async () => {
    if (reopening) return;
    setReopening(true);
    setReopenError(null);
    try {
      await reopenSubmission(sub.id);
      onReopened();
    } catch (e) {
      setReopenError(e instanceof Error ? e.message : '대기로 되돌리지 못했습니다.');
      setReopening(false);
    }
  };

  // 소견서 작성 페이지로 환자 정보를 자동 채워 이동.
  // 소견서는 환자 언어(sub.lang)로 현지화되므로 이름은 전체 이름인 name 우선(현지 병원이 읽음),
  // name 이 비었을 때만 영문 이름으로 폴백. 언어는 설문 언어를 기본값으로.
  const goReferral = () => {
    const prefill: ReferralPrefill = {
      name: sub.name?.trim() || sub.name_en?.trim() || '',
      dob: sub.birth_date ?? '',
      gender: sub.gender ?? 'male',
      address: sub.address?.trim() ?? '',
      // 소견서는 아직 es 템플릿이 없어 지원 언어만 그대로, 그 외(es 등)는 영어로.
      lang: (['en', 'ko', 'th', 'vi', 'zh-hans', 'zh-hant', 'ja'].includes(sub.lang)
        ? sub.lang
        : 'en') as ReferralPrefill['lang'],
    };
    navigate('/admin/referral', { state: prefill });
  };

  // Load signed URLs for each upload.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map: Record<string, string> = {};
      for (const u of sub.uploads) {
        const { data } = await supabase.storage
          .from('intake-uploads')
          .createSignedUrl(u.path, 600);
        if (data?.signedUrl) map[u.path] = data.signedUrl;
      }
      if (!cancelled) setUrls(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [sub.id, sub.uploads]);

  const survey = sub.intake_survey ?? null;
  const causes = survey?.short_stature_causes ?? [];

  if (editing) {
    return (
      <IntakeSubmissionEditForm
        sub={sub}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          onUpdated();
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* 수정 버튼 */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          ✏️ 설문 수정
        </button>
      </div>

      {/* 기본정보 */}
      <Section
        title="기본정보"
        action={
          <button
            type="button"
            onClick={goReferral}
            className="shrink-0 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            📝 소견서 작성
          </button>
        }
      >
        <Row label="이름" value={str(sub.name)} />
        <Row label="영문 이름" value={str(sub.name_en)} />
        <Row
          label="성별"
          value={sub.gender === 'male' ? '남' : sub.gender === 'female' ? '여' : '—'}
        />
        <Row label="생년월일" value={str(sub.birth_date)} />
        <Row label="국가" value={countryLabel(sub.country)} />
        {/* 성장 기준 국가 — 예측키·뼈나이를 어느 나라 아이들과 비교했는지. 거주국과 다를 수 있다
            (해외 거주 한국인 등). 괄호 안은 실제로 쓰인 성장 표준. */}
        <Row
          label="성장 기준"
          value={
            survey?.growth_ref_country
              ? `${countryLabel(survey.growth_ref_country)}${survey.growth_standard ? ` (${survey.growth_standard})` : ''}`
              : '—'
          }
        />
        <Row label="현재 키" value={str(sub.current_height)} />
        <Row label="현재 몸무게" value={str(sub.current_weight)} />
        <Row label="아버지 키" value={str(sub.father_height)} />
        <Row label="어머니 키" value={str(sub.mother_height)} />
        <Row label="목표 키" value={str(sub.desired_height)} />
        <Row label="학년" value={str(sub.grade)} />
        <Row label="반 키 순위" value={str(sub.class_height_rank)} />
        <Row label="연락처" value={str(sub.phone)} />
        <Row label="이메일" value={str(sub.email)} />
        <Row label="주소" value={str(sub.address)} />
      </Section>

      {/* 출생 정보 */}
      <Section title="출생 정보">
        <Row label="임신 주수" value={str(survey?.gestational_weeks)} />
        <Row label="출생 몸무게" value={str(survey?.birth_weight)} />
        <Row label="출생 특이사항" value={str(survey?.birth_note)} />
      </Section>

      {/* 과거 성장기록 */}
      <Section title="과거 성장기록">
        {survey && survey.growth_history.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="py-1 font-medium">나이</th>
                <th className="py-1 font-medium">키(cm)</th>
              </tr>
            </thead>
            <tbody>
              {survey.growth_history.map((g) => (
                <tr key={g.age} className="border-t border-slate-50">
                  <td className="py-1 text-slate-600">{g.age}세</td>
                  <td className="py-1 text-slate-900">
                    {g.height === null || g.height === undefined ? '—' : g.height}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-sm text-slate-400">—</div>
        )}
        {survey && (
          <div className="mt-2 border-t border-slate-50 pt-2">
            <Row label="최근 1년 성장" value={str(survey.yearly_growth)} />
            <Row label="급성장" value={yesNo(survey.growth_flags.rapid_growth)} />
            <Row label="성장 둔화" value={yesNo(survey.growth_flags.slowed)} />
            <Row label="사춘기 우려" value={yesNo(survey.growth_flags.puberty_concern)} />
          </div>
        )}
      </Section>

      {/* 생활 습관 */}
      <Section title="생활 습관">
        <Row label="취침 시간" value={str(survey?.sleep_time)} />
        <Row label="기상 시간" value={str(survey?.wake_time)} />
        <Row
          label="운동 빈도"
          value={optLabelKo(INTAKE_LABELS.ko.exerciseOpts, survey?.exercise_frequency)}
        />
        <Row
          label="우유/유제품"
          value={optLabelKo(INTAKE_LABELS.ko.milkOpts, survey?.milk_daily)}
        />
        <Row
          label="식사 규칙성"
          value={optLabelKo(INTAKE_LABELS.ko.mealOpts, survey?.meal_regularity)}
        />
      </Section>

      {/* 가족·관심 */}
      <Section title="가족·관심">
        <Row
          label="유입 경로"
          value={
            survey?.acquisition_channel
              ? (ACQUISITION_KO[survey.acquisition_channel] ?? survey.acquisition_channel)
              : '-'
          }
        />
        {/* 검색어 — 구글이 검색어의 90%+ 를 가리므로 환자가 직접 적어준 이 문장이 원본이다 */}
        {survey?.acquisition_keyword && (
          <Row
            label="검색어"
            value={<span className="font-medium text-violet-700">{survey.acquisition_keyword}</span>}
          />
        )}
        <Row label="과거 클리닉 상담" value={yesNo(survey?.past_clinic_consult)} />
        <Row label="부모 관심" value={yesNo(survey?.parents_interested)} />
        <Row label="체육 특기생" value={yesNo(survey?.sports_athlete)} />
        <Row label="종목" value={str(survey?.sports_event)} />
        <Row label="아이 본인 관심" value={yesNo(survey?.child_interested)} />
      </Section>

      {/* 의료문진 */}
      <Section title="의료문진">
        <Row label="만성 질환" value={str(survey?.chronic_conditions)} />
        <Row label="복용 약/영양제" value={str(survey?.current_medications)} />
        {sub.gender === 'male' && (
          <>
            <Row
              label="변성기"
              value={optLabelKo(INTAKE_LABELS.ko.voiceOpts, survey?.voice_change)}
            />
            <Row
              label="수염/체모"
              value={optLabelKo(INTAKE_LABELS.ko.facialOpts, survey?.facial_hair)}
            />
          </>
        )}
        {sub.gender === 'female' && (
          <>
            <Row
              label="초경"
              value={optLabelKo(INTAKE_LABELS.ko.menarcheOpts, survey?.menarche)}
            />
            <Row
              label="유방 발달"
              value={optLabelKo(INTAKE_LABELS.ko.breastOpts, survey?.breast_development)}
            />
          </>
        )}
        <Row
          label="Tanner 단계"
          value={survey?.tanner_stage ? `${survey.tanner_stage}단계` : '—'}
        />
      </Section>

      {/* 키 작은 원인 */}
      <Section title="키 작은 원인">
        <Row
          label="원인"
          value={
            causes.length > 0
              ? causes.map((c) => CAUSE_LABELS[c] ?? c).join(', ')
              : '—'
          }
        />
        <Row label="기타" value={str(survey?.short_stature_other)} />
        <Row label="추가 메모" value={str(survey?.additional_notes)} />
      </Section>

      {/* 업로드 */}
      <Section title="업로드">
        {sub.uploads.length === 0 ? (
          <div className="text-sm text-slate-400">첨부 없음</div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {sub.uploads.map((u) => (
              <UploadItem key={u.path} u={u} url={urls[u.path]} />
            ))}
          </div>
        )}
      </Section>

      {/* Footer actions — 반려된 제출은 사유 표시 + [승인]/[다시 대기로], 그 외는 [승인]/[반려] */}
      {sub.status === 'rejected' ? (
        <div className="space-y-2 pt-1">
          {sub.reject_reason && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              반려 사유: {sub.reject_reason}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setApproveOpen(true)}
              className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              승인
            </button>
            <button
              type="button"
              onClick={reopen}
              disabled={reopening}
              className="flex-1 rounded-lg border border-amber-300 bg-amber-50 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reopening ? '처리 중…' : '🔄 다시 대기로'}
            </button>
          </div>
          {reopenError && <p className="text-xs text-red-600">{reopenError}</p>}
        </div>
      ) : (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setApproveOpen(true)}
            className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            승인
          </button>
          <button
            type="button"
            onClick={() => setRejectOpen(true)}
            className="flex-1 rounded-lg border border-red-200 bg-white py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            반려
          </button>
        </div>
      )}

      {approveOpen && (
        <ApproveModal
          sub={sub}
          onClose={() => setApproveOpen(false)}
          onApproved={onApproved}
        />
      )}
      {rejectOpen && (
        <RejectModal
          sub={sub}
          onClose={() => setRejectOpen(false)}
          onRejected={onRejected}
        />
      )}
    </div>
  );
}

function UploadItem({ u, url }: { u: UploadMeta; url?: string }) {
  const isImage = u.contentType.startsWith('image/');
  if (!url) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[10px] text-slate-400">
        로딩…
      </div>
    );
  }
  if (isImage) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={u.filename}
        className="block h-20 w-20 overflow-hidden rounded-lg border border-slate-200 hover:ring-2 hover:ring-emerald-300"
      >
        <img src={url} alt={u.filename} className="h-full w-full object-cover" />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={u.filename}
      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100"
    >
      <span>📄</span>
      <span className="max-w-[160px] truncate">{u.filename}</span>
    </a>
  );
}

function ApproveModal({
  sub,
  onClose,
  onApproved,
}: {
  sub: IntakeSubmission;
  onClose: () => void;
  onApproved: (childId: string) => void;
}) {
  const [chartNumber, setChartNumber] = useState('');
  const [loadingSuggest, setLoadingSuggest] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await suggestChartNumber(sub.country);
        if (!cancelled) setChartNumber(s);
      } catch {
        /* keep blank */
      } finally {
        if (!cancelled) setLoadingSuggest(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sub.country]);

  const confirm = async () => {
    if (!chartNumber.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const childId = await approveSubmission(sub, chartNumber.trim());
      onApproved(childId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '승인 처리에 실패했습니다.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900">
          설문 승인 — 환자 등록
        </div>
        <div className="flex flex-col gap-3 px-5 py-4">
          <div className="text-xs text-slate-500">
            국가: <span className="text-slate-800">{countryLabel(sub.country)}</span>
          </div>
          <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            환자번호 *
            <input
              autoFocus
              value={chartNumber}
              onChange={(e) => setChartNumber(e.target.value)}
              placeholder={loadingSuggest ? '제안 불러오는 중…' : '예) th0001'}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!chartNumber.trim() || submitting}
            className="rounded bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? '등록 중…' : '승인 + 환자 등록'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectModal({
  sub,
  onClose,
  onRejected,
}: {
  sub: IntakeSubmission;
  onClose: () => void;
  onRejected: () => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await rejectSubmission(sub.id, reason.trim());
      onRejected();
    } catch (e) {
      setError(e instanceof Error ? e.message : '반려 처리에 실패했습니다.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900">
          설문 반려
        </div>
        <div className="flex flex-col gap-2 px-5 py-4">
          <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            반려 사유 (선택)
          </label>
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="반려 사유를 입력하세요 (선택)"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={submitting}
            className="rounded bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? '처리 중…' : '반려'}
          </button>
        </div>
      </div>
    </div>
  );
}
