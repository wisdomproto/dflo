import { useState } from 'react';
import { supabase } from '@/shared/lib/supabase';

export interface FreeformResultData {
  note: string;
}
export interface LabAttachment {
  url: string;
  name: string;
  mime: string;
}

export function FreeformLabEditor({
  childId,
  value,
  attachments,
  onChange,
  onAttachmentsChange,
}: {
  childId: string;
  value: FreeformResultData;
  attachments: LabAttachment[];
  onChange: (v: FreeformResultData) => void;
  onAttachmentsChange: (a: LabAttachment[]) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `labs/${childId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('content-images').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('content-images').getPublicUrl(path);
      onAttachmentsChange([
        ...attachments,
        { url: data.publicUrl, name: file.name, mime: file.type },
      ]);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs text-gray-600">결과 메모</label>
      <textarea
        rows={4}
        value={value.note}
        onChange={(e) => onChange({ note: e.target.value })}
        className="w-full rounded border px-2 py-1 text-sm"
      />
      <div>
        <div className="mb-1 text-xs text-gray-600">첨부</div>
        <ul className="space-y-1 text-xs text-gray-700">
          {attachments.map((a, i) => (
            <li key={i}>
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="text-[#667eea] hover:underline"
              >
                {a.name}
              </a>
              <button
                onClick={() => onAttachmentsChange(attachments.filter((_, j) => j !== i))}
                className="ml-2 text-red-500"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
        <input
          type="file"
          accept="application/pdf,image/*"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          disabled={uploading}
          className="mt-1 text-xs"
        />
      </div>
    </div>
  );
}
