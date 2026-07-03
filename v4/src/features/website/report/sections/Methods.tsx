import { calculateMidParentalHeight } from '@/shared/utils/growth';
import type { ReportMeasurement } from '../types';

// 방법 ① MPH 카드 — 부모키 있을 때만 렌더
function MphCard({ m }: { m: ReportMeasurement }) {
  const father = m.fatherHeight ?? 0;
  const mother = m.motherHeight ?? 0;
  const mph = calculateMidParentalHeight(father, mother, m.gender);
  const LO = +(mph - 5).toFixed(1);
  const HI = +(mph + 5).toFixed(1);
  const ADJ = m.gender === 'male' ? '+ 6.5' : '− 6.5';
  const genderKo = m.gender === 'male' ? '남' : '여';

  const CX = 143;
  const PXPERCM = 13;
  const PREDX = Math.round(Math.max(40, Math.min(258, CX + (m.predicted - mph) * PXPERCM)));
  const POS = m.predicted > mph + 2 ? '상단' : m.predicted < mph - 2 ? '하단' : '중간';

  return (
    <div className="card">
      <div className="method-n">방법 ①</div>
      <h3>🧬 부모 키로 보는 유전 잠재 범위 (MPH)</h3>
      <p>
        키는 부모로부터 물려받는 유전의 영향이 매우 큽니다. 쌍둥이 연구에 따르면 아이 키의{' '}
        <b>약 70~80%가 유전</b>으로 설명됩니다. 부모님 키로 계산한 MPH는 아이가 유전적으로 도달
        가능한 <b>'잠재 키 범위'</b>를 나타내는 참고값입니다. 유전은 하나의 점이 아니라{' '}
        <b>범위</b>를 정하며, 그 범위 안에서 위·아래는 수면·영양·사춘기 관리가 좌우합니다.
      </p>
      <div className="formula">
        <div className="pk">
          부모님 키 · 아빠 <b>{father}cm</b> 엄마 <b>{mother}cm</b>
        </div>
        <div className="eq">
          ( {father} + {mother} ) ÷ 2 {ADJ} <span className="sm">({genderKo}아 보정)</span> ={' '}
          <span className="r">{mph.toFixed(1)}cm</span>
        </div>
        <div className="rng">
          유전 잠재 범위 (±5cm): <b>{LO} ~ {HI}cm</b>
        </div>
      </div>
      <div className="chartbox">
        <svg viewBox="0 0 300 118" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bell" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#764ba2" stopOpacity=".28" />
              <stop offset="1" stopColor="#764ba2" stopOpacity=".02" />
            </linearGradient>
          </defs>
          <line x1="20" y1="95" x2="285" y2="95" stroke="#d9d2ea" strokeWidth="1" />
          <rect x="78" y="24" width="130" height="71" fill="#667eea" opacity=".07" />
          <path
            d="M28,95 C85,95 110,32 143,28 C176,32 201,95 258,95 Z"
            fill="url(#bell)"
            stroke="#764ba2"
            strokeWidth="1.6"
          />
          <line
            x1={PREDX}
            y1="24"
            x2={PREDX}
            y2="95"
            stroke="#12b886"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          <circle cx={PREDX} cy="28" r="4" fill="#12b886" />
          <text x={PREDX} y="16" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0e9e75">
            예측 {m.predicted.toFixed(1)}
          </text>
          <text x="78" y="110" textAnchor="middle" fontSize="9.5" fill="#8a83a0">
            {LO}
          </text>
          <text x="143" y="110" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#5a4a8a">
            {mph.toFixed(1)} (MPH)
          </text>
          <text x="208" y="110" textAnchor="middle" fontSize="9.5" fill="#8a83a0">
            {HI}
          </text>
        </svg>
        <div className="cap">
          유전 잠재 범위 {LO} ~ {HI}cm · 예측키는 범위 {POS}에 위치합니다
        </div>
      </div>
      <div className="src">
        근거: <a href="https://pubmed.ncbi.nlm.nih.gov/36224396/">[1]</a> Nature 2022 · 인간 키
        유전변이 지도
      </div>
    </div>
  );
}

