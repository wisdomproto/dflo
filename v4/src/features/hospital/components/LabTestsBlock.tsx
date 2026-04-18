import { useEffect, useState } from 'react';
import type { LabTest, LabTestType } from '@/shared/types';
import {
  fetchLabTestsByVisit,
  createLabTest,
  updateLabTest,
} from '@/features/hospital/services/labTestService';
import { AllergyLabEditor, type AllergyResultData } from './AllergyLabEditor';
import {
  FreeformLabEditor,
  type FreeformResultData,
  type LabAttachment,
} from './FreeformLabEditor';

const TABS: { key: LabTestType; label: string }[] = [
  { key: 'allergy', label: '알러지' },
  { key: 'organic_acid', label: '유기산' },
  { key: 'blood', label: '혈액' },
];

export function LabTestsBlock({
  visitId,
  childId,
}: {
  visitId: string;
  childId: string;
}) {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [tab, setTab] = useState<LabTestType>('allergy');

  async function reload() {
    setTests(await fetchLabTestsByVisit(visitId));
  }
  useEffect(() => {
    reload();
  }, [visitId]);

  const current = tests.find((t) => t.test_type === tab) ?? null;

  async function save(patch: { result_data: object; attachments?: LabAttachment[] }) {
    if (current) {
      await updateLabTest(current.id, {
        result_data: patch.result_data as LabTest['result_data'],
        attachments: (patch.attachments ?? current.attachments) as LabTest['attachments'],
      });
    } else {
      await createLabTest({
        visit_id: visitId,
        child_id: childId,
        test_type: tab,
        result_data: patch.result_data as Record<string, unknown>,
        attachments: patch.attachments ?? [],
      });
    }
    reload();
  }

  return (
    <div>
      <div className="mb-3 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded px-3 py-1 text-sm ${
              tab === t.key ? 'bg-[#667eea] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'allergy' ? (
        <AllergyLabEditor
          value={(current?.result_data as AllergyResultData) ?? { danger: [], caution: [] }}
          onChange={(v) => save({ result_data: v, attachments: current?.attachments ?? [] })}
        />
      ) : (
        <FreeformLabEditor
          childId={childId}
          value={(current?.result_data as unknown as FreeformResultData) ?? { note: '' }}
          attachments={current?.attachments ?? []}
          onChange={(v) => save({ result_data: v, attachments: current?.attachments ?? [] })}
          onAttachmentsChange={(a) =>
            save({ result_data: current?.result_data ?? { note: '' }, attachments: a })
          }
        />
      )}
    </div>
  );
}
