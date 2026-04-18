import { useNavigate, useParams } from 'react-router-dom';
import { createVisit } from '@/features/hospital/services/visitService';
import { VisitForm } from '@/features/hospital/components/VisitForm';
import { useAuthStore } from '@/stores/authStore';

export default function AdminVisitNewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  if (!id) return null;

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <h1 className="text-xl font-bold">새 내원 기록</h1>
      <VisitForm
        onSubmit={async (values) => {
          const v = await createVisit({
            child_id: id,
            doctor_id: user?.id,
            ...values,
          });
          navigate(`/admin/patients/${id}/visits/${v.id}`);
        }}
        submitLabel="내원 기록 저장"
      />
    </div>
  );
}
