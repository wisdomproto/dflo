import { useMemo, useState } from 'react';
import {
  REFERRAL_LANGS,
  type DocKind,
  type ReferralLang,
} from '@/features/admin/referral/referralTemplates';
import {
  buildReferralHtml,
  REFERRAL_DOC_CSS,
  type ReferralPatient,
} from '@/features/admin/referral/referralDoc';

// ================================================
// AdminReferralPage — 소견서(referral note) 작성
// 해외 환자가 현지에서 X-ray·피검사를 받을 때 지참하는 의뢰서.
// 환자 정보 입력 + X-ray/피검사 선택 + 언어 선택 → 인쇄(PDF).
// ================================================

const KIND_LABELS: { kind: DocKind; label: string }[] = [
  { kind: 'xray', label: 'X-ray (영상 검사)' },
  { kind: 'lab', label: '피검사 (혈액 검사)' },
];

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';

export default function AdminReferralPage() {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [address, setAddress] = useState('');
  const [kinds, setKinds] = useState<DocKind[]>(['xray', 'lab']);
  const [lang, setLang] = useState<ReferralLang>('en');

  const patient: ReferralPatient = { name, dob, gender, address };
  const html = useMemo(
    () => (kinds.length ? buildReferralHtml(lang, kinds, patient) : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, kinds, name, dob, gender, address],
  );

  const toggleKind = (k: DocKind) =>
    setKinds((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const canPrint = kinds.length > 0 && name.trim() && dob;

  const printDoc = () => {
    if (!canPrint) return;
    const w = window.open('', '_blank', 'width=840,height=1040');
    if (!w) {
      alert('팝업이 차단되었습니다. 팝업을 허용해 주세요.');
      return;
    }
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>Referral Note</title>` +
        `<style>${REFERRAL_DOC_CSS}</style></head><body>${html}</body></html>`,
    );
    w.document.close();
    w.focus();
    // Let the signature image load before printing.
    setTimeout(() => w.print(), 350);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">소견서 작성</h1>
        <span className="text-xs text-slate-500">
          해외 환자가 현지 병원에서 X-ray·피검사를 받을 때 지참하는 의뢰서
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        {/* Form */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500">이름 (Name)</span>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Luke Jamieson"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500">
              생년월일 (Date of Birth)
            </span>
            <input
              type="date"
              className={inputCls}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </label>

          <div>
            <span className="mb-1 block text-xs font-semibold text-slate-500">성별 (Gender)</span>
            <div className="flex gap-2">
              {(['male', 'female'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={
                    'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ' +
                    (gender === g
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')
                  }
                >
                  {g === 'male' ? '남 (Male)' : '여 (Female)'}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500">주소 (Address)</span>
            <textarea
              className={inputCls}
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="77 Church Street, Beaumaris VIC 3193 Australia"
            />
          </label>

          <div>
            <span className="mb-1 block text-xs font-semibold text-slate-500">소견서 종류</span>
            <div className="flex flex-col gap-1.5">
              {KIND_LABELS.map((k) => (
                <label key={k.kind} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={kinds.includes(k.kind)}
                    onChange={() => toggleKind(k.kind)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {k.label}
                </label>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500">언어 (Language)</span>
            <select
              className={inputCls}
              value={lang}
              onChange={(e) => setLang(e.target.value as ReferralLang)}
            >
              {REFERRAL_LANGS.map((o) => (
                <option key={o.lang} value={o.lang}>
                  {o.flag} {o.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={printDoc}
            disabled={!canPrint}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            🖨 인쇄 / PDF 저장
          </button>
          {!canPrint && (
            <p className="text-[11px] text-slate-400">
              이름·생년월일 입력 + 소견서 종류 1개 이상 선택 시 인쇄할 수 있습니다.
            </p>
          )}
          <p className="text-[11px] text-amber-600">
            ⚠️ 비영어 서술문은 초안입니다 — 발송 전 원장/전문 감수 권장. 서명 이미지는
            <code className="mx-1">public/images/referral-signature.png</code>에 넣어주세요.
          </p>
        </div>

        {/* Preview */}
        <div className="overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-4">
          {kinds.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-sm text-slate-400">
              소견서 종류를 1개 이상 선택하세요
            </div>
          ) : (
            <>
              <style>{REFERRAL_DOC_CSS}</style>
              <div
                className="mx-auto max-w-[760px] bg-white shadow-sm"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
