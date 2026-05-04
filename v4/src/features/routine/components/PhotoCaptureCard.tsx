import { useState, useRef, useCallback } from 'react';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { useUIStore } from '@/stores/uiStore';

interface AnalysisResult {
  overallScore: number;
  items: {
    label: string;
    status: '정상' | '주의' | '경고';
    detail: string;
  }[];
}

type ViewState = 'capture' | 'analyzing' | 'results';

const STATUS_COLORS: Record<string, string> = {
  정상: 'bg-green-100 text-green-700',
  주의: 'bg-yellow-100 text-yellow-700',
  경고: 'bg-red-100 text-red-700',
};

function generateMockResult(): AnalysisResult {
  const pick = (): '정상' | '주의' | '경고' => {
    const r = Math.random();
    return r < 0.55 ? '정상' : r < 0.85 ? '주의' : '경고';
  };
  const items: AnalysisResult['items'] = [
    { label: '머리 기울기', status: pick(), detail: '' },
    { label: '어깨 균형', status: pick(), detail: '' },
    { label: '골반 균형', status: pick(), detail: '' },
    { label: '무릎 정렬', status: pick(), detail: '' },
  ];
  items.forEach((item) => {
    if (item.status === '정상') item.detail = '양호한 상태입니다.';
    else if (item.status === '주의') item.detail = '약간의 불균형이 감지되었습니다.';
    else item.detail = '전문가 상담을 권장합니다.';
  });
  const normals = items.filter((i) => i.status === '정상').length;
  const cautions = items.filter((i) => i.status === '주의').length;
  const overallScore = Math.min(
    100,
    Math.max(40, normals * 20 + cautions * 10 + Math.floor(Math.random() * 15))
  );
  return { overallScore, items };
}

export function PhotoCaptureCard() {
  const addToast = useUIStore((s) => s.addToast);

  const [view, setView] = useState<ViewState>('capture');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const startAnalysis = useCallback((url: string) => {
    setImageUrl(url);
    setView('analyzing');
    setTimeout(() => {
      setResult(generateMockResult());
      setView('results');
    }, 2000);
  }, []);

  const handleCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setCameraActive(true);
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
    } catch {
      addToast('error', '카메라에 접근할 수 없습니다. 권한을 확인해 주세요.');
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const url = canvas.toDataURL('image/jpeg');
    stopCamera();
    startAnalysis(url);
  };

  const stopCamera = () => {
    const video = videoRef.current;
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    startAnalysis(url);
    e.target.value = '';
  };

  const reset = () => {
    stopCamera();
    setView('capture');
    setImageUrl(null);
    setResult(null);
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
          <span>📸</span> 내 사진
        </h3>
        {view !== 'capture' && (
          <button
            onClick={reset}
            className="text-xs text-gray-400 active:text-gray-600 transition-colors"
          >
            다시 찍기
          </button>
        )}
      </div>

      {view === 'capture' && (
        <>
          {cameraActive ? (
            <div className="space-y-2">
              <video
                ref={videoRef}
                className="w-full rounded-xl bg-black aspect-[3/4] object-cover"
                playsInline
                muted
              />
              <div className="flex gap-2">
                <button
                  onClick={takePhoto}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white active:opacity-90"
                >
                  촬영하기
                </button>
                <button
                  onClick={stopCamera}
                  className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-600 active:bg-gray-200"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 leading-relaxed">
                전신이 보이도록 2~3미터 거리에서 정면 촬영해 주세요.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleCapture}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white active:opacity-90"
                >
                  📷 카메라
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 active:bg-gray-200"
                >
                  🖼️ 사진 업로드
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
            </>
          )}
        </>
      )}

      {view === 'analyzing' && (
        <div className="space-y-3">
          {imageUrl && (
            <img src={imageUrl} alt="촬영된 사진" className="w-full rounded-xl" />
          )}
          <div className="flex flex-col items-center py-4">
            <LoadingSpinner size="md" message="분석 중..." />
          </div>
        </div>
      )}

      {view === 'results' && result && (
        <div className="space-y-3">
          {imageUrl && (
            <img src={imageUrl} alt="분석된 사진" className="w-full rounded-xl" />
          )}

          <div className="text-center bg-gray-50 rounded-xl py-3">
            <p className="text-xs text-gray-500">전체 자세 점수</p>
            <p className={`text-3xl font-bold ${scoreColor(result.overallScore)}`}>
              {result.overallScore}
              <span className="text-sm font-normal text-gray-400"> / 100</span>
            </p>
          </div>

          <div className="space-y-2">
            {result.items.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-2.5"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.detail}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[item.status]}`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
