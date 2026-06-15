// src/features/marketing/components/ads/AdStrategyPanel.tsx
// 광고 관리 안에 들어가는 "메타 광고 전략 기획서" — 평소엔 접힘, 펼치면 공통 5단계 램프 +
// 국가별(태국·베트남·미국 한인) 접이식 작전. 캠페인 기획 전에 참고하는 플레이북.
import { useState } from 'react';

const PHASES: { n: string; tag: string; detail: string }[] = [
  { n: '1', tag: '타겟 설계', detail: '지역(핵심 도시)·나이(부모 30~45)·성별(어머니 중심)·소득(프록시). 광고세트는 1~2개로 시작 — 잘게 쪼개면 학습이 안 끝남.' },
  { n: '2', tag: '테스트', detail: '첫 며칠 소액(₩1~3만)으로 소재 3~5개 검증. 목표=트래픽/영상조회. 학습단계 3~7일은 손대지 말기. CTR·CPC로 이긴 소재 선별.' },
  { n: '3', tag: '트래픽', detail: '검증 소재로 홈페이지·예측키 계산기 유입 확대(20~30%씩 증액). 리타게팅 풀(영상 시청자·방문자·계산기 완료자) 적립이 핵심.' },
  { n: '4', tag: '전환', detail: '데워진 풀에만 메신저 상담 유도(홈피→메신저 클릭=Lead 픽셀). 콜드 전환 ❌. 리드당 비용(CPA) ≤ 20~40만원이면 흑자.' },
  { n: '5', tag: '확장', detail: '이긴 소재 20~30%씩 스케일 + 유사타겟(계산기 완료자·리드·환자 시드). 빈도 5+면 소재 피로 → 교체.' },
];

const BUDGET_FLOW: string[][] = [
  ['1주차', '테스트', '소액(₩1~3만)', '트래픽/영상조회', 'CTR·CPC·도착률', '손대지 말기 · 이긴 소재 선별'],
  ['2주차', '트래픽', '20~30%씩 증액', '트래픽(계산기)', '계산기 완료수·CPC', '이긴 소재 집중 · 리타겟 풀 적립'],
  ['3주차~', '전환', '검증분 집중', '전환(Lead)', 'CPA(리드당 비용)', 'CPA ≤ 20~40만원 흑자 유지'],
  ['상시', '확장', '점진 스케일', '전환+Lookalike', 'ROAS·빈도', '스케일 · 빈도 5+ 소재 교체'],
];

const COUNTRIES: {
  code: string;
  flag: string;
  name: string;
  messenger: string;
  msgCls: string;
  note: string;
  specs: [string, string][];
  warn: string;
}[] = [
  {
    code: 'th',
    flag: '🇹🇭',
    name: '태국',
    messenger: 'LINE @894qhqtu',
    msgCls: 'bg-green-100 text-green-700',
    note: '1순위 시장. 한류·한국 의료 신뢰가 높아 원격상담 후 방한까지 자연스러움.',
    specs: [
      ['핵심 지역', '방콕 중상위 구역 → 치앙마이·푸켓·촌부리 확장'],
      ['나이·성별', '부모 30~45세 · 어머니 중심(여성 70~80%)'],
      ['소득 프록시', 'iOS · 국제/사립학교 관심 · 프리미엄 브랜드 · 해외여행 · K-의료 관심'],
      ['언어', '태국어 (현지 transcreation, 직역 ❌)'],
      ['일 테스트', '฿300~500 (≈ ₩1.2~2만)'],
      ['콘텐츠', '치료사례 · 예측키 계산기 릴(HeightReelsTH 자산 보유) · 카드뉴스'],
    ],
    warn: '태국 의료광고 규제가 특히 보수적 — 효과·비교·후기 표현 주의, LINE 게이트로 상담 유도.',
  },
  {
    code: 'vi',
    flag: '🇻🇳',
    name: '베트남',
    messenger: 'Zalo (계정 확보 선결)',
    msgCls: 'bg-blue-100 text-blue-700',
    note: 'FB 사용이 매우 강하고 한류 신뢰 높음. CPC가 저렴해 테스트 가성비가 좋은 시장.',
    specs: [
      ['핵심 지역', '호치민·하노이 중상위 → 다낭'],
      ['나이·성별', '부모 30~45세 · 어머니 중심'],
      ['소득 프록시', 'iOS · 국제학교 · 프리미엄 브랜드 · 한국 관심(한류 강함)'],
      ['언어', '베트남어'],
      ['일 테스트', '₫15~30만 (≈ ₩0.8~1.6만) · CPC 저렴 → 도달 큼'],
      ['콘텐츠', 'FB 중심(피드·그룹·릴스) · 치료사례'],
    ],
    warn: '현재 messenger.yml은 vi=Kakao. Zalo OA 계정 확보가 선결 — 그 전엔 홈피폼/Kakao로 받되 전환율 낮을 수 있음.',
  },
  {
    code: 'us',
    flag: '🇺🇸',
    name: '미국 한인',
    messenger: 'KakaoTalk',
    msgCls: 'bg-yellow-100 text-yellow-800',
    note: '디아스포라 시장. 방학 의료관광이 핵심 — 미국 소아과 성장진료가 보수적이라 방학에 한국 정밀검사 수요 실재(원장 확인).',
    specs: [
      ['핵심 지역', '한인 밀집 핀포인트 — LA·OC·뉴저지·NY·애틀랜타·시애틀'],
      ['나이·성별', '1.5세대 부모 30~45세(핵심) · 어머니 중심 · 1세대 조부모 보조'],
      ['소득 프록시', '(미국 소득타겟 폐지) → 한인 지역 + 한국어 관심 + 국제/사립학교'],
      ['언어', '한국어 우선(1·1.5세대) · 영어 병행(2세대 일부)'],
      ['일 테스트', '$10~20 · 미국 CPC 비쌈($0.5~2+) → 정밀 타겟 필수'],
      ['시즌성 ★', '여름방학→4~5월 · 겨울방학→10~11월 집행(방문 2~3개월 전 예약유도)'],
      ['콘텐츠', '"방학에 한국서 정밀 성장검사" 앵글 · FB 한인맘 그룹·미시USA'],
    ],
    warn: 'FB가 디아스포라에 강함. 메타 발행 인프라 재활용. 세대×채널 전략은 「미국 한인 작전」 참조.',
  },
];

