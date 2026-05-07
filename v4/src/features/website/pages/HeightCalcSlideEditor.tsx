import type { HeightCalcSlide } from '../types/websiteSection';

interface HeightCalcSlideEditorProps {
  slide: HeightCalcSlide;
  onUpdate: (updates: Record<string, unknown>) => void;
}

export function HeightCalcSlideEditor({ slide, onUpdate }: HeightCalcSlideEditorProps) {
  const s = slide;
  const ratio = s.ratio || '4:5';
  const ctaBg = s.ctaBgColor || '#0F6E56';
  const ctaFg = s.ctaTextColor || '#ffffff';

  return (
    <div className="space-y-4">
      {/* 카피 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">카피</p>

        <Field label="배지 (선택)"
          value={s.badge || ''}
          onChange={(v) => onUpdate({ badge: v })}
          placeholder="성장 진단" />

        <Field label="제목"
          value={s.title}
          onChange={(v) => onUpdate({ title: v })}
          placeholder="우리 아이 예상 키 측정" />

        <Field label="부제 (선택, 한 줄)"
          value={s.subtitle || ''}
          onChange={(v) => onUpdate({ subtitle: v })}
          placeholder="간단한 정보만 입력하면 예상 성인 키를 바로 확인할 수 있어요" />
      </div>

      {/* 카드 비율 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">카드 비율</p>
        <div className="flex gap-2">
          {(['4:5', '9:16'] as const).map((r) => (
            <button
              key={r}
              onClick={() => onUpdate({ ratio: r })}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                ratio === r
                  ? 'bg-[#0F6E56] text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {r === '4:5' ? '📱 4:5 (정사각형 가까움)' : '📲 9:16 (세로 길게)'}
            </button>
          ))}
        </div>
      </div>

      {/* 버튼 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">버튼</p>

        <Field label="계산 버튼 텍스트"
          value={s.ctaText || ''}
          onChange={(v) => onUpdate({ ctaText: v })}
          placeholder="예상키 계산하기" />

        <div className="grid grid-cols-2 gap-3">
          <ColorField label="버튼 배경색" value={ctaBg}
            onChange={(v) => onUpdate({ ctaBgColor: v })} />
          <ColorField label="버튼 글자색" value={ctaFg}
            onChange={(v) => onUpdate({ ctaTextColor: v })} />
        </div>
      </div>

      {/* 결과 후 CTA */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">결과 화면 CTA</p>

        <Field label="CTA 텍스트"
          value={s.resultCtaText || ''}
          onChange={(v) => onUpdate({ resultCtaText: v })}
          placeholder="1:1 카톡 상담" />

        <Field label="CTA URL (비우면 카카오톡 채널)"
          value={s.resultCtaUrl || ''}
          onChange={(v) => onUpdate({ resultCtaUrl: v })}
          placeholder="https://pf.kakao.com/_ZxneSb" />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-gray-500 mb-1 block">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]" />
    </div>
  );
}

function ColorField({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-gray-500 mb-1 block">{label}</label>
      <div className="flex gap-1.5">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-lg border border-gray-200 px-2 py-2 text-xs font-mono focus:outline-none focus:border-[#0F6E56]" />
      </div>
    </div>
  );
}
