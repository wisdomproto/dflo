import { useEffect, useMemo, useRef, useState } from 'react';
import PatientForm from './PatientForm';
import XrayUpload from './XrayUpload';
import XrayPreview from './XrayPreview';
import MatchResultView from './MatchResultView';
import BoneAgeInput from './BoneAgeInput';
import PredictionResult from './PredictionResult';
import { byGenderSorted, loadAtlas, neighborInSorted } from '@/features/bone-age/lib/atlas';
import { computeAge, matchByAge, todayIso } from '@/features/bone-age/lib/matcher';
import type { AtlasEntry, Gender, PatientInput } from '@/features/bone-age/lib/types';
import type { Child } from '@/shared/types';
import { logger } from '@/shared/lib/logger';
import {
  createXrayReading,
  uploadXrayImage,
} from '@/features/bone-age/services/xrayReadingService';

interface Props {
  child: Child;
  visitId: string;
}

export function BoneAgeTool({ child, visitId }: Props) {
  // Map v4's 'male' | 'female' → BoneAgeAI's 'M' | 'F' at the boundary.
  const initialGender: Gender = child.gender === 'male' ? 'M' : 'F';

  const [patient, setPatient] = useState<PatientInput>({
    gender: initialGender,
    birthDate: child.birth_date ?? '',
    xrayDate: todayIso(),
  });
  const [atlas, setAtlas] = useState<AtlasEntry[] | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  /** Manual override for the younger (left) atlas. Resets whenever patient inputs change. */
  const [manualYounger, setManualYounger] = useState<AtlasEntry | null>(null);
  const [boneAge, setBoneAge] = useState<number | null>(null);
  const [currentHeight, setCurrentHeight] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const prevUrl = useRef<string | null>(null);

  useEffect(() => {
    loadAtlas()
      .then((d) => setAtlas(d.entries))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const age = useMemo(
    () => computeAge(patient.birthDate, patient.xrayDate),
    [patient.birthDate, patient.xrayDate],
  );

  const sortedAtlas = useMemo(
    () => (atlas ? byGenderSorted(atlas, patient.gender) : []),
    [atlas, patient.gender],
  );

  const autoMatch = useMemo(() => {
    if (!atlas) return { patientAge: null, younger: null, older: null };
    return matchByAge(atlas, patient.gender, age);
  }, [atlas, patient.gender, age]);

  // Reset manual override when gender or age changes
  useEffect(() => {
    setManualYounger(null);
  }, [patient.gender, age]);

  // Default younger = auto match (or first entry if age is unknown)
  const effectiveYounger: AtlasEntry | null =
    manualYounger ?? autoMatch.younger ?? sortedAtlas[0] ?? null;
  const effectiveOlder: AtlasEntry | null = neighborInSorted(sortedAtlas, effectiveYounger, 1);

  const canStepUp =
    effectiveYounger !== null &&
    neighborInSorted(sortedAtlas, effectiveYounger, 1) !== null &&
    // Also need an older after stepping (so right-panel still has content)
    neighborInSorted(sortedAtlas, effectiveYounger, 2) !== null;
  const canStepDown =
    effectiveYounger !== null && neighborInSorted(sortedAtlas, effectiveYounger, -1) !== null;

  const handleYoungerStep = (offset: number) => {
    const next = neighborInSorted(sortedAtlas, effectiveYounger, offset);
    if (next) setManualYounger(next);
  };

  const handleFile = (file: File) => {
    setError(null);
    if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
    const url = URL.createObjectURL(file);
    prevUrl.current = url;
    setImageUrl(url);
    setImageFile(file);
    setSaved(false);
  };

  const resetImage = () => {
    if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
    prevUrl.current = null;
    setImageUrl(null);
    setImageFile(null);
  };

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
    };
  }, []);

  const canPredict = boneAge !== null && currentHeight !== null && currentHeight > 0;

  const handleSave = async () => {
    if (!canPredict || boneAge === null) return;
    setSaving(true);
    setError(null);
    try {
      let image_path: string | undefined;
      if (imageFile) {
        image_path = await uploadXrayImage(child.id, imageFile);
      }
      await createXrayReading({
        visit_id: visitId,
        child_id: child.id,
        xray_date: patient.xrayDate,
        image_path,
        bone_age_result: boneAge,
        atlas_match_younger: effectiveYounger?.file ?? undefined,
        atlas_match_older: effectiveOlder?.file ?? undefined,
        doctor_memo: undefined,
      });
      setSaved(true);
    } catch (e) {
      logger.error('BoneAgeTool save failed', e);
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl w-full px-4 py-6 space-y-6 text-slate-900 bg-white">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">🦴 BoneAgeAI — Atlas 비교 + 예상키 예측</h1>
        <p className="text-sm text-slate-600">
          생년월일/X-ray일로 역년령 계산 → 『소아의 골연령 판정』 Atlas의 위·아래 레퍼런스 비교 →
          판독 뼈나이 + 현재 키 입력 → Bayley-Pinneau 방식으로 예상 성인키 자동 계산.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 p-5 space-y-4 bg-white">
        <h2 className="text-base font-bold text-slate-800">① 환자 정보</h2>
        <PatientForm value={patient} onChange={setPatient} age={age} />
      </section>

      <section className="rounded-lg border border-slate-200 p-5 space-y-4 bg-white">
        <h2 className="text-base font-bold text-slate-800">② X-ray 이미지 (선택)</h2>
        {!imageUrl ? (
          <XrayUpload onFile={handleFile} />
        ) : (
          <XrayPreview imageUrl={imageUrl} onReset={resetImage} />
        )}
      </section>

      <section className="rounded-lg border border-slate-200 p-5 space-y-4 bg-white">
        <h2 className="text-base font-bold text-slate-800">
          ③ Atlas 비교 (younger / patient / older)
          <span className="ml-2 text-xs font-normal text-slate-500">
            ↑↓ 버튼으로 왼쪽 이미지의 나이를 조정하면 오른쪽이 자동으로 한 단계 뒤로 바뀝니다.
          </span>
        </h2>
        {atlas ? (
          <MatchResultView
            patient={patient}
            patientAge={age}
            patientImageUrl={imageUrl}
            younger={effectiveYounger}
            older={effectiveOlder}
            onYoungerStep={handleYoungerStep}
            canStepUp={canStepUp}
            canStepDown={canStepDown}
          />
        ) : (
          <div className="text-sm text-slate-500">Atlas 로딩 중…</div>
        )}
        {manualYounger && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setManualYounger(null)}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50"
            >
              자동 매칭으로 초기화
            </button>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 p-5 space-y-4 bg-white">
        <h2 className="text-base font-bold text-slate-800">④ 뼈나이 판독 & 현재 키</h2>
        <p className="text-xs text-slate-500">
          위 Atlas를 시각 비교해서 판단한 <strong>실제 뼈나이</strong>와 환자의{' '}
          <strong>현재 키</strong>를 입력하세요. 퀵 버튼으로 왼쪽/오른쪽 이미지 나이를 바로 채울 수
          있습니다.
        </p>
        <BoneAgeInput
          boneAge={boneAge}
          onBoneAgeChange={(v) => {
            setBoneAge(v);
            setSaved(false);
          }}
          height={currentHeight}
          onHeightChange={(v) => {
            setCurrentHeight(v);
            setSaved(false);
          }}
          match={{ patientAge: age, younger: effectiveYounger, older: effectiveOlder }}
        />
      </section>

      <section className="rounded-lg border border-slate-200 p-5 space-y-4 bg-white">
        <h2 className="text-base font-bold text-slate-800">⑤ 예상 성인키 & 성장 곡선</h2>
        {canPredict && boneAge !== null && currentHeight !== null ? (
          <PredictionResult
            gender={patient.gender}
            patientAge={age}
            boneAge={boneAge}
            currentHeight={currentHeight}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            ④ 단계의 뼈나이와 현재 키를 입력하면 예상 성인키와 성장 곡선이 애니메이션으로
            표시됩니다.
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 p-5 space-y-4 bg-white">
        <h2 className="text-base font-bold text-slate-800">⑥ 판독 저장</h2>
        <p className="text-xs text-slate-500">
          뼈나이 판독 결과를 이 내원 기록에 저장합니다. X-ray 이미지가 업로드된 경우 PHI 저장소에
          함께 보관되며, 뼈나이가 해당 내원의 측정 기록에도 반영됩니다.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canPredict || saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? '저장 중…' : '판독 저장'}
          </button>
          {saved && (
            <span className="text-sm font-medium text-emerald-600">저장됨</span>
          )}
          {!canPredict && (
            <span className="text-xs text-slate-500">
              먼저 ④ 단계의 뼈나이와 현재 키를 입력하세요.
            </span>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
          오류: {error}
        </div>
      )}
    </div>
  );
}
