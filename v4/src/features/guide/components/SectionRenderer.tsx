import type { GuideSection } from '../types';

interface Props {
  section: GuideSection;
  accent: string;
  index: number;
}

export function SectionRenderer({ section, accent, index }: Props) {
  const delay = `${index * 60}ms`;

  switch (section.type) {
    case 'intro':
      return <IntroBlock text={(section as any).content} delay={delay} />;
    case 'explanation':
      return <ExplanationBlock section={section} accent={accent} delay={delay} />;
    case 'checklist':
      return <ChecklistBlock section={section} delay={delay} />;
    case 'guide':
      return <StepsBlock title={section.title} steps={(section as any).steps} accent={accent} delay={delay} />;
    case 'cta':
      return <CtaBlock section={section} accent={accent} delay={delay} />;
    case 'stage':
      return <StageBlock section={section} delay={delay} />;
    case 'method':
      return <MethodBlock section={section} accent={accent} delay={delay} />;
    case 'highlight':
      return <HighlightBlock section={section} accent={accent} delay={delay} />;
    case 'ratio':
      return <RatioBlock section={section} accent={accent} delay={delay} />;
    case 'case_study':
      return <CaseStudyBlock section={section} accent={accent} delay={delay} />;
    case 'bad_habit':
      return <BadHabitBlock section={section} delay={delay} />;
    case 'warning':
      return <WarningBlock section={section} delay={delay} />;
    case 'action_plan':
      return <ActionPlanBlock section={section} accent={accent} delay={delay} />;
    case 'nutrient':
      return <NutrientBlock section={section} accent={accent} delay={delay} />;
    case 'pyramid_level':
      return <PyramidBlock section={section} delay={delay} />;
    case 'meal_guide':
      return <MealGuideBlock section={section} accent={accent} delay={delay} />;
    case 'tip':
      return <TipBlock section={section} accent={accent} delay={delay} />;
    case 'warning_sign':
      return <WarningSignBlock section={section} delay={delay} />;
    case 'optimal_timing':
      return <OptimalTimingBlock section={section} accent={accent} delay={delay} />;
    case 'preparation':
      return <PreparationBlock section={section} accent={accent} delay={delay} />;
    case 'benefits':
      return <BenefitsBlock section={section} accent={accent} delay={delay} />;
    case 'sleep_requirement':
      return <SleepReqBlock section={section} accent={accent} delay={delay} />;
    case 'golden_time':
      return <GoldenTimeBlock section={section} accent={accent} delay={delay} />;
    case 'sleep_deprivation':
      return <DeprivationBlock section={section} delay={delay} />;
    case 'sleep_principles':
      return <PrinciplesBlock section={section} accent={accent} delay={delay} />;
    case 'avoid_list':
      return <AvoidBlock section={section} delay={delay} />;
    case 'sleep_checklist':
      return <SleepCheckBlock section={section} accent={accent} delay={delay} />;
    case 'exercise_category':
      return <ExerciseCatBlock section={section} accent={accent} delay={delay} />;
    case 'exercise_routine':
      return <ExerciseRoutineBlock section={section} accent={accent} delay={delay} />;
    case 'posture_problem':
      return <PostureBlock section={section} delay={delay} />;
    case 'correction_exercise':
      return <CorrectionBlock section={section} accent={accent} delay={delay} />;
    case 'stress_impact':
      return <StressImpactBlock section={section} delay={delay} />;
    case 'stress_management':
      return <StressManageBlock section={section} accent={accent} delay={delay} />;
    case 'communication':
      return <CommunicationBlock section={section} accent={accent} delay={delay} />;
    case 'core_message':
      return <CoreMessageBlock section={section} accent={accent} delay={delay} />;
    case 'recommended_exercise':
      return <RecommendedExerciseBlock section={section} accent={accent} delay={delay} />;
    case 'exercise_caution':
      return <ExerciseCautionBlock section={section} delay={delay} />;
    case 'exercise_plan':
      return <ExercisePlanBlock section={section} accent={accent} delay={delay} />;
    case 'exercise_tips':
      return <ExerciseTipsBlock section={section} accent={accent} delay={delay} />;
    case 'bad_posture':
      return <BadPostureBlock section={section} delay={delay} />;
    case 'correct_posture':
      return <CorrectPostureBlock section={section} accent={accent} delay={delay} />;
    case 'posture_stretching':
      return <PostureStretchingBlock section={section} accent={accent} delay={delay} />;
    case 'smartphone_rules':
      return <SmartphoneRulesBlock section={section} delay={delay} />;
    case 'mechanism':
      return <MechanismBlock section={section} accent={accent} delay={delay} />;
    case 'causes':
      return <CausesBlock section={section} accent={accent} delay={delay} />;
    case 'management':
      return <ManagementBlock section={section} accent={accent} delay={delay} />;
    case 'professional_help':
      return <ProfessionalHelpBlock section={section} delay={delay} />;
    case 'priority':
      return <PriorityBlock section={section} accent={accent} delay={delay} />;
    case 'never_say':
      return <NeverSayBlock section={section} delay={delay} />;
    case 'principles':
      return <PrinciplesListBlock section={section} accent={accent} delay={delay} />;
    case 'scenario_scripts':
      return <ScenarioBlock section={section} accent={accent} delay={delay} />;
    case 'ratios':
      return <RatiosBlock section={section} accent={accent} delay={delay} />;
    default:
      return <GenericBlock section={section} delay={delay} />;
  }
}

