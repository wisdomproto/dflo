import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './report.css';
import type { ReportMeasurement, ReportSurvey } from './types';
import { Hero } from './sections/Hero';
import { DoctorIntro } from './sections/DoctorIntro';
import { Methods } from './sections/Methods';
import { SignalSection } from './sections/SignalSection';
import { HospitalGallery } from './sections/HospitalGallery';
import { Closing } from './sections/Closing';

interface ReportData {
  measurement: ReportMeasurement;
  survey: ReportSurvey;
}

export default function ReportPage() {
  const location = useLocation();
  const navigate = useNavigate();

  let data = (location.state as ReportData | null) ?? null;
  if (!data) {
    try {
      const s = sessionStorage.getItem('growth_report_data');
      if (s) data = JSON.parse(s) as ReportData;
    } catch {
      /* noop */
    }
  }

  const name = data?.survey?.childName || '우리 아이';
  useEffect(() => {
    document.title = data ? `${name} 성장 리포트` : '성장 리포트';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, [data, name]);

  if (!data?.measurement) {
    return (
      <div className="growth-report">
        <div className="wrap" style={{ padding: '48px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 15, color: '#5a5560', lineHeight: 1.7 }}>
            리포트를 표시할 측정 데이터가 없습니다.
            <br />
            예상키 계산기에서 먼저 측정해 주세요.
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: 18,
              padding: '12px 22px',
              borderRadius: 12,
              background: '#0F6E56',
              color: '#fff',
              fontWeight: 700,
              border: 0,
            }}
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  const { measurement: m, survey: s } = data;
  return (
    <div className="growth-report">
      <div className="wrap">
        <Hero m={m} name={name} />
        <DoctorIntro />
        <Methods m={m} name={name} />
        <SignalSection m={m} survey={s} />
        <HospitalGallery />
        <Closing name={name} />
      </div>
    </div>
  );
}