// 방법 ② 표준성장도표 카드
function PercentileCard({ m, name }: { m: ReportMeasurement; name: string }) {
  const p = Math.max(1, Math.min(99, m.percentile));
  const CY = Math.round(104 - ((p - 3) / 94) * 64);
  const PCT = Math.round(p);
  const RANK = Math.round(100 - p);
  const peerPhrase = p >= 50 ? '또래보다 큰 편입니다' : '또래보다 작은 편입니다';
  const AGE0 = Math.floor(m.age);
  const AGE6 = AGE0 + 6;
  const CY_LABEL = CY - 8;

  return (
    <div className="card">
      <div className="method-n">방법 ②</div>
      <h3>📊 표준성장도표에서 현재 위치</h3>
      <p>
        키·몸무게를 성장도표에 표시하면 <b>같은 나이·성별 100명 중 몇 번째</b>인지 백분위로
        확인됩니다. {name}이는 <b>{PCT}%</b>로 {peerPhrase}. 이 곡선을 유지하면 예측 성인키에
        도달하며, 곡선이 아래로 꺾일 경우 성장 지연의 신호일 수 있습니다.
      </p>
      <div className="chartbox">
        <svg viewBox="0 0 300 165" xmlns="http://www.w3.org/2000/svg">
          <line x1="34" y1="14" x2="34" y2="140" stroke="#d9d2ea" strokeWidth="1" />
          <line x1="34" y1="140" x2="288" y2="140" stroke="#d9d2ea" strokeWidth="1" />
          <polyline points="40,66 140,40 285,20" fill="none" stroke="#c9bef0" strokeWidth="1.4" />
          <text x="288" y="20" fontSize="9" fill="#a99ede">
            97
          </text>
          <polyline points="40,92 140,74 285,52" fill="none" stroke="#8f7ed6" strokeWidth="1.6" />
          <text x="288" y="54" fontSize="9" fill="#8f7ed6">
            50
          </text>
          <polyline points="40,120 140,104 285,84" fill="none" stroke="#c9bef0" strokeWidth="1.4" />
          <text x="288" y="86" fontSize="9" fill="#a99ede">
            3
          </text>
          <circle cx="140" cy={CY} r="5" fill="#12b886" stroke="#fff" strokeWidth="2" />
          <text
            x="140"
            y={CY_LABEL}
            textAnchor="middle"
            fontSize="9.5"
            fontWeight="700"
            fill="#0e9e75"
          >
            {name} · {PCT}%
          </text>
          <text x="40" y="152" textAnchor="middle" fontSize="9" fill="#8a83a0">
            {AGE0}세
          </text>
          <text x="140" y="152" textAnchor="middle" fontSize="9" fill="#5a4a8a" fontWeight="700">
            현재
          </text>
          <text x="278" y="152" textAnchor="middle" fontSize="9" fill="#8a83a0">
            {AGE6}세
          </text>
          <text x="10" y="24" fontSize="9" fill="#8a83a0">
            키
          </text>
        </svg>
        <div className="cap">또래 100명 중 상위 {RANK}번째 · 곡선 유지가 목표입니다</div>
      </div>
      <div className="src">근거: 질병관리청 2017 소아·청소년 성장도표 <a href="#refs">[3]</a></div>
    </div>
  );
}

// 방법 ③ 뼈나이 카드 — 전부 정적
function BoneAgeCard() {
  return (
    <div className="card hook">
      <div className="method-n">방법 ③ · 가장 정확</div>
      <h3>
        🦴 뼈나이 <span className="badge">병원 측정</span>
      </h3>
      <p>
        왼손 X-ray로 뼈의 성숙도(골연령)를 판독합니다.{' '}
        <b className="big">실제 나이와 뼈나이의 차이가 '성장판이 얼마나 남았는지'를 보여주기 때문에</b>{' '}
        성인키 예측의 핵심입니다. 뼈나이가 실제 나이보다 앞서 있으면 남은 성장 여력이 적고, 늦으면
        더 클 여지가 있습니다.
      </p>
      <div className="xray">
        <img src="/images/bone-age-xray.webp" alt="뼈나이 측정 손 X-ray 예시" />
        <div className="legend">
          <span>
            좌측 수완부(손·손목) X-ray로 <b style={{ color: '#fff' }}>골성숙도</b>를 판독해, 성장판
            잔여 정도와 <b style={{ color: '#fff' }}>성인 예측키(PAH)</b>를 정밀 평가합니다
          </span>
        </div>
      </div>
      <p>
        위 두 방법은 설문으로 추정한 값입니다.{' '}
        <b className="big">
          가장 정확한 예측은 뼈나이 판독이 필요하며, 이는 병원 촬영을 통해서만 확인할 수 있습니다.
        </b>
      </p>
      <div className="src">
        근거: <a href="https://pubmed.ncbi.nlm.nih.gov/164838/">[2]</a> Arch Dis Child 1975 · 뼈나이
        기반 성인키 예측
      </div>
    </div>
  );
}

export function Methods({ m, name }: { m: ReportMeasurement; name: string }) {
  const hasParents = !!(m.fatherHeight && m.motherHeight);

  return (
    <section>
      <div className="sec-t">📏 성인키를 보는 3가지 방법</div>
      <div className="sec-s">
        성인키는 측정하는 것이 아니라 여러 방법으로 추정합니다. 방법마다 정확도가 다릅니다.
      </div>

      {hasParents && <MphCard m={m} />}
      <PercentileCard m={m} name={name} />
      <BoneAgeCard />
    </section>
  );
}
