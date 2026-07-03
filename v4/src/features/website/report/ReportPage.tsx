import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import './report.css';
import type { ReportMeasurement, ReportSurvey } from './types';
import { fetchGrowthReport } from '../services/growthReportService';
import { Hero } from './sections/Hero';
import { DoctorIntro } from './sections/DoctorIntro';
import { Methods } from './sections/Methods';
import { SignalSection } from './sections/SignalSection';
import { HospitalGallery } from './sections/HospitalGallery';
import { Closing } from './sections/Closing';
import { ReportShare } from './sections/ReportShare';
import { DEMO_REPORT } from './reportDemo';

interface ReportData {
  measurement: ReportMeasurement;
  survey: ReportSurvey;
  reportId?: string;
}

export default function ReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { token } = useParams();

  // 1) 세션 내 데이터: 설문 직후 navigate state, 없으면 sessionStorage 폴백
  const inSession = useMemo<ReportData | null>(() => {
    let d = (location.state as ReportData | null) ?? null;
    if (!d?.measurement) {
      try {
        const s = sessionStorage.getItem('growth_report_data');
        if (s) d = JSON.parse(s) as ReportData;
      } catch {
        /* noop */
      }
    }
    return d?.measurement ? d : null;
  }, [location.state]);

  // 2) 영구 링크(/report/r/:token): 저장된 리포트를 토큰으로 조회
  const [fetched, setFetched] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(!!token && !inSession);
  useEffect(() => {
    let alive = true;
    if (token && !inSession) {
      setLoading(true);
      fetchGrowthReport(token).then((d) => {
        if (!alive) return;
        setFetched(d ? { ...d, reportId: token } : null);
        setLoading(false);
      });
    }
    return () => {
      alive = false;
    };
  }, [token, inSession]);

  // 3) 감수/공유용 데모 (`/report?demo=1`)
  const demo = sp.get('demo') != null ? (DEMO_REPORT as ReportData) : null;

  const data: ReportData | null = inSession ?? fetched ?? demo;

  // 공유 링크: 세션(설문 직후)이면 생성한 reportId, 토큰 진입이면 그 토큰. 데모는 공유 없음.
  const shareId = inSession?.reportId ?? (fetched ? token : undefined);
  const shareUrl =
    typeof window === 'undefined'
      ? null
      : shareId
        ? `${window.location.origin}/report/r/${shareId}`
        : demo
          ? `${window.location.origin}/report?demo=1` // 데모: 공유 버튼 노출(리뷰용)
          : null;

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

  if (loading) {
    return (
      <div className="growth-report">
        <div className="wrap" style={{ padding: '64px 20px', textAlign: 'center', color: '#5a5560' }}>
          리포트를 불러오는 중…
        </div>
      </div>
    );
  }

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
        {shareUrl && <ReportShare url={shareUrl} />}
        <DoctorIntro />
        <Methods m={m} name={name} />
        <SignalSection m={m} survey={s} />
        <HospitalGallery />
        <Closing name={name} />
      </div>
    </div>
  );
}
