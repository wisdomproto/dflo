// Generates a narrative clinical analysis for a single patient, combining
// intake survey / visit history / measurements / labs / prescriptions into
// a structured JSON summary via Gemini.
//
// The caller (routes/patientAnalysis.ts) is responsible for fetching the
// raw data + upserting the cache row. This module only owns the prompt +
// Gemini call + response parsing.

import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL_ID = 'gemini-2.5-flash';
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('GEMINI_API_KEY required');
const genAI = new GoogleGenerativeAI(apiKey);

export interface PatientAnalysisInput {
  child: {
    chart_number: string;
    name: string;
    gender: 'male' | 'female' | null;
    birth_date: string;
    father_height: number | null;
    mother_height: number | null;
    desired_height: number | null;
    nationality?: 'KR' | 'CN' | null;
    intake_survey?: Record<string, unknown> | null;
  };
  /** Chronological measurements with height/weight/BA/PAH. */
  measurements: Array<{
    date: string;
    height: number | null;
    weight: number | null;
    bone_age: number | null;
    pah: number | null;
  }>;
  visits: Array<{ date: string; notes: string | null }>;
  prescriptions: Array<{
    code: string;
    name: string;
    dose: string | null;
    duration_days: number | null;
    count: number;
    first_date: string | null;
    last_date: string | null;
  }>;
  labs: Array<{
    date: string | null;
    panel_type: string | null;
    accession?: string | null;
    flagged?: string[];
  }>;
  existing_categories?: string[];
}

export interface PatientAnalysis {
  summary: string;
  problem: string;
  intervention: string[];
  outcome: string;
  response_level: 'excellent' | 'good' | 'moderate' | 'poor' | 'insufficient_data';
  treatment_phase: '초기' | '유지' | '마무리' | '종료' | '일회성' | '불명';
  sub_categories: string[];
  risk_flags: string[];
  key_findings: string[];
  growth_metrics?: {
    initial_height_cm?: number | null;
    latest_height_cm?: number | null;
    total_growth_cm?: number | null;
    follow_up_months?: number | null;
    initial_bone_age?: number | null;
    latest_bone_age?: number | null;
    bone_age_progression_years?: number | null;
  };
}

