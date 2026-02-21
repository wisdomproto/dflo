import { useCallback, useRef, useState } from 'react';
import { parseCSV, importPatients, type ImportRow } from '@/features/admin/services/adminService';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

const SAMPLE_CSV = `name,gender,birth_date,father_height,mother_height,height,weight,measured_date
홍길동,male,2018-03-15,175,162,110.5,20.3,2024-12-01
김영희,female,2019-07-22,180,165,95.2,15.1,2024-12-01`;

const COLUMNS = [
  'name', 'gender', 'birth_date', 'father_height',
  'mother_height', 'height', 'weight', 'measured_date',
] as const;

function downloadSampleCSV() {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample_patients.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function hasIssue(row: ImportRow) {
  return !row.name || !row.birth_date;
}

export default function AdminImportPage() {
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);

  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      addToast('error', 'CSV 파일만 업로드 가능합니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        setRows(parsed);
        addToast('success', `${parsed.length}건의 데이터가 파싱되었습니다.`);
      } catch {
        addToast('error', 'CSV 파싱에 실패했습니다.');
      }
    };
    reader.readAsText(file);
  }, [addToast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  const handleImport = async () => {
    if (!user) {
      addToast('error', '로그인이 필요합니다.');
      return;
    }
    setImporting(true);
    try {
      const { imported, failed } = await importPatients(user.id, rows);
      addToast('success', `${imported}건 등록 완료, ${failed}건 실패`);
      setRows([]);
    } catch {
      addToast('error', '업로드 중 오류가 발생했습니다.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">환자 데이터 업로드</h1>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
        }`}
      >
        <p className="text-lg font-medium text-gray-600">CSV 파일을 여기에 드래그하거나 클릭하여 선택하세요</p>
        <p className="text-sm text-gray-400 mt-1">.csv 파일만 지원</p>
        <input ref={inputRef} type="file" accept=".csv" onChange={onFileChange} className="hidden" />
      </div>

      {/* CSV format guide */}
      <section className="bg-blue-50 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-sm text-blue-900">CSV 형식 안내</h2>
        <p className="text-xs text-blue-800">
          필수 컬럼: <strong>name, gender, birth_date</strong> &nbsp;|&nbsp; 선택 컬럼: father_height, mother_height, height, weight, measured_date
        </p>
        <div className="overflow-x-auto text-xs font-mono bg-white/60 rounded-lg p-2">
          <pre>{SAMPLE_CSV}</pre>
        </div>
        <p className="text-xs text-blue-700">* 한국어 헤더도 지원됩니다 (이름, 성별, 생년월일, 아버지키, 어머니키, 키, 체중, 측정일)</p>
        <button onClick={downloadSampleCSV} className="text-sm font-semibold text-primary hover:underline">
          샘플 CSV 다운로드
        </button>
      </section>

      {/* Preview table */}
      {rows.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">{rows.length}건의 데이터가 파싱되었습니다</p>
            <button
              onClick={handleImport}
              disabled={importing}
              className="bg-primary text-white rounded-xl px-6 py-3 font-semibold disabled:opacity-50"
            >
              {importing ? '업로드 중...' : '업로드 시작'}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-xs font-medium text-gray-500 px-3 py-2 text-left">#</th>
                    {COLUMNS.map((col) => (
                      <th key={col} className="text-xs font-medium text-gray-500 px-3 py-2 text-left">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={hasIssue(row) ? 'bg-red-50 text-red-700' : 'even:bg-gray-50'}>
                      <td className="px-3 py-2">{i + 1}</td>
                      {COLUMNS.map((col) => (
                        <td key={col} className="px-3 py-2 whitespace-nowrap">{row[col] ?? '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
