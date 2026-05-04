// ================================================
// ConsultationRecordView — 상담 단계 환자용 첫 상담 기록 페이지
// 어드민의 11장 PPT 슬라이드 데이터(firstConsultContent.ts) 를 모바일 카드 스택으로
// 재구성해서 환자 + 가족·지인 공유에 적합한 형태로 보여준다.
// ================================================

import { useMemo } from 'react';
import type { Child, HospitalMeasurement } from '@/shared/types';
import { GrowthChart, type GrowthPoint } from '@/shared/components/GrowthChart';
import { calculateAgeAtDate } from '@/shared/utils/age';
import {
  predictAdultHeightLMS,
  calculateHeightPercentileLMS,
} from '@/shared/data/growthStandard';
import { calculateMidParentalHeight } from '@/shared/utils/growth';
import { firstConsultContent } from '@/features/hospital/components/intake/firstConsultContent';

interface Props {
  child: Child;
  measurements: HospitalMeasurement[];
}

const SHORT_STATURE_LABELS: Record<string, string> = {
  parents_short: '부모 키 작음',
  parents_height_gap: '부모 키 차이 큼',
  picky_eating: '편식',
  parents_early_stop: '부모 일찍 성장 멈춤',
  insufficient_sleep: '수면 부족',
  chronic_illness: '만성 질환',
};

const TANNER_LABELS: Record<number, string> = {
  1: '1단계 (사춘기 시작 전)',
  2: '2단계 (초기)',
  3: '3단계 (중기)',
  4: '4단계 (후기)',
  5: '5단계 (성숙)',
};