export function AdStrategyPanel({ market }: { market?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-[#4A2D6B]/25 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-sm font-bold text-[#4A2D6B]">
          📋 메타 광고 전략 기획서
          <span className="ml-1 font-normal text-gray-400">— 국가별 (타겟→테스트→트래픽→전환→확장)</span>
        </span>
        <span className={`flex-shrink-0 text-xs text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-gray-100 px-4 py-4">
          {/* 전제 */}
          <p className="rounded-lg bg-[#4A2D6B]/5 px-3 py-2.5 text-[11px] leading-relaxed text-gray-600">
            <b className="text-[#4A2D6B]">전략 한 줄</b> · 차가운 사람에게 바로 "₩1,000만 상담"은 안 통함. 소액으로 먹히는 소재를 찾고 → 홈페이지·예측키
            계산기로 데우고(리타겟 풀 적립) → 데워진 사람에게만 메신저 상담(리드)을 유도. 메타=FB/IG, 상담은 국가별 메신저로(LINE/Zalo/Kakao).
          </p>

          {/* 공통 5단계 */}
          <div>
            <div className="mb-1.5 text-xs font-bold text-gray-500">공통 5단계 램프</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {PHASES.map((p) => (
                <div key={p.n} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-[#4A2D6B] text-[11px] font-bold text-white">{p.n}</span>
                    <span className="text-xs font-bold text-gray-800">{p.tag}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500">{p.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 소득 프록시 */}
          <p className="rounded-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-900">
            <b className="text-amber-700">★ "소득수준"은 프록시로</b> — 메타는 대부분 국가에서 소득을 직접 못 고름(미국도 2022년 폐지). 고가 진료 타겟은{' '}
            <b>iOS 디바이스 · 국제/사립학교 관심 · 프리미엄 브랜드 · 해외여행 · 부유지역 핀포인트</b>로 간접 조준.
          </p>

          {/* 예산 흐름표 */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#4A2D6B] text-left text-white">
                  {['시기', '단계', '일예산', '캠페인 목표', '보는 지표', '액션'].map((h) => (
                    <th key={h} className="px-2 py-1.5 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BUDGET_FLOW.map((row) => (
                  <tr key={row[0]} className="border-t border-gray-100">
                    {row.map((cell, i) => (
                      <td key={i} className={`px-2 py-1.5 align-top ${i === 1 ? 'font-semibold text-[#4A2D6B]' : 'text-gray-600'}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 국가별 접이식 */}
          <div>
            <div className="mb-1.5 text-xs font-bold text-gray-500">
              국가별 작전 <span className="font-normal text-gray-300">(클릭하면 펼침 ▼)</span>
            </div>
            <div className="space-y-2">
              {COUNTRIES.map((c) => {
                const isCurrent = market === c.code;
                return (
                  <details key={c.code} className={`rounded-lg border ${isCurrent ? 'border-[#4A2D6B]/40 ring-1 ring-[#4A2D6B]/20' : 'border-gray-200'}`}>
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-bold text-gray-800">
                      <span className="text-lg">{c.flag}</span>
                      {c.name}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.msgCls}`}>{c.messenger}</span>
                      {isCurrent && <span className="rounded bg-[#4A2D6B] px-1.5 py-0.5 text-[9px] font-bold text-white">현재 시장</span>}
                      <span className="ml-auto text-[10px] text-gray-300">▼</span>
                    </summary>
                    <div className="border-t border-gray-100 px-3 py-3">
                      <p className="mb-2 text-[11px] leading-relaxed text-gray-500">{c.note}</p>
                      <table className="w-full text-[11px]">
                        <tbody>
                          {c.specs.map(([k, v]) => (
                            <tr key={k}>
                              <td className="w-24 py-1 pr-2 align-top font-semibold text-[#4A2D6B]">{k}</td>
                              <td className="py-1 text-gray-600">{v}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="mt-2 rounded border-l-4 border-red-300 bg-red-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-red-700">⚠ {c.warn}</p>
                    </div>
                  </details>
                );
              })}
            </div>
          </div>

          {/* 의료광고 규정 */}
          <p className="rounded-lg border-l-4 border-red-400 bg-red-50 px-3 py-2.5 text-[11px] leading-relaxed text-red-800">
            <b className="text-red-700">의료광고 규정</b> · 효과 보장·"최고/유일" 단정 금지 · 셀럽 얼굴+효과 직결 금지 · 환자 동의(비식별) · 메타 정책상
            "당신 아이는 키가 작다" 식 개인 특성 단정은 거부 사유 → "우리 아이 키 걱정되시나요?" 보편 톤 · 현지 규정 게재 전 확인(특히 태국).
          </p>
        </div>
      )}
    </div>
  );
}
