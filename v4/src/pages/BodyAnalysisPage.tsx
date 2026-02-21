import { useState, useRef, useCallback } from 'react';
import Layout from '@/shared/components/Layout';
import Card from '@/shared/components/Card';
import ChildSelector from '@/shared/components/ChildSelector';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { useChildrenStore } from '@/stores/childrenStore';
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

export default function BodyAnalysisPage() {
  const getSelectedChild = useChildrenStore((s) => s.getSelectedChild);
  const selectedChild = getSelectedChild();
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

  const resetCapture = () => {
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
    <Layout title="체형 분석" showBack>
      <div className="space-y-4 pb-6">
        <ChildSelector />

        {!selectedChild && (
          <Card className="text-center text-sm text-gray-400 py-8">
            아이를 먼저 선택해 주세요.
          </Card>
        )}

        {selectedChild && view === 'capture' && (
          <>
            {cameraActive ? (
              <Card className="space-y-3">
                <video
                  ref={videoRef}
                  className="w-full rounded-xl bg-black"
                  playsInline
                  muted
                />
                <div className="flex gap-2">
                  <button
                    onClick={takePhoto}
                    className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white active:bg-blue-700"
                  >
                    촬영하기
                  </button>
                  <button
                    onClick={stopCamera}
                    className="flex-1 rounded-xl bg-gray-200 py-3 text-sm font-semibold text-gray-700 active:bg-gray-300"
                  >
                    취소
                  </button>
                </div>
              </Card>
            ) : (
              <>
                <Card className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-800">촬영 안내</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    아이의 전신이 보이도록 2~3미터 거리에서 촬영해 주세요. 밝은 조명과
                    단색 배경에서 촬영하면 더 정확한 분석이 가능합니다.
                  </p>
                </Card>

                <Card className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-800">자세 안내</h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3">
                      <span className="mt-0.5 text-blue-500 text-sm">&#128247;</span>
                      <div>
                        <p className="text-xs font-medium text-gray-800">정면 촬영</p>
                        <p className="text-xs text-gray-500">
                          팔을 자연스럽게 내린 상태
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3">
                      <span className="mt-0.5 text-blue-500 text-sm">&#128247;</span>
                      <div>
                        <p className="text-xs font-medium text-gray-800">측면 촬영</p>
                        <p className="text-xs text-gray-500">
                          팔을 앞으로 자연스럽게
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                <div className="flex gap-3">
                  <button
                    onClick={handleCapture}
                    className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white active:bg-blue-700"
                  >
                    카메라 촬영
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 rounded-xl bg-gray-200 py-3 text-sm font-semibold text-gray-700 active:bg-gray-300"
                  >
                    사진 업로드
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

        {selectedChild && view === 'analyzing' && (
          <div className="space-y-4">
            {imageUrl && (
              <Card>
                <img src={imageUrl} alt="촬영된 사진" className="w-full rounded-xl" />
              </Card>
            )}
            <div className="flex flex-col items-center py-8">
              <LoadingSpinner size="lg" message="체형을 분석하고 있습니다..." />
            </div>
          </div>
        )}

        {selectedChild && view === 'results' && result && (
          <div className="space-y-4">
            {imageUrl && (
              <Card>
                <img src={imageUrl} alt="분석된 사진" className="w-full rounded-xl" />
              </Card>
            )}

            <Card className="text-center space-y-1">
              <p className="text-xs text-gray-500">전체 자세 점수</p>
              <p className={`text-4xl font-bold ${scoreColor(result.overallScore)}`}>
                {result.overallScore}
                <span className="text-base font-normal text-gray-400"> / 100</span>
              </p>
            </Card>

            <Card className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">세부 분석</h3>
              <div className="space-y-2">
                {result.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
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
            </Card>

            <div className="flex gap-3">
              <button
                onClick={resetCapture}
                className="flex-1 rounded-xl bg-gray-200 py-3 text-sm font-semibold text-gray-700 active:bg-gray-300"
              >
                다시 촬영
              </button>
              <button
                onClick={() => addToast('success', '체형 분석 결과가 저장되었습니다')}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white active:bg-blue-700"
              >
                결과 저장
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