function fmtDate(d: string): string {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`;
}

export function ConsultationRecordView({ child, measurements }: Props) {
  const slides = firstConsultContent.ko;

  const data = useMemo(() => {
    const survey = child.intake_survey;
    const history = survey?.growth_history ?? [];
    const points: GrowthPoint[] = [];
    for (const h of history) {
      if (h.height && h.height > 0 && h.age >= 2) {
        points.push({ age: h.age, height: h.height });
      }
    }
    const latest = measurements[0];
    let currentH: number | null = null;
    let currentA: number | null = null;
    if (latest?.height && latest.height > 0) {
      currentH = latest.height;
      currentA = calculateAgeAtDate(child.birth_date, new Date(latest.measured_date)).decimal;
      const ageInt = Math.round(currentA);
      if (!points.some((p) => Math.round(p.age) === ageInt)) {
        points.push({ age: currentA, height: latest.height });
      }
    }
    points.sort((a, b) => a.age - b.age);

    const tail = points[points.length - 1];
    const predicted = tail
      ? predictAdultHeightLMS(tail.height, tail.age, child.gender)
      : 0;
    const percentile = tail
      ? calculateHeightPercentileLMS(tail.height, tail.age, child.gender)
      : null;

    const mph = (() => {
      if (!child.father_height || !child.mother_height) return null;
      const v = calculateMidParentalHeight(
        child.father_height,
        child.mother_height,
        child.gender,
      );
      return v > 0 ? v : null;
    })();

    return {
      points,
      currentHeight: currentH ?? tail?.height ?? null,
      currentAge: currentA ?? tail?.age ?? null,
      predicted: predicted > 0 ? predicted : null,
      percentile,
      mph,
      latestDate: latest?.measured_date ?? null,
    };
  }, [child, measurements]);

  // 슬라이드를 kind 별로 골라내기 (먼저 비병원 슬라이드 — 환자 데이터에 따라 분기)
  const cover = slides.find((s) => s.kind === 'cover');
  const director = slides.find((s) => s.kind === 'director');
  const hospitals = slides.filter((s) => s.kind === 'hospital');
  // bone analysis / atlas 도 hospital kind 라 분리
  const hospitalIntro = hospitals.filter((h) => h.title === '병원 진료 소개');
  const boneAnalysis = hospitals.find((h) => h.title.startsWith('뼈나이 분석'));
  const boneAtlas = hospitals.find((h) => h.title.startsWith('뼈나이 아틀라스'));
  const survey = slides.find((s) => s.kind === 'survey-bundle');
  const methods = slides.find((s) => s.kind === 'methods-comparison');
  const mphDistribution = slides.find((s) => s.kind === 'mph-distribution');
  const xrayModule = slides.find((s) => s.kind === 'xray-module');
  const growthChartModule = slides.find((s) => s.kind === 'growth-chart-module');

  return (
    <div className="space-y-3">
      {/* ── 1. Cover — 브랜드 hero ── */}
      {cover && cover.kind === 'cover' && (
        <section className="relative overflow-hidden rounded-2xl shadow-lg" style={{ backgroundColor: '#1F4F3C' }}>
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -bottom-12 -left-8 w-40 h-40 rounded-full bg-white/5" />
          <div className="relative px-5 pt-8 pb-6 text-white">
            <p className="text-xs font-medium opacity-80">{cover.lineTop}</p>
            <h1 className="mt-2 text-3xl font-black leading-tight">{cover.title}</h1>
            <div className="mt-6 pt-6 border-t border-white/20">
              <p className="text-[11px] opacity-70">{cover.footer1}</p>
              <p className="text-base font-bold mt-0.5">{cover.footer2}</p>
              <p className="text-[10px] opacity-60 mt-2">{cover.website}</p>
            </div>
          </div>
        </section>
      )}

      {/* ── 2. 환자 인사 — 누구의 기록인지 ── */}
      <section className="rounded-2xl bg-white shadow-sm border border-gray-100 p-4">
        <p className="text-[11px] text-gray-400">아래는</p>
        <h2 className="text-lg font-bold text-gray-900 mt-0.5">
          {child.name} <span className="text-sm font-medium text-gray-500">님의 첫 상담 기록</span>
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          {fmtDate(child.birth_date)}생 · {child.gender === 'male' ? '남' : '여'}
          {child.grade && ` · ${child.grade}`}
        </p>
        <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
          가족·지인과 자유롭게 공유하시면서 천천히 살펴보세요.
        </p>
      </section>

      {/* ── 3. Director — 원장 소개 ── */}
      {director && director.kind === 'director' && (
        <section className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-50 to-white px-4 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <img
                src="/first_session/원장님.png"
                alt={director.title}
                className="w-20 h-24 rounded-xl object-cover object-top bg-gray-100 shrink-0"
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900">{director.title}</h3>
                <p className="text-xs text-emerald-700 mt-1 italic leading-relaxed">"{director.quote}"</p>
              </div>
            </div>
          </div>
          <div className="px-4 py-3 space-y-3">
            {director.timeline.map((t) => (
              <div key={t.year} className="flex gap-3">
                <span className="shrink-0 text-xs font-bold text-emerald-700 w-12">{t.year}</span>
                <ul className="flex-1 space-y-1">
                  {t.items.map((it, i) => (
                    <li key={i} className="text-[12px] text-gray-700 leading-relaxed">
                      · {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <details className="pt-2 border-t border-gray-100">
              <summary className="text-xs font-semibold text-gray-500 cursor-pointer">
                활동 · 출연 더보기
              </summary>
              <ul className="mt-2 space-y-1">
                {director.extras.map((e, i) => (
                  <li key={i} className="text-[11px] text-gray-600 leading-relaxed">· {e}</li>
                ))}
              </ul>
            </details>
          </div>
        </section>
      )}

      {/* ── 4. 병원 진료 소개 (사진 2장) ── */}
      {hospitalIntro.map((h, i) => (
        <section key={`hosp-${i}`} className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <img
            src={h.image}
            alt={h.title}
            className="w-full aspect-[4/3] object-cover bg-gray-100"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
          />
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-emerald-700">{h.title}</p>
          </div>
        </section>
      ))}

      {/* ── 5. 환자 핵심 수치 (인사이트 hero) ── */}
      <section className="rounded-2xl bg-gradient-to-br from-rose-50 via-white to-indigo-50 border border-rose-200 p-4 space-y-3">
        <h3 className="text-sm font-bold text-gray-900">📊 핵심 수치 한눈에</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Cell
            label="현재 키"
            value={data.currentHeight ? `${data.currentHeight}` : '-'}
            unit="cm"
            accent="text-gray-800"
            sub={data.latestDate ? fmtDate(data.latestDate) : data.currentAge ? `만 ${data.currentAge.toFixed(0)}세` : undefined}
          />
          <Cell
            label="18세 예측"
            value={data.predicted ? `${data.predicted}` : '-'}
            unit="cm"
            accent="text-rose-600"
            sub={data.percentile != null ? `또래 ${Math.round(data.percentile)}%` : undefined}
          />
          <Cell
            label="부모 평균(MPH)"
            value={data.mph != null ? `${Math.round(data.mph)}` : '-'}
            unit="cm"
            accent="text-indigo-600"
            sub={
              child.father_height && child.mother_height
                ? `父${child.father_height}/母${child.mother_height}`
                : undefined
            }
          />
        </div>
        {data.predicted != null && data.mph != null && data.mph - data.predicted > 5 && (
          <p className="text-xs leading-relaxed text-gray-700">
            <span className="font-bold text-rose-600">
              지금 추세대로면 부모 평균보다 약 {Math.round(data.mph - data.predicted)}cm 작게 클 가능성이 있어요.
            </span>{' '}
            치료를 시작하면 결과가 달라질 수 있습니다.
          </p>
        )}
      </section>

      {/* ── 6. 성장 추이 그래프 ── */}
      {data.points.length > 0 && (
        <section className="rounded-2xl bg-white shadow-sm border border-gray-100 p-3">
          <h3 className="text-sm font-bold text-gray-800 mb-2 px-1">📈 지금까지 성장 추이</h3>
          <GrowthChart
            gender={child.gender}
            points={data.points}
            compact
            showTitle={false}
            predictedAdultHeight={data.predicted ?? undefined}
          />
          <p className="px-1 mt-2 text-[11px] text-gray-400 leading-relaxed">
            점선은 또래 백분위(KDCA 2017), 실선은 측정 데이터, 끝점은 18세 예측 키예요.
          </p>
        </section>
      )}

      {/* ── 7. 설문 발췌 ── */}
      {survey && survey.kind === 'survey-bundle' && child.intake_survey && (
        <section className="rounded-2xl bg-white shadow-sm border border-gray-100 p-4 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-gray-800">📝 {survey.title}</h3>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{survey.intro}</p>
          </div>

          {(child.intake_survey.growth_flags.rapid_growth ||
            child.intake_survey.growth_flags.slowed ||
            child.intake_survey.growth_flags.puberty_concern) && (
            <Row label="성장 패턴">
              <div className="flex flex-wrap gap-1">
                {child.intake_survey.growth_flags.rapid_growth && <Chip>최근 급성장</Chip>}
                {child.intake_survey.growth_flags.slowed && <Chip color="amber">성장 느려짐</Chip>}
                {child.intake_survey.growth_flags.puberty_concern && <Chip color="rose">사춘기 우려</Chip>}
              </div>
            </Row>
          )}
          {child.intake_survey.tanner_stage != null && (
            <Row label="사춘기 단계">
              <span className="text-sm font-medium text-gray-700">
                {TANNER_LABELS[child.intake_survey.tanner_stage]}
              </span>
            </Row>
          )}
          {child.intake_survey.short_stature_causes.length > 0 && (
            <Row label="원인 추정">
              <div className="flex flex-wrap gap-1">
                {child.intake_survey.short_stature_causes.map((c) => (
                  <Chip key={c} color="slate">
                    {SHORT_STATURE_LABELS[c] ?? c}
                  </Chip>
                ))}
              </div>
            </Row>
          )}
          {(child.grade || child.class_height_rank) && (
            <Row label="학교">
              <span className="text-sm text-gray-700">
                {child.grade ?? ''}
                {child.class_height_rank ? ` · 키 ${child.class_height_rank}` : ''}
              </span>
            </Row>
          )}
          {child.intake_survey.chronic_conditions && (
            <Row label="과거/지속 질환">
              <span className="text-sm text-gray-700 leading-relaxed">
                {child.intake_survey.chronic_conditions}
              </span>
            </Row>
          )}
          <Row label="관심도">
            <div className="flex gap-2 text-xs text-gray-600">
              <span>부모: {child.intake_survey.parents_interested ? '✅ 적극' : '·'}</span>
              <span className="text-gray-300">|</span>
              <span>아이: {child.intake_survey.child_interested ? '✅ 적극' : '·'}</span>
            </div>
          </Row>
        </section>
      )}

      {/* ── 8. 예측 방법 (MPH vs PAH) ── */}
      {methods && methods.kind === 'methods-comparison' && (
        <section className="rounded-2xl bg-white shadow-sm border border-gray-100 p-4 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-gray-800">{methods.title}</h3>
            <p className="text-[12px] text-gray-600 mt-1 leading-relaxed">{methods.intro}</p>
          </div>
          <div className="space-y-3">
            {methods.methods.map((m) => (
              <div key={m.badge} className="rounded-xl bg-gray-50 p-3 space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                    {m.badge}
                  </span>
                  <h4 className="text-sm font-bold text-gray-900">{m.title}</h4>
                </div>
                <p className="text-[11px] text-gray-500 -mt-1">{m.subtitle}</p>
                <pre className="text-[12px] text-gray-700 bg-white rounded-lg p-2 whitespace-pre-wrap font-mono leading-relaxed border border-gray-100">
                  {m.formula}
                </pre>
                <p className="text-[10px] text-gray-400">{m.formulaNote}</p>
                <ul className="space-y-1">
                  {m.bullets.map((b, i) => (
                    <li key={i} className="text-[12px] text-gray-700 leading-relaxed">
                      · {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 9. MPH 분포 (가우시안) ── */}
      {mphDistribution && mphDistribution.kind === 'mph-distribution' && (
        <section className="rounded-2xl bg-white shadow-sm border border-gray-100 p-4 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-gray-800">{mphDistribution.title}</h3>
            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
              {mphDistribution.caption}
            </p>
          </div>
          <MPHGaussianMobile child={child} mph={data.mph} />
        </section>
      )}

      {/* ── 10. 뼈나이 분석 (이미지 + 설명) ── */}
      {boneAnalysis && (
        <section className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <img
            src={boneAnalysis.image}
            alt={boneAnalysis.title}
            className="w-full aspect-[4/3] object-cover bg-gray-100"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
          />
          <div className="px-4 py-3 space-y-1">
            <h3 className="text-sm font-bold text-gray-800">🦴 {boneAnalysis.title}</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              손목 X-ray 로 뼈 발달 단계를 확인합니다. 실제 나이와 뼈나이의 차이가
              사춘기 진행 정도와 남은 성장 가능성을 알려줍니다.
            </p>
          </div>
        </section>
      )}

      {/* ── 11. 뼈나이 아틀라스 ── */}
      {boneAtlas && (
        <section className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <img
            src={boneAtlas.image}
            alt={boneAtlas.title}
            className="w-full aspect-[4/3] object-cover bg-gray-100"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
          />
          <div className="px-4 py-3 space-y-1">
            <h3 className="text-sm font-bold text-gray-800">📚 {boneAtlas.title}</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              표준 X-ray 아틀라스와 비교하여 뼈나이를 정확히 판독합니다.
              매번 같은 기준으로 평가해서 변화를 추적할 수 있어요.
            </p>
          </div>
        </section>
      )}

      {/* ── 12. X-ray 판독 모듈 (안내) ── */}
      {xrayModule && xrayModule.kind === 'xray-module' && (
        <section className="rounded-2xl bg-white shadow-sm border border-gray-100 p-4 space-y-2">
          <h3 className="text-sm font-bold text-gray-800">🔍 {xrayModule.title}</h3>
          <p className="text-[12px] text-gray-600 leading-relaxed">{xrayModule.caption}</p>
          <div className="rounded-xl bg-gray-50 p-3 text-center text-xs text-gray-400">
            진료를 시작하시면 매 회차마다 X-ray 측정 결과가 여기에 누적됩니다.
          </div>
        </section>
      )}

      {/* ── 13. 성장 그래프 모듈 (안내) ── */}
      {growthChartModule && growthChartModule.kind === 'growth-chart-module' && (
        <section className="rounded-2xl bg-white shadow-sm border border-gray-100 p-4 space-y-2">
          <h3 className="text-sm font-bold text-gray-800">📈 {growthChartModule.title}</h3>
          <p className="text-[12px] text-gray-600 leading-relaxed">{growthChartModule.caption}</p>
          <div className="rounded-xl bg-gray-50 p-3 text-center text-xs text-gray-400">
            진료를 시작하시면 매 회차의 측정값과 예측 곡선이 여기서 업데이트됩니다.
          </div>
        </section>
      )}

      {/* ── 14. 원장 마무리 코멘트 ── */}
      <section className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 space-y-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <h3 className="text-sm font-bold text-amber-900">원장 마무리 한마디</h3>
        </div>
        <div className="bg-white rounded-xl p-3 space-y-2 text-[13px] text-gray-700 leading-relaxed">
          <p>
            <span className="font-bold">{child.name}</span>님 케이스 잘 봤습니다.
            {data.percentile != null && data.percentile < 30 && (
              <> 또래 {Math.round(data.percentile)}% 수준이라 살짝 아쉽긴 한데,</>
            )}
            {data.percentile != null && data.percentile >= 30 && (
              <> 또래 {Math.round(data.percentile)}% 수준으로 나쁘지 않은 출발이에요.</>
            )}
          </p>
          {data.predicted != null && data.mph != null && data.mph - data.predicted > 3 && (
            <p>
              지금 추세로는 부모 평균보다 약{' '}
              <span className="font-bold text-rose-600">{Math.round(data.mph - data.predicted)}cm</span>
              {' '}부족할 가능성이 있어요. 다만 사춘기 시기와 뼈나이를 정확히 잡고 시작하면
              <span className="font-bold"> 충분히 따라잡을 수 있는 범위</span>입니다.
            </p>
          )}
          {child.intake_survey?.tanner_stage && child.intake_survey.tanner_stage <= 3 && (
            <p>
              사춘기가 {TANNER_LABELS[child.intake_survey.tanner_stage]} 정도인 것 같아서,
              <span className="font-bold"> 지금이 골든 타임</span>이에요. 시간이 지나면 골이 닫혀서 손쓸 수 있는 게 적어져요.
            </p>
          )}
          {child.intake_survey?.short_stature_causes &&
            child.intake_survey.short_stature_causes.length > 0 && (
              <p>
                추정 원인이 <span className="font-semibold">
                  {child.intake_survey.short_stature_causes
                    .map((c) => SHORT_STATURE_LABELS[c] ?? c)
                    .join(', ')}
                </span>{' '}
                쪽이라, 진료에서 이 부분 위주로 풀어드릴게요.
              </p>
            )}
          <p className="pt-1 border-t border-gray-100">
            너무 걱정하지 마시고요, 잘 치료하면 충분히 좋아질 케이스라고 봅니다 💪
            <br />
            언제든 편하게 연락 주세요.
          </p>
          <p className="text-[11px] text-gray-400 pt-1">— 채용현 대표원장</p>
        </div>
      </section>

      {/* ── 15. CTA ── */}
      <section className="rounded-2xl bg-gradient-to-r from-primary to-secondary p-5 text-center text-white shadow-lg space-y-3">
        <p className="text-base font-bold leading-relaxed">
          정확한 진단과 치료 계획을 위해
          <br />
          진료 예약을 도와드릴게요
        </p>
        <p className="text-[11px] opacity-80 leading-relaxed">
          이 기록은 가족·지인과 자유롭게 공유하셔도 됩니다.
        </p>
        <a
          href="https://pf.kakao.com/_ZxneSb"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-yellow-300 px-6 py-2.5 text-sm font-bold text-gray-900 active:opacity-90"
        >
          💬 1:1 상담받기
        </a>
      </section>
    </div>
  );
}

// ── helpers ──

function Cell({
  label,
  value,
  unit,
  accent,
  sub,
}: {
  label: string;
  value: string;
  unit: string;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg bg-gray-50 px-2 py-2">
      <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
      <p className={`text-lg font-extrabold leading-none ${accent}`}>
        {value}
        <span className="text-[10px] font-normal text-gray-400 ml-0.5">{unit}</span>
      </p>
      {sub && <p className="text-[9px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="shrink-0 w-20 text-[11px] text-gray-400 font-medium pt-0.5">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

const CHIP_COLORS: Record<string, string> = {
  default: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

function Chip({
  children,
  color = 'default',
}: {
  children: React.ReactNode;
  color?: keyof typeof CHIP_COLORS;
}) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${CHIP_COLORS[color]}`}>
      {children}
    </span>
  );
}

