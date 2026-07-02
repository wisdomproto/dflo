import type { ReportMeasurement } from '../types';

function formatToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

export function Hero({ m, name }: { m: ReportMeasurement; name: string }) {
  const ay = Math.floor(m.age);
  let am = Math.round((m.age % 1) * 12);
  if (am === 12) {
    am = 0;
  }
  const genderLabel = m.gender === 'male' ? '남아' : '여아';
  const today = formatToday();

  return (
    <>
      <div className="hd">
        <img src="/images/logo.webp" alt="187 성장클리닉" />
        <div className="kick">GROWTH REPORT</div>
        <h1>{name} 성장 리포트</h1>
        <div className="who">
          만 {ay}세 {am}개월 · {genderLabel} · {today}
        </div>
      </div>

      <div className="disc">
        본 리포트는 <b>설문 기반 참고용 예측</b>이며 의료 진단이 아닙니다 · 개인에 따라 결과가 다를
        수 있습니다
      </div>

      <div className="hero">
        <div className="stat">
          <div className="lbl">현재 키</div>
          <div className="val">
            {m.currentHeight.toFixed(1)}
            <span className="u">cm</span>
          </div>
        </div>
        <div className="stat hl">
          <div className="lbl">예측 성인키</div>
          <div className="val">
            {m.predicted.toFixed(1)}
            <span className="u">cm</span>
          </div>
        </div>
        <div className="stat">
          <div className="lbl">또래 백분위</div>
          <div className="val">
            {Math.round(m.percentile)}
            <span className="u">%</span>
          </div>
        </div>
      </div>
    </>
  );
}