// ============ Shared Wrapper ============
function SectionCard({ children, delay, className = '' }: { children: React.ReactNode; delay: string; className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden ${className}`}
      style={{ animation: 'fadeIn 0.4s ease-out both', animationDelay: delay }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ title, icon, accent }: { title?: string; icon?: string; accent?: string }) {
  if (!title) return null;
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon && <span className="text-lg">{icon}</span>}
      <h3 className="font-bold text-base text-gray-900" style={accent ? { color: accent } : undefined}>
        {title}
      </h3>
    </div>
  );
}

// ============ Section Renderers ============

function IntroBlock({ text, delay }: { text: string; delay: string }) {
  return (
    <div
      className="rounded-2xl bg-gradient-to-r from-gray-50 to-white px-5 py-4 border-l-4 border-gray-300"
      style={{ animation: 'fadeIn 0.4s ease-out both', animationDelay: delay }}
    >
      <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
    </div>
  );
}

function ExplanationBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} accent={accent} />
        <div className="space-y-2">
          {(section.content as Array<{ label: string; description: string }>).map((item, i) => (
            <div key={i} className="flex gap-3 items-start bg-gray-50 rounded-xl px-3.5 py-2.5">
              <span className="font-bold text-sm shrink-0" style={{ color: accent }}>
                {item.label}
              </span>
              <span className="text-sm text-gray-600">{item.description}</span>
            </div>
          ))}
        </div>
        {section.highlight && (
          <div className="mt-3 rounded-xl px-4 py-2.5 text-sm font-medium" style={{ backgroundColor: accent + '12', color: accent }}>
            💡 {section.highlight}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function ChecklistBlock({ section, delay }: { section: any; delay: string }) {
  const items = section.items || [];
  const isStringArray = typeof items[0] === 'string';
  const isGood = !isStringArray && items[0]?.status === 'good';

  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle
          title={section.title}
          icon={isStringArray ? '📋' : isGood ? '✅' : '⚠️'}
        />
        {section.description && (
          <p className="text-xs text-gray-500 mb-3">{section.description}</p>
        )}
        <div className="space-y-2">
          {isStringArray
            ? items.map((item: string, i: number) => (
                <label key={i} className="flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50 text-gray-700">
                  <input type="checkbox" className="mt-0.5 accent-purple-500 shrink-0" readOnly />
                  <span className="leading-relaxed">{item}</span>
                </label>
              ))
            : items.map((item: any, i: number) => (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-sm ${
                    item.status === 'good'
                      ? 'bg-green-50 text-green-800'
                      : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  <span className="shrink-0 mt-0.5">
                    {item.status === 'good' ? '🟢' : '🟡'}
                  </span>
                  <span className="leading-relaxed">{item.text}</span>
                </div>
              ))}
        </div>
        {section.result && (
          <div className="mt-3 space-y-1">
            {Object.entries(section.result).map(([key, val]) => (
              <p key={key} className={`text-xs px-3 py-1.5 rounded-lg ${
                key === 'normal' ? 'bg-green-50 text-green-700' :
                key === 'caution' ? 'bg-amber-50 text-amber-700' :
                'bg-red-50 text-red-700'
              }`}>{val as string}</p>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function StepsBlock({ title, steps, accent, delay }: { title?: string; steps: any[]; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={title} icon="📋" accent={accent} />
        <div className="space-y-0 relative">
          <div className="absolute left-[15px] top-4 bottom-4 w-0.5" style={{ backgroundColor: accent + '25' }} />
          {steps.map((step: any, i: number) => (
            <div key={i} className="flex gap-3 items-start relative py-2">
              <div
                className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 z-10"
                style={{ backgroundColor: accent }}
              >
                {step.number}
              </div>
              <div className="pt-0.5">
                <p className="font-semibold text-sm text-gray-900">{step.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function CtaBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <div
      className="rounded-2xl p-5 text-center"
      style={{
        background: `linear-gradient(135deg, ${accent}18, ${accent}08)`,
        animation: 'fadeIn 0.4s ease-out both',
        animationDelay: delay,
      }}
    >
      <h3 className="font-bold text-base mb-2" style={{ color: accent }}>
        {section.title}
      </h3>
      <p className="text-sm text-gray-600 mb-4 leading-relaxed">{section.description}</p>
      <a
        href="https://pf.kakao.com/_ZxneSb"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-white text-sm font-semibold shadow-lg transition-transform active:scale-95"
        style={{ backgroundColor: accent }}
      >
        {section.button?.text || '상담하기'}
      </a>
    </div>
  );
}

function StageBlock({ section, delay }: { section: any; delay: string }) {
  const stageColors = ['#667eea', '#48bb78', '#ed8936', '#f56565'];
  const color = stageColors[(section.stage_number - 1) % 4];

  return (
    <SectionCard delay={delay}>
      <div className="px-1.5 pt-1.5">
        <div className="rounded-xl p-4" style={{ backgroundColor: color + '08' }}>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: color }}
            >
              {section.stage_number}
            </span>
            <h3 className="font-bold text-sm text-gray-900">{section.title}</h3>
          </div>
          <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-3" style={{ backgroundColor: color + '18', color }}>
            {section.badge}
          </span>

          {section.description && (
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">{section.description}</p>
          )}

          {section.growth_data && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {section.growth_data.map((d: any, i: number) => (
                <div key={i} className="bg-white rounded-lg px-3 py-2 text-center">
                  <p className="text-[10px] text-gray-400">{d.period || d.gender}</p>
                  <p className="font-bold text-sm" style={{ color }}>{d.growth}</p>
                  {d.detail && <p className="text-[10px] text-gray-500 mt-0.5">{d.detail}</p>}
                </div>
              ))}
            </div>
          )}

          {section.closure_time && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-white rounded-lg px-3 py-2">
                <p className="text-[10px] text-pink-400">♀ 여아</p>
                <p className="text-xs font-medium text-gray-700">{section.closure_time.female}</p>
              </div>
              <div className="bg-white rounded-lg px-3 py-2">
                <p className="text-[10px] text-blue-400">♂ 남아</p>
                <p className="text-xs font-medium text-gray-700">{section.closure_time.male}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-gray-500 mb-2">관리 포인트</p>
        <div className="space-y-1.5">
          {section.management_points?.map((point: string, i: number) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
              <span style={{ color }}>●</span>
              <span className="leading-relaxed">{point}</span>
            </div>
          ))}
        </div>
        {section.warnings && section.warnings.length > 0 && (
          <div className="mt-3 rounded-xl bg-red-50 px-3 py-2.5">
            {section.warnings.map((w: string, i: number) => (
              <p key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                <span>⚠️</span> {w}
              </p>
            ))}
          </div>
        )}
        {section.caution && (
          <p className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            ⚠️ {section.caution}
          </p>
        )}
      </div>
    </SectionCard>
  );
}

function MethodBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: accent }}>
              {section.method_number}
            </span>
            <h3 className="font-bold text-sm text-gray-900">{section.title}</h3>
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: i < section.reliability ? accent : accent + '20' }}
              />
            ))}
          </div>
        </div>

        <span className="text-xs px-2 py-0.5 rounded-full mb-3 inline-block" style={{ backgroundColor: accent + '12', color: accent }}>
          정확도: {section.reliability_label}
        </span>

        {section.description && <p className="text-xs text-gray-600 mb-3 leading-relaxed">{section.description}</p>}

        {section.formula && (
          <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-1">
            <p className="text-xs"><span className="text-blue-500">♂</span> {section.formula.male}</p>
            <p className="text-xs"><span className="text-pink-500">♀</span> {section.formula.female}</p>
          </div>
        )}

        {section.analysis_methods && (
          <div className="space-y-1.5 mb-3">
            {section.analysis_methods.map((m: any, i: number) => (
              <div key={i} className="flex gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
                <span className="font-semibold text-gray-700">{m.name}</span>
                <span className="text-gray-500">{m.description}</span>
              </div>
            ))}
          </div>
        )}

        {section.interpretation && (
          <div className="space-y-1.5 mb-3">
            {section.interpretation.map((item: any, i: number) => (
              <div key={i} className="text-xs bg-gray-50 rounded-lg px-3 py-2">
                <span className="font-medium text-gray-700">{item.condition}</span>
                <span className="text-gray-500 ml-1">→ {item.meaning}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {section.pros && (
            <div>
              <p className="text-[10px] font-semibold text-green-600 mb-1">장점</p>
              {section.pros.map((p: string, i: number) => (
                <p key={i} className="text-[11px] text-gray-600 flex gap-1 mb-0.5"><span className="text-green-500">+</span>{p}</p>
              ))}
            </div>
          )}
          {section.cons && (
            <div>
              <p className="text-[10px] font-semibold text-red-500 mb-1">한계</p>
              {section.cons.map((c: string, i: number) => (
                <p key={i} className="text-[11px] text-gray-600 flex gap-1 mb-0.5"><span className="text-red-400">−</span>{c}</p>
              ))}
            </div>
          )}
        </div>

        {section.error_range && (
          <p className="text-xs text-gray-500 mt-2 text-right">오차범위: {section.error_range}</p>
        )}
      </div>
    </SectionCard>
  );
}

function HighlightBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <div
      className="rounded-2xl p-5 text-center"
      style={{
        background: `linear-gradient(135deg, ${accent}15, ${accent}05)`,
        border: `2px solid ${accent}30`,
        animation: 'fadeIn 0.4s ease-out both',
        animationDelay: delay,
      }}
    >
      <p className="text-lg font-bold mb-1" style={{ color: accent }}>
        💡 {section.title || ''}
      </p>
      <p className="text-base font-semibold text-gray-800">{section.content}</p>
      {section.description && (
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">{section.description}</p>
      )}
    </div>
  );
}

function RatioBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="🧬" accent={accent} />

        {/* Visual bar */}
        <div className="flex rounded-full overflow-hidden h-8 mb-4">
          <div className="flex items-center justify-center text-white text-xs font-bold bg-gray-400" style={{ width: '75%' }}>
            유전 {section.genetics.percentage}
          </div>
          <div className="flex items-center justify-center text-white text-xs font-bold" style={{ width: '25%', backgroundColor: accent }}>
            환경 {section.environment.percentage}
          </div>
        </div>

        {/* Genetics */}
        <div className="bg-gray-50 rounded-xl p-3.5 mb-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">유전 요인</p>
          {section.genetics.factors.map((f: string, i: number) => (
            <p key={i} className="text-xs text-gray-600 mb-0.5 flex gap-1.5"><span>•</span>{f}</p>
          ))}
          <p className="text-xs text-gray-500 mt-2 italic">{section.genetics.note}</p>
        </div>

        {/* Environment */}
        <div className="rounded-xl p-3.5" style={{ backgroundColor: accent + '08' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: accent }}>
            환경 요인 — {section.environment.note}
          </p>
          <div className="space-y-2.5">
            {section.environment.factors.map((f: any, i: number) => (
              <div key={i} className="bg-white rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-800">{f.name}</span>
                  {f.weight && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: accent + '15', color: accent }}>
                      {f.weight}
                    </span>
                  )}
                </div>
                {f.good?.map((g: string, j: number) => (
                  <p key={j} className="text-[11px] text-green-700 mb-0.5 flex gap-1"><span>✓</span>{g}</p>
                ))}
                {f.bad?.map((b: string, j: number) => (
                  <p key={j} className="text-[11px] text-red-500 mb-0.5 flex gap-1"><span>✕</span>{b}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function CaseStudyBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="📊" accent={accent} />
        <div className="grid grid-cols-2 gap-3">
          {section.cases?.map((c: any, i: number) => (
            <div
              key={i}
              className={`rounded-xl p-3.5 text-center ${c.type === 'optimal' ? 'bg-green-50' : 'bg-red-50'}`}
            >
              <p className="text-xs font-bold mb-1">{c.title}</p>
              <p className="text-[10px] text-gray-500">예상 {c.predicted}cm</p>
              <p className="text-2xl font-black my-1" style={{ color: c.type === 'optimal' ? '#48bb78' : '#f56565' }}>
                {c.actual}cm
              </p>
              <span className={`text-xs font-bold ${c.type === 'optimal' ? 'text-green-600' : 'text-red-500'}`}>
                {c.difference} {c.result}
              </span>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function BadHabitBlock({ section, delay }: { section: any; delay: string }) {
  const levelColor = section.warning_level === 'high' ? '#f56565' : '#ed8936';
  return (
    <SectionCard delay={delay}>
      <div className="border-l-4 p-4" style={{ borderColor: levelColor }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-bold" style={{ color: levelColor }}>🚨 {section.category}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: levelColor }}>
            {section.warning_level === 'high' ? '위험' : '주의'}
          </span>
        </div>

        <div className="space-y-1.5 mb-3">
          {section.checklist?.map((item: string, i: number) => (
            <label key={i} className="flex items-start gap-2 text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
              <input type="checkbox" className="mt-0.5 accent-red-500" readOnly />
              {item}
            </label>
          ))}
        </div>

        <div className="bg-red-50 rounded-xl p-3 mb-3">
          <p className="text-[10px] font-semibold text-red-600 mb-1">왜 나쁜가?</p>
          {section.why_bad?.map((w: string, i: number) => (
            <p key={i} className="text-[11px] text-red-700 mb-0.5 flex gap-1.5"><span>•</span>{w}</p>
          ))}
        </div>

        <div className="bg-green-50 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-green-600 mb-1">해결책</p>
          {section.solution?.map((s: string, i: number) => (
            <p key={i} className="text-[11px] text-green-700 mb-0.5 flex gap-1.5"><span>✓</span>{s}</p>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function WarningBlock({ section, delay }: { section: any; delay: string }) {
  return (
    <div
      className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4"
      style={{ animation: 'fadeIn 0.4s ease-out both', animationDelay: delay }}
    >
      <h3 className="font-bold text-sm text-red-700 mb-1 flex items-center gap-1.5">
        ⚠️ {section.title}
      </h3>
      <p className="text-sm text-red-600 leading-relaxed">{section.content}</p>
    </div>
  );
}

function ActionPlanBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="🗓️" accent={accent} />
        <div className="space-y-2">
          {section.weekly_plan?.map((w: any) => (
            <div key={w.week} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: accent }}>
                {w.week}주
              </div>
              <p className="text-sm text-gray-700 font-medium">{w.goal}</p>
            </div>
          ))}
        </div>
        {section.note && (
          <p className="text-xs text-center mt-3" style={{ color: accent }}>✨ {section.note}</p>
        )}
      </div>
    </SectionCard>
  );
}

function NutrientBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{section.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: accent }}>
                {section.number}
              </span>
              <h3 className="font-bold text-sm text-gray-900">{section.name}</h3>
            </div>
            <p className="text-xs text-gray-500">{section.subtitle}</p>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-gray-500 mb-1">역할</p>
            {section.roles?.map((r: string, i: number) => (
              <p key={i} className="text-xs text-gray-700 mb-0.5 flex gap-1.5"><span style={{ color: accent }}>•</span>{r}</p>
            ))}
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-gray-500 mb-1">풍부한 음식</p>
            <div className="flex flex-wrap gap-1.5">
              {section.food_sources?.map((f: string, i: number) => (
                <span key={i} className="text-[11px] bg-white rounded-full px-2.5 py-1 text-gray-700 border border-gray-100">
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>

        {section.daily_requirement && (
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {Object.entries(section.daily_requirement).map(([age, amount]) => (
              <div key={age} className="bg-gray-50 rounded-lg px-2.5 py-1.5 text-center">
                <p className="text-[9px] text-gray-400">{age.replace(/_/g, ' ')}</p>
                <p className="text-xs font-bold" style={{ color: accent }}>{amount as string}</p>
              </div>
            ))}
          </div>
        )}

        {section.tip && (
          <div className="rounded-xl px-3 py-2.5 text-xs font-medium" style={{ backgroundColor: accent + '10', color: accent }}>
            💡 {section.tip}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function PyramidBlock({ section, delay }: { section: any; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: section.color || '#ccc' }} />
          <h3 className="font-bold text-sm text-gray-900">{section.title || section.level}</h3>
        </div>
        {section.description && <p className="text-xs text-gray-600 mb-3">{section.description}</p>}
        <div className="space-y-1.5">
          {section.foods?.map((f: any, i: number) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
              <span className="flex items-center gap-1.5">
                <span>{f.icon}</span>
                <span className="text-gray-700 font-medium">{f.name}</span>
              </span>
              <span className="text-gray-500">{f.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function MealGuideBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="🍽️" accent={accent} />
        <div className="space-y-2.5">
          {section.meals?.map((meal: any, i: number) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-gray-800">{meal.type}</span>
                <span className="text-[10px] text-gray-400">{meal.time}</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {meal.composition?.map((c: string, j: number) => (
                  <span key={j} className="text-[10px] bg-white rounded-full px-2 py-0.5 text-gray-600 border border-gray-100">{c}</span>
                ))}
              </div>
              <p className="text-[11px] text-gray-500">예: {meal.example}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function TipBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{
        backgroundColor: accent + '08',
        border: `1px dashed ${accent}40`,
        animation: 'fadeIn 0.4s ease-out both',
        animationDelay: delay,
      }}
    >
      <h3 className="font-bold text-sm mb-1 flex items-center gap-1.5" style={{ color: accent }}>
        💡 {section.title}
      </h3>
      {section.content && <p className="text-sm text-gray-700 leading-relaxed">{section.content}</p>}
      {section.items && (
        <div className="space-y-1 mt-2">
          {section.items.map((item: string, i: number) => (
            <p key={i} className="text-xs text-gray-600 flex gap-1.5"><span style={{ color: accent }}>•</span>{item}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function WarningSignBlock({ section, delay }: { section: any; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="border-l-4 border-amber-400 p-4">
        <h3 className="font-bold text-sm text-amber-700 mb-2 flex items-center gap-1.5">
          🔍 {section.category || section.title}
        </h3>
        <div className="space-y-1.5">
          {section.signs?.map((s: any, i: number) => (
            <div key={i} className="bg-amber-50 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-800 font-medium">{s.sign || s}</p>
              {s.detail && <p className="text-[11px] text-amber-600 mt-0.5">{s.detail}</p>}
            </div>
          ))}
        </div>
        {section.action && (
          <p className="text-xs font-medium text-amber-700 mt-2">→ {section.action}</p>
        )}
      </div>
    </SectionCard>
  );
}

function OptimalTimingBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="⏰" accent={accent} />
        <div className="space-y-2">
          {section.timing?.map((t: any, i: number) => (
            <div key={i} className="flex gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <span className="font-bold text-sm shrink-0" style={{ color: accent }}>{t.age}</span>
              <span className="text-xs text-gray-600 leading-relaxed">{t.reason}</span>
            </div>
          ))}
        </div>
        {section.key_point && (
          <p className="text-xs font-medium mt-3 text-center" style={{ color: accent }}>💡 {section.key_point}</p>
        )}
      </div>
    </SectionCard>
  );
}

function PreparationBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  const s = section as any;
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{s.icon}</span>
          <h3 className="font-bold text-sm text-gray-900">{s.category}</h3>
        </div>

        {/* Handle subcategories (lifestyle info) */}
        {s.subcategories && (
          <div className="space-y-2.5">
            {s.subcategories.map((sub: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-700 mb-1.5">{sub.name}</p>
                {sub.fields?.map((f: any, j: number) => (
                  <div key={j} className="flex items-center justify-between text-[11px] py-1 border-b border-gray-100 last:border-0">
                    <span className="text-gray-600">{f.label}</span>
                    <span className="text-gray-400 text-[10px]">
                      {f.format || f.options?.join(' / ') || f.examples?.join(', ') || ''}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Handle documents (성장 기록) */}
        {s.documents && (
          <div className="space-y-1.5">
            {s.documents.map((doc: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                <span style={{ color: accent }}>📄</span>
                <div>
                  <p className="font-medium">{doc.name || doc}</p>
                  {doc.note && <p className="text-[10px] text-gray-500 mt-0.5">{doc.note}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Handle items (general list) */}
        {s.items && (
          <div className="space-y-1.5">
            {s.items.map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                <span style={{ color: accent }}>•</span>
                <span>{typeof item === 'string' ? item : item.name || JSON.stringify(item)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Parent/family info */}
        {s.parent_info && (
          <div className="bg-gray-50 rounded-xl p-3 mb-2">
            <p className="text-xs font-semibold text-gray-700 mb-1.5">부모 정보</p>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
              <p>아빠 키: {s.parent_info.father_height}</p>
              <p>엄마 키: {s.parent_info.mother_height}</p>
            </div>
          </div>
        )}

        {s.why_important && (
          <p className="text-xs mt-3 px-3 py-2 rounded-xl leading-relaxed" style={{ backgroundColor: accent + '08', color: accent }}>
            💡 {s.why_important}
          </p>
        )}
        {s.tip && (
          <p className="text-xs mt-2" style={{ color: accent }}>💡 {s.tip}</p>
        )}
        {s.note && (
          <p className="text-xs mt-2 text-gray-500 italic">{s.note}</p>
        )}
      </div>
    </SectionCard>
  );
}

function BenefitsBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="✨" accent={accent} />
        <div className="grid grid-cols-2 gap-2">
          {section.benefits?.map((b: string, i: number) => (
            <div key={i} className="bg-gray-50 rounded-xl px-3 py-3 text-center">
              <p className="text-xs font-medium text-gray-700">{b}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function SleepReqBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="😴" accent={accent} />
        <div className="space-y-1.5">
          {section.age_groups?.map((g: any, i: number) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
              <span className="text-xs text-gray-700">{g.age}</span>
              <span className="text-sm font-bold" style={{ color: accent }}>{g.hours}</span>
            </div>
          ))}
        </div>
        {section.question && (
          <p className="text-xs text-center mt-3 font-medium" style={{ color: accent }}>{section.question}</p>
        )}
      </div>
    </SectionCard>
  );
}

function GoldenTimeBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="🌙" accent={accent} />
        <div className="text-center rounded-xl py-4 mb-3" style={{ backgroundColor: '#1a1a2e', color: '#ffd700' }}>
          <p className="text-2xl font-black">{section.peak_time}</p>
          <p className="text-xs text-gray-300 mt-1">성장호르몬 골든 타임</p>
        </div>
        <p className="text-xs text-gray-600 mb-3 leading-relaxed">{section.description}</p>
        <div className="space-y-1.5">
          {section.pattern?.map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
              <span className="font-medium text-gray-700">{p.time}</span>
              <span className="text-gray-500">{p.secretion}</span>
            </div>
          ))}
        </div>
        <p className="text-xs font-medium mt-3 text-center" style={{ color: accent }}>
          ⭐ {section.key_point}
        </p>
      </div>
    </SectionCard>
  );
}

function DeprivationBlock({ section, delay }: { section: any; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="😰" />
        <div className="space-y-2.5">
          {section.effects?.map((e: any, i: number) => (
            <div key={i} className="bg-red-50 rounded-xl p-3">
              <p className="text-xs font-bold text-red-700 mb-1">{e.category}</p>
              {e.details?.map((d: string, j: number) => (
                <p key={j} className="text-[11px] text-red-600 mb-0.5 flex gap-1.5"><span>•</span>{d}</p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function PrinciplesBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="🛏️" accent={accent} />
        <div className="space-y-2.5">
          {section.principles?.map((p: any) => (
            <div key={p.number} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: accent }}>
                  {p.number}
                </span>
                <span className="text-xs font-bold text-gray-800">{p.title}</span>
              </div>
              {p.guidelines?.map((g: string, j: number) => (
                <p key={j} className="text-[11px] text-gray-600 mb-0.5 ml-8 flex gap-1.5"><span style={{ color: accent }}>•</span>{g}</p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function AvoidBlock({ section, delay }: { section: any; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="🚫" />
        <div className="space-y-2">
          {section.items?.map((item: any, i: number) => (
            <div key={i} className="bg-red-50 rounded-xl p-3">
              <p className="text-xs font-bold text-red-700">{item.item || item}</p>
              {item.reason && <p className="text-[11px] text-red-600 mt-0.5">{item.reason}</p>}
              {item.alternative && (
                <p className="text-[11px] text-green-700 mt-1 flex gap-1"><span>✓</span> 대안: {item.alternative}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function SleepCheckBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="✅" accent={accent} />
        <div className="space-y-2.5">
          {section.categories?.map((cat: any, i: number) => (
            <div key={i}>
              <p className="text-xs font-semibold text-gray-700 mb-1.5">{cat.name}</p>
              {cat.items?.map((item: string, j: number) => (
                <label key={j} className="flex items-start gap-2 text-xs text-gray-600 mb-1 bg-gray-50 rounded-lg px-3 py-2">
                  <input type="checkbox" className="mt-0.5" style={{ accentColor: accent }} readOnly />
                  {item}
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function ExerciseCatBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{section.icon}</span>
          <h3 className="font-bold text-sm text-gray-900">{section.category || section.title}</h3>
        </div>
        {section.description && <p className="text-xs text-gray-600 mb-3">{section.description}</p>}
        <div className="space-y-2">
          {section.exercises?.map((ex: any, i: number) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-800 mb-1">{ex.name}</p>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-500">
                <p>방법: {ex.method}</p>
                <p>빈도: {ex.frequency}</p>
              </div>
              <p className="text-[11px] mt-1" style={{ color: accent }}>효과: {ex.effect}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function ExerciseRoutineBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="📅" accent={accent} />
        <div className="space-y-2">
          {section.routines?.map((r: any, i: number) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-bold mb-1.5" style={{ color: accent }}>{r.time}</p>
              {r.activities?.map((a: string, j: number) => (
                <p key={j} className="text-[11px] text-gray-600 mb-0.5 flex gap-1.5"><span>•</span>{a}</p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function PostureBlock({ section, delay }: { section: any; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{section.icon}</span>
          <h3 className="font-bold text-sm text-gray-900">{section.problem || section.title}</h3>
        </div>
        {section.hidden_height_loss && (
          <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 mb-3">
            숨은 키 손실: {section.hidden_height_loss}
          </span>
        )}
        {section.causes && (
          <div className="mb-3">
            <p className="text-[10px] font-semibold text-gray-500 mb-1">원인</p>
            {section.causes.map((c: string, i: number) => (
              <p key={i} className="text-xs text-gray-600 mb-0.5 flex gap-1.5"><span>•</span>{c}</p>
            ))}
          </div>
        )}
        {section.check_method && (
          <div className="bg-blue-50 rounded-xl px-3 py-2.5">
            <p className="text-xs text-blue-700">🔍 체크 방법: {section.check_method}</p>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function CorrectionBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.target || section.title} icon="🏋️" accent={accent} />
        <div className="space-y-2">
          {section.exercises?.map((ex: any, i: number) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-800 mb-1">{ex.name}</p>
              <p className="text-[11px] text-gray-600">{ex.method}</p>
              <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
                <span>⏱ {ex.duration}</span>
                <span>🔄 {ex.frequency}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function StressImpactBlock({ section, delay }: { section: any; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="😓" />
        <div className="space-y-2">
          {section.impacts?.map((imp: any, i: number) => (
            <div key={i} className="bg-red-50 rounded-xl px-3.5 py-2.5">
              <p className="text-xs text-gray-700">{imp.mechanism}</p>
              <p className="text-xs font-medium text-red-600 mt-0.5">→ {imp.result}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function StressManageBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.category || section.title} icon="🧘" accent={accent} />
        <div className="space-y-2">
          {section.strategies?.map((s: any, i: number) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-800">{s.name}</p>
              <p className="text-[11px] text-gray-600 mt-0.5">{s.method}</p>
              {s.frequency && <p className="text-[10px] mt-0.5" style={{ color: accent }}>빈도: {s.frequency}</p>}
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function CommunicationBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  const s = section as any;
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={s.title || s.category} icon="💬" accent={accent} />

        {/* Do/Don't lists */}
        {s.do_say && (
          <div className="mb-3">
            <p className="text-[10px] font-semibold text-green-600 mb-1">✓ 이렇게 말해주세요</p>
            {(Array.isArray(s.do_say) ? s.do_say : [s.do_say]).map((item: any, i: number) => (
              <div key={i} className="bg-green-50 rounded-lg px-3 py-2 mb-1 text-xs text-green-800">
                {typeof item === 'string' ? item : item.say || JSON.stringify(item)}
              </div>
            ))}
          </div>
        )}
        {s.dont_say && (
          <div className="mb-3">
            <p className="text-[10px] font-semibold text-red-500 mb-1">✕ 이런 말은 피해주세요</p>
            {(Array.isArray(s.dont_say) ? s.dont_say : [s.dont_say]).map((item: any, i: number) => (
              <div key={i} className="bg-red-50 rounded-lg px-3 py-2 mb-1 text-xs text-red-700">
                {typeof item === 'string' ? item : item.say || JSON.stringify(item)}
              </div>
            ))}
          </div>
        )}

        {/* Situations */}
        {s.situations && (
          <div className="space-y-2">
            {s.situations.map((sit: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-bold text-gray-800 mb-1">{sit.situation || sit.name}</p>
                {sit.good_response && <p className="text-[11px] text-green-700">✓ {sit.good_response}</p>}
                {sit.bad_response && <p className="text-[11px] text-red-500 mt-0.5">✕ {sit.bad_response}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Ratios */}
        {s.ratios && (
          <div className="space-y-1.5">
            {s.ratios.map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
                <span className="text-gray-700">{r.name}</span>
                <span className="font-bold" style={{ color: accent }}>{r.ratio}</span>
              </div>
            ))}
          </div>
        )}

        {/* Generic fallback for any other fields */}
        {s.description && <p className="text-xs text-gray-600 leading-relaxed">{s.description}</p>}
      </div>
    </SectionCard>
  );
}

function CoreMessageBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <div
      className="rounded-2xl p-6 text-center"
      style={{
        background: `linear-gradient(135deg, ${accent}20, ${accent}08)`,
        border: `2px solid ${accent}40`,
        animation: 'fadeIn 0.4s ease-out both',
        animationDelay: delay,
      }}
    >
      <p className="text-lg">❤️</p>
      <h3 className="font-bold text-base text-gray-900 mt-2">{section.title}</h3>
      <p className="text-lg font-bold mt-3" style={{ color: accent }}>
        "{section.message}"
      </p>
      {section.ways_to_convey && (
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {section.ways_to_convey.map((w: string, i: number) => (
            <span key={i} className="text-xs bg-white/80 rounded-full px-3 py-1.5 text-gray-700">
              {w}
            </span>
          ))}
        </div>
      )}
      {section.conclusion && (
        <p className="text-sm text-gray-600 mt-4 leading-relaxed">{section.conclusion}</p>
      )}
    </div>
  );
}

function GenericBlock({ section, delay }: { section: any; delay: string }) {
  // Skip rendering if no visible content
  if (!section.title && !section.content && !section.description) return null;
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        {section.title && <h3 className="font-bold text-sm text-gray-900 mb-2">{section.title}</h3>}
        {section.content && (
          <p className="text-xs text-gray-600 leading-relaxed">
            {typeof section.content === 'string' ? section.content : JSON.stringify(section.content)}
          </p>
        )}
        {section.description && <p className="text-xs text-gray-500 mt-1">{section.description}</p>}
      </div>
    </SectionCard>
  );
}

// ============ Card 11: 운동 가이드 ============

function RecommendedExerciseBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  const s = section;
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{s.icon}</span>
            <h3 className="font-bold text-sm text-gray-900">{s.exercise}</h3>
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: i < s.rating ? accent : accent + '20' }} />
            ))}
          </div>
        </div>
        {s.why_good && (
          <div className="bg-gray-50 rounded-xl p-3 mb-3">
            <p className="text-[10px] font-semibold text-gray-500 mb-1">효과</p>
            {s.why_good.map((w: string, i: number) => (
              <p key={i} className="text-xs text-gray-700 mb-0.5 flex gap-1.5"><span style={{ color: accent }}>•</span>{w}</p>
            ))}
          </div>
        )}
        {s.how_to && (
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {Object.entries(s.how_to).map(([k, v]) => (
              <div key={k} className="bg-gray-50 rounded-lg px-2.5 py-1.5 text-center">
                <p className="text-[9px] text-gray-400">{k}</p>
                <p className="text-xs font-medium text-gray-700">{v as string}</p>
              </div>
            ))}
          </div>
        )}
        {s.progression && (
          <div className="space-y-1">
            {s.progression.map((p: any) => (
              <div key={p.level} className="flex items-center gap-2 text-xs">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: accent }}>
                  {p.level}
                </span>
                <span className="text-gray-700">{p.exercise}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function ExerciseCautionBlock({ section, delay }: { section: any; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="border-l-4 border-red-400 p-4">
        <h3 className="font-bold text-sm text-red-700 mb-3 flex items-center gap-1.5">⚠️ {section.title}</h3>
        <div className="space-y-2.5">
          {section.exercises?.map((ex: any, i: number) => (
            <div key={i} className="bg-red-50 rounded-xl p-3">
              <p className="text-xs font-bold text-red-700 mb-1">{ex.name}</p>
              {ex.why_dangerous?.map((w: string, j: number) => (
                <p key={j} className="text-[11px] text-red-600 mb-0.5 flex gap-1.5"><span>•</span>{w}</p>
              ))}
              {ex.avoid && (
                <div className="mt-1.5">
                  <p className="text-[10px] font-semibold text-red-500">피해야 할 것</p>
                  {ex.avoid.map((a: string, j: number) => (
                    <p key={j} className="text-[11px] text-red-600 flex gap-1.5"><span>✕</span>{a}</p>
                  ))}
                </div>
              )}
              {ex.note && <p className="text-[11px] text-green-700 mt-1.5 flex gap-1"><span>✓</span>{ex.note}</p>}
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function ExercisePlanBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="📅" accent={accent} />
        <div className="space-y-2.5">
          {section.plans?.map((plan: any, i: number) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-bold mb-1.5" style={{ color: accent }}>{plan.age_group}</p>
              {plan.plan && Object.entries(plan.plan).map(([k, v]) => (
                <p key={k} className="text-[11px] text-gray-600 mb-0.5 whitespace-pre-line"><span className="font-medium text-gray-700">{k}: </span>{v as string}</p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function ExerciseTipsBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="💡" accent={accent} />
        <div className="space-y-2">
          {section.tips?.map((tip: any, i: number) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-800">{tip.tip}</p>
              {tip.description && <p className="text-[11px] text-gray-600 mt-0.5">{tip.description}</p>}
              {tip.foods && (
                <div className="flex gap-1.5 mt-1">
                  {tip.foods.map((f: string, j: number) => (
                    <span key={j} className="text-[10px] bg-white rounded-full px-2 py-0.5 text-gray-600 border border-gray-100">{f}</span>
                  ))}
                </div>
              )}
              {tip.effect && <p className="text-[11px] mt-1" style={{ color: accent }}>→ {tip.effect}</p>}
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

// ============ Card 12: 자세 교정 ============

function BadPostureBlock({ section, delay }: { section: any; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="border-l-4 border-amber-400 p-4">
        <h3 className="font-bold text-sm text-amber-700 mb-2">🪑 {section.category}</h3>
        <p className="text-xs text-gray-600 mb-3">{section.description}</p>
        {section.causes && (
          <div className="mb-3">
            <p className="text-[10px] font-semibold text-gray-500 mb-1">원인</p>
            {section.causes.map((c: string, i: number) => (
              <p key={i} className="text-xs text-gray-600 mb-0.5 flex gap-1.5"><span>•</span>{c}</p>
            ))}
          </div>
        )}
        {section.height_loss && (
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {section.height_loss.map((h: any, i: number) => (
              <div key={i} className="bg-amber-50 rounded-lg px-2 py-1.5 text-center">
                <p className="text-[9px] text-amber-600">{h.angle}</p>
                <p className="text-sm font-bold text-amber-700">{h.loss}</p>
              </div>
            ))}
          </div>
        )}
        {section.health_issues && (
          <div className="bg-red-50 rounded-lg px-3 py-2">
            {section.health_issues.map((h: string, i: number) => (
              <p key={i} className="text-[11px] text-red-600 flex gap-1.5"><span>⚠️</span>{h}</p>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function CorrectPostureBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <h3 className="font-bold text-sm mb-3" style={{ color: accent }}>✅ {section.situation}</h3>
        <div className="space-y-1.5">
          {section.checkpoints?.map((cp: any, i: number) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
              <span className="font-medium text-gray-700">{cp.body_part}</span>
              <span className="text-gray-500 text-right">{cp.position}</span>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function PostureStretchingBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  const routines = [
    section.morning_routine && { label: '아침', ...section.morning_routine },
    section.evening_routine && { label: '저녁', ...section.evening_routine },
    section.school_routine && { label: '학교/학원', ...section.school_routine },
  ].filter(Boolean);

  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="🧘" accent={accent} />
        <div className="space-y-3">
          {routines.map((routine: any, i: number) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold" style={{ color: accent }}>{routine.label} ({routine.duration})</span>
              </div>
              {routine.exercises?.map((ex: any, j: number) => (
                <div key={j} className="mb-1.5 last:mb-0">
                  <p className="text-xs font-medium text-gray-800">{ex.name} <span className="text-[10px] text-gray-400">{ex.duration} {ex.reps ? `· ${ex.reps}` : ''}</span></p>
                  {ex.description && <p className="text-[11px] text-gray-500">{ex.description}</p>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function SmartphoneRulesBlock({ section, delay }: { section: any; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="📱" />
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-green-600 mb-1">✓ 올바른 사용</p>
            {section.correct_usage?.map((c: string, i: number) => (
              <p key={i} className="text-[11px] text-green-700 mb-0.5">{c}</p>
            ))}
          </div>
          <div className="bg-red-50 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-red-500 mb-1">✕ 잘못된 사용</p>
            {section.incorrect_usage?.map((c: string, i: number) => (
              <p key={i} className="text-[11px] text-red-600 mb-0.5">{c}</p>
            ))}
          </div>
        </div>
        {section.time_limit && (
          <div className="mt-3 bg-amber-50 rounded-lg px-3 py-2">
            {section.time_limit.map((t: any, i: number) => (
              <p key={i} className="text-xs text-amber-700"><span className="font-medium">{t.age}:</span> {t.limit}</p>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ============ Card 13: 스트레스 관리 ============

function MechanismBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="🧠" accent={accent} />
        <div className="space-y-2.5">
          {section.items?.map((item: any, i: number) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-800 mb-1">{item.name}</p>
              <p className="text-[11px] text-gray-600 mb-1.5">{item.description}</p>
              {item.effects?.map((e: string, j: number) => (
                <p key={j} className="text-[11px] text-red-500 flex gap-1.5"><span>→</span>{e}</p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function CausesBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="😰" accent={accent} />
        <div className="space-y-2.5">
          {section.causes?.map((cause: any, i: number) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-gray-800">{cause.category}</span>
                {cause.level && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600">{cause.level}</span>}
              </div>
              {cause.symptoms?.map((s: string, j: number) => (
                <p key={j} className="text-[11px] text-gray-600 mb-0.5 flex gap-1.5"><span>•</span>{s}</p>
              ))}
              {cause.impact && <p className="text-[11px] text-red-500 mt-1">→ {cause.impact}</p>}
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function ManagementBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="💚" accent={accent} />
        <div className="space-y-2.5">
          {section.methods?.map((method: any, i: number) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-800 mb-1.5">{method.method}</p>
              {method.good_examples && (
                <div className="mb-1.5">
                  {method.good_examples.map((g: string, j: number) => (
                    <p key={j} className="text-[11px] text-green-700 mb-0.5 flex gap-1">✓ {g}</p>
                  ))}
                </div>
              )}
              {method.bad_examples && (
                <div className="mb-1.5">
                  {method.bad_examples.map((b: string, j: number) => (
                    <p key={j} className="text-[11px] text-red-500 mb-0.5 flex gap-1">✕ {b}</p>
                  ))}
                </div>
              )}
              {method.listening_skills && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {method.listening_skills.map((s: string, j: number) => (
                    <span key={j} className="text-[10px] bg-white rounded-full px-2 py-0.5 text-gray-600 border border-gray-100">{s}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function ProfessionalHelpBlock({ section, delay }: { section: any; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="border-l-4 border-red-400 p-4">
        <h3 className="font-bold text-sm text-red-700 mb-2">🚨 {section.title}</h3>
        <div className="space-y-1.5 mb-3">
          {section.situations?.map((s: string, i: number) => (
            <div key={i} className="bg-red-50 rounded-lg px-3 py-2 text-xs text-red-700 flex gap-1.5">
              <span>•</span>{s}
            </div>
          ))}
        </div>
        {section.action && (
          <p className="text-xs font-medium text-red-700">→ {section.action}</p>
        )}
      </div>
    </SectionCard>
  );
}

function PriorityBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <div
      className="rounded-2xl p-5 text-center"
      style={{
        background: `linear-gradient(135deg, ${accent}15, ${accent}05)`,
        border: `2px solid ${accent}30`,
        animation: 'fadeIn 0.4s ease-out both',
        animationDelay: delay,
      }}
    >
      <h3 className="font-bold text-base mb-3" style={{ color: accent }}>{section.title}</h3>
      <div className="space-y-1.5">
        {section.order?.map((item: string, i: number) => (
          <p key={i} className="text-sm font-medium text-gray-700">{item}</p>
        ))}
      </div>
      {section.conclusion && (
        <p className="text-sm mt-3" style={{ color: accent }}>💡 {section.conclusion}</p>
      )}
    </div>
  );
}

// ============ Card 14: 대화법 ============

function NeverSayBlock({ section, delay }: { section: any; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <h3 className="font-bold text-sm text-red-600 mb-3">🚫 {section.title}</h3>
        <div className="space-y-2.5">
          {section.categories?.map((cat: any, i: number) => (
            <div key={i} className="bg-red-50 rounded-xl p-3">
              <p className="text-xs font-bold text-red-700 mb-1">{cat.category}</p>
              {cat.bad_examples?.map((b: string, j: number) => (
                <p key={j} className="text-[11px] text-red-600 mb-0.5 flex gap-1.5"><span>✕</span>"{b}"</p>
              ))}
              {cat.why_bad && <p className="text-[11px] text-gray-600 mt-1.5 italic">{cat.why_bad}</p>}
              {cat.good_examples && (
                <div className="mt-2 bg-green-50 rounded-lg px-2.5 py-2">
                  {cat.good_examples.map((g: string, j: number) => (
                    <p key={j} className="text-[11px] text-green-700 mb-0.5 flex gap-1.5"><span>✓</span>{g}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function PrinciplesListBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="💬" accent={accent} />
        <div className="space-y-2.5">
          {section.principles?.map((p: any) => (
            <div key={p.number} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: accent }}>
                  {p.number}
                </span>
                <span className="text-xs font-bold text-gray-800">{p.title}</span>
              </div>
              {p.description && <p className="text-[11px] text-gray-600 ml-8 mb-1.5">{p.description}</p>}
              {p.examples?.map((ex: any, j: number) => (
                <div key={j} className="ml-8 mb-1.5 bg-white rounded-lg px-2.5 py-2 border border-gray-100">
                  <p className="text-[10px] text-gray-400 mb-1">{ex.situation}</p>
                  <p className="text-[11px] text-red-500 mb-0.5">✕ {ex.bad}</p>
                  <p className="text-[11px] text-green-700">✓ {ex.good}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function ScenarioBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="🎭" accent={accent} />
        <div className="space-y-2.5">
          {section.scenarios?.map((sc: any, i: number) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-800 mb-2">💬 {sc.situation}</p>
              <div className="space-y-1.5">
                {sc.steps?.map((step: any, j: number) => (
                  <div key={j} className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                    <p className="text-[10px] font-medium" style={{ color: accent }}>{step.step}</p>
                    <p className="text-xs text-gray-700 mt-0.5">"{step.dialogue}"</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function RatiosBlock({ section, accent, delay }: { section: any; accent: string; delay: string }) {
  return (
    <SectionCard delay={delay}>
      <div className="p-4">
        <SectionTitle title={section.title} icon="⚖️" accent={accent} />
        <div className="space-y-2">
          {section.ratios?.map((r: any, i: number) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div>
                <p className="text-xs font-bold text-gray-800">{r.name}</p>
                {r.description && <p className="text-[11px] text-gray-500 mt-0.5">{r.description}</p>}
              </div>
              <span className="text-sm font-bold shrink-0 ml-3" style={{ color: accent }}>{r.ratio}</span>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