// ── MPH 가우시안 (모바일용 간략 버전) ──

function MPHGaussianMobile({ child, mph }: { child: Child; mph: number | null }) {
  if (mph == null) {
    return (
      <div className="rounded-xl bg-gray-50 p-3 text-center text-xs text-gray-400">
        부모 키가 없어 MPH 분포를 계산할 수 없어요.
      </div>
    );
  }

  const sd = 2.5;
  const W = 320;
  const H = 110;
  const xMin = mph - 4 * sd;
  const xMax = mph + 4 * sd;
  const xToPx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const peak = 1 / (sd * Math.sqrt(2 * Math.PI));
  const yToPx = (y: number) => H - 10 - (y / peak) * (H - 20);

  // PDF 곡선 점들
  const points: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const x = xMin + ((xMax - xMin) * i) / 80;
    const z = (x - mph) / sd;
    const y = Math.exp(-(z * z) / 2) / (sd * Math.sqrt(2 * Math.PI));
    points.push(`${xToPx(x).toFixed(1)},${yToPx(y).toFixed(1)}`);
  }
  const path = `M ${points.join(' L ')}`;

  // shaded regions
  const region = (z1: number, z2: number, color: string) => {
    const x1 = mph + z1 * sd;
    const x2 = mph + z2 * sd;
    const seg: string[] = [`${xToPx(x1).toFixed(1)},${(H - 10).toFixed(1)}`];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const x = x1 + ((x2 - x1) * i) / steps;
      const z = (x - mph) / sd;
      const y = Math.exp(-(z * z) / 2) / (sd * Math.sqrt(2 * Math.PI));
      seg.push(`${xToPx(x).toFixed(1)},${yToPx(y).toFixed(1)}`);
    }
    seg.push(`${xToPx(x2).toFixed(1)},${(H - 10).toFixed(1)}`);
    return <polygon points={seg.join(' ')} fill={color} />;
  };

  const adj = child.gender === 'male' ? '+ 6.5' : '- 6.5';

  return (
    <div className="space-y-2">
      <div className="text-[12px] font-semibold text-gray-700">
        MPH = ({child.father_height} + {child.mother_height}) / 2 {adj} ={' '}
        <span className="text-emerald-700">{mph.toFixed(1)} cm</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full bg-white rounded-lg border border-gray-100"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* shaded regions: ±2σ pink, ±1σ light blue */}
        {region(-2, -1, '#dbeafe')}
        {region(-1, 1, '#bfdbfe')}
        {region(1, 2, '#dbeafe')}
        {region(-3, -2, '#fce7f3')}
        {region(2, 3, '#fce7f3')}
        {/* curve */}
        <path d={path} stroke="#1F4F3C" strokeWidth="1.5" fill="none" />
        {/* center line */}
        <line
          x1={xToPx(mph)}
          x2={xToPx(mph)}
          y1={H - 10}
          y2={yToPx(peak)}
          stroke="#1F4F3C"
          strokeWidth="1.5"
          strokeDasharray="3,2"
        />
        {/* x-axis */}
        <line x1={0} x2={W} y1={H - 10} y2={H - 10} stroke="#9ca3af" strokeWidth="1" />
        {/* tick labels: mph-5, mph-2.5, mph, mph+2.5, mph+5 */}
        {[mph - 5, mph - 2.5, mph, mph + 2.5, mph + 5].map((v) => (
          <text
            key={v}
            x={xToPx(v)}
            y={H - 1}
            textAnchor="middle"
            fontSize="9"
            fill={Math.abs(v - mph) < 0.01 ? '#1F4F3C' : '#6b7280'}
            fontWeight={Math.abs(v - mph) < 0.01 ? 'bold' : 'normal'}
          >
            {v.toFixed(0)}
          </text>
        ))}
      </svg>

      <div className="flex items-center justify-around text-[10px] text-gray-500">
        <span><span className="inline-block w-2 h-2 bg-blue-300 align-middle mr-1" /> ±1σ 68%</span>
        <span><span className="inline-block w-2 h-2 bg-blue-200 align-middle mr-1" /> ±2σ 27%</span>
        <span><span className="inline-block w-2 h-2 bg-pink-200 align-middle mr-1" /> 그 외 5%</span>
      </div>
    </div>
  );
}
