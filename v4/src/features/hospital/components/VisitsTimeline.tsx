import { Link } from 'react-router-dom';
import type { Visit } from '@/shared/types';

export function VisitsTimeline({ childId, visits }: { childId: string; visits: Visit[] }) {
  if (visits.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
        내원 기록이 없습니다.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {visits.map((v) => (
        <li key={v.id}>
          <Link
            to={`/admin/patients/${childId}/visits/${v.id}`}
            className="block rounded-lg border p-3 hover:bg-gray-50"
          >
            <div className="text-sm font-semibold">{v.visit_date}</div>
            {v.chief_complaint && (
              <div className="text-xs text-gray-600 line-clamp-2">{v.chief_complaint}</div>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
