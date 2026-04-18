import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Child } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { BoneAgeTool } from '@/features/bone-age/components/BoneAgeTool';

export default function AdminBoneAgePage() {
  const { id, visitId } = useParams<{ id: string; visitId: string }>();
  const [child, setChild] = useState<Child | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('children')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setChild(data as Child));
  }, [id]);

  if (!id || !visitId) return null;
  if (!child) return <div className="p-6 text-sm text-gray-500">로딩…</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">🦴 뼈나이 판독 · {child.name}</h1>
        <Link
          to={`/admin/patients/${id}/visits/${visitId}`}
          className="text-sm text-gray-500 hover:underline"
        >
          ← 내원 상세
        </Link>
      </header>
      <BoneAgeTool child={child} visitId={visitId} />
    </div>
  );
}
