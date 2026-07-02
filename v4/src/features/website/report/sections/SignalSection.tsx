import { selectSignalBlocks } from '../signalBlocks';
import { SIGNAL_CONTENT } from '../signalContent';
import type { ReportMeasurement, ReportSurvey } from '../types';

export function SignalSection({ m, survey }: { m: ReportMeasurement; survey: ReportSurvey }) {
  const ids = selectSignalBlocks(m, survey);
  const name = survey.childName || '우리 아이';

  return (
    <section>
      <div className="sec-t">🔎 {name} 설문 분석</div>
      <div className="sec-s">
        성장에 영향을 주는 핵심 항목과, 설문에서 확인된 신호를 함께 안내합니다. 각 설명은 국제 논문
        근거에 기반하며, 병원에서 도울 수 있는 부분도 함께 안내합니다.
      </div>

      {ids.map((id) => {
        const c = SIGNAL_CONTENT[id];
        return (
          <div className="sig" key={id}>
            <h4>{c.title}</h4>
            <p>{c.body}</p>
            {c.youtube && (
              <div className="ytwrap">
                <div className="yl">🎬 병원 추천 성장 운동 영상</div>
                {c.youtube.map((y) => (
                  <a
                    className="ytchip"
                    key={y.url}
                    href={y.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {y.label}
                  </a>
                ))}
              </div>
            )}
            <div className="src">{c.src}</div>
            <div className="help">
              <span className="h">🏥 병원에서는</span>
              {c.help}
            </div>
          </div>
        );
      })}
    </section>
  );
}