function buildPrompt(input: PatientAnalysisInput): string {
  const { child } = input;
  const age = (() => {
    if (!child.birth_date) return null;
    const b = new Date(child.birth_date);
    const diff = (Date.now() - b.getTime()) / (365.25 * 86400000);
    return Number(diff.toFixed(1));
  })();

  const measurementsText = input.measurements
    .map((m) => `  ${m.date}  키=${m.height ?? '-'}cm 몸무게=${m.weight ?? '-'}kg 뼈나이=${m.bone_age ?? '-'} PAH=${m.pah ?? '-'}`)
    .join('\n');

  const rxText = input.prescriptions
    .map((r) => `  ${r.code} · ${r.name}  x${r.count}회  (${r.first_date ?? '-'} ~ ${r.last_date ?? '-'})  용량=${r.dose ?? '-'}`)
    .join('\n');

  const labsText = input.labs
    .map((l) => `  ${l.date ?? '-'}  ${l.panel_type ?? 'unknown'}${l.flagged?.length ? ` (이상: ${l.flagged.join(', ')})` : ''}`)
    .join('\n');

  const intakeText = child.intake_survey && Object.keys(child.intake_survey).length > 0
    ? JSON.stringify(child.intake_survey, null, 2)
    : '(문진표 없음 - OCR 임포트 환자)';

  return `당신은 소아 성장 클리닉 전문 분석가입니다. 아래 환자의 전체 임상 데이터를 종합해 구조화된 분석 JSON을 출력하세요.

=== 환자 기초 ===
차트: ${child.chart_number}
이름: ${child.name}
성별: ${child.gender ?? '미기재'}
생일: ${child.birth_date ?? '-'} (현재 ${age ?? '-'}세)
부모키: 아빠 ${child.father_height ?? '-'}cm / 엄마 ${child.mother_height ?? '-'}cm
희망키: ${child.desired_height ?? '-'}cm
국적: ${child.nationality ?? 'KR'}
기존 카테고리: ${(input.existing_categories || []).join(', ') || '(없음)'}

=== 문진표 ===
${intakeText}

=== 측정 기록 (${input.measurements.length}건) ===
${measurementsText || '(없음)'}

=== 처방 요약 (${input.prescriptions.length}개 약품) ===
${rxText || '(없음)'}

=== 검사 기록 (${input.labs.length}건) ===
${labsText || '(없음)'}

=== 출력 지침 ===
반드시 유효한 JSON만 출력하세요 (앞뒤 설명 없이). 스키마:

{
  "summary": "2-3 문장 서사. 문제 → 치료 → 결과 흐름. 예: '만 9세 초진 시 뼈나이 13.5세로 성조숙 의심. 루프린 주사 19회 + 영양제 병행으로 5년간 뼈나이 진행 0.75년만 진행, 신장 29cm 성장.'",
  "problem": "초진 시 주요 문제 (뼈나이 편차, 부모키 대비 편차, 사춘기 진행 속도 등 1~2 줄)",
  "intervention": ["주요 처치들 3-5개, 예: '루프린 주사 19회', '에이큐_G 영양제 장기 복용'"],
  "outcome": "치료 결과 1-2 줄. 수치 포함 (신장 변화, 뼈나이 변화 등)",
  "response_level": "excellent | good | moderate | poor | insufficient_data",
  "treatment_phase": "초기 | 유지 | 마무리 | 종료 | 일회성 | 불명",
  "sub_categories": ["기존 8종 카테고리를 보강하는 세부 태그. 예: '성장판 억제 성공', '호르몬 검사 이상', '영양제 복합 처방'"],
  "risk_flags": ["경고 포인트. 예: '최근 6개월 성장 정체', '뼈나이 급진행'. 없으면 빈 배열."],
  "key_findings": ["날짜별 주요 포인트 3-6개. 예: '2021-03: 뼈나이 13.5, gap +4.3년'"],
  "growth_metrics": {
    "initial_height_cm": 초기 측정 키,
    "latest_height_cm": 최신 측정 키,
    "total_growth_cm": 총 성장량,
    "follow_up_months": 추적 개월수,
    "initial_bone_age": 초기 뼈나이,
    "latest_bone_age": 최신 뼈나이,
    "bone_age_progression_years": 뼈나이 증가량
  }
}

response_level 기준:
- excellent: 뼈나이 억제 + 예측 성인키 목표 도달 or 초과
- good: 안정적 성장 유지, 목표 근접
- moderate: 부분적 반응, 추가 관찰 필요
- poor: 치료 반응 약함 or 부작용
- insufficient_data: 측정/추적 데이터 부족

treatment_phase 기준:
- 초기: 치료 시작 6개월 이내
- 유지: 정기 치료 중
- 마무리: 뼈나이 15세+ or 예측키 근접
- 종료: 마지막 방문 1년 이상 지남
- 일회성: 단발 방문만
- 불명: 판단 어려움

모든 숫자는 실제 데이터에 근거해야 합니다. 추측하지 마세요.`;
}

export async function analyzePatient(input: PatientAnalysisInput): Promise<{ analysis: PatientAnalysis; model: string; raw: string }> {
  const prompt = buildPrompt(input);
  const model = genAI.getGenerativeModel({
    model: MODEL_ID,
    generationConfig: { responseMimeType: 'application/json' },
  });
  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  let parsed: PatientAnalysis;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    // Attempt to salvage by stripping code fences if the model added them.
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    parsed = JSON.parse(cleaned);
  }
  return { analysis: parsed, model: MODEL_ID, raw };
}
