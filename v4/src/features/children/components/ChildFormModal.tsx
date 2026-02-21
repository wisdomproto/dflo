// ================================================
// ChildFormModal - 187 성장케어 v4
// 자녀 추가/수정 모달 폼
// ================================================

import { useState, useEffect } from 'react';
import Modal from '@/shared/components/Modal';
import { useChildrenStore } from '@/stores/childrenStore';
import { useUIStore } from '@/stores/uiStore';
import type { Child, Gender } from '@/shared/types';

interface ChildFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editChild?: Child;
}

interface FormState {
  name: string;
  gender: Gender | '';
  birth_date: string;
  father_height: string;
  mother_height: string;
}

const initialForm: FormState = {
  name: '', gender: '', birth_date: '', father_height: '', mother_height: '',
};

const inputCls = (hasError: boolean) =>
  `w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors ${
    hasError ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-primary'
  }`;

function isValidHeight(v: string) {
  if (!v) return true;
  const n = Number(v);
  return !isNaN(n) && n >= 100 && n <= 220;
}

export function ChildFormModal({ isOpen, onClose, editChild }: ChildFormModalProps) {
  const addChild = useChildrenStore((s) => s.addChild);
  const updateChild = useChildrenStore((s) => s.updateChild);
  const addToast = useUIStore((s) => s.addToast);

  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!editChild;

  useEffect(() => {
    if (isOpen && editChild) {
      setForm({
        name: editChild.name,
        gender: editChild.gender,
        birth_date: editChild.birth_date,
        father_height: editChild.father_height?.toString() ?? '',
        mother_height: editChild.mother_height?.toString() ?? '',
      });
    } else if (isOpen) {
      setForm(initialForm);
    }
    setErrors({});
  }, [isOpen, editChild]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) e.name = '이름을 입력해 주세요';
    if (!form.gender) e.gender = '성별을 선택해 주세요';
    if (!form.birth_date) e.birth_date = '생년월일을 입력해 주세요';
    if (form.father_height && !isValidHeight(form.father_height))
      e.father_height = '100~220cm 사이로 입력해 주세요';
    if (form.mother_height && !isValidHeight(form.mother_height))
      e.mother_height = '100~220cm 사이로 입력해 주세요';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        gender: form.gender as Gender,
        birth_date: form.birth_date,
        father_height: form.father_height ? Number(form.father_height) : undefined,
        mother_height: form.mother_height ? Number(form.mother_height) : undefined,
      };
      if (isEdit && editChild) {
        await updateChild(editChild.id, payload);
        addToast('success', '자녀 정보가 수정되었습니다');
      } else {
        await addChild({ ...payload, parent_id: '' });
        addToast('success', '자녀가 등록되었습니다');
      }
      onClose();
    } catch {
      addToast('error', isEdit ? '수정에 실패했습니다' : '등록에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  const heightField = (key: 'father_height' | 'mother_height', label: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type="number" value={form[key]} placeholder="선택"
          min={100} max={220} step={0.1}
          onChange={(e) => setField(key, e.target.value)}
          className={`${inputCls(!!errors[key])} pr-9`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">cm</span>
      </div>
      {errors[key] && <p className="mt-1 text-xs text-red-500">{errors[key]}</p>}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? '자녀 정보 수정' : '자녀 등록'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 이름 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
          <input
            type="text" value={form.name} placeholder="자녀 이름"
            onChange={(e) => setField('name', e.target.value)}
            className={inputCls(!!errors.name)}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>

        {/* 성별 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
          <div className="grid grid-cols-2 gap-2">
            {([['male', '남아'], ['female', '여아']] as const).map(([value, label]) => (
              <button
                key={value} type="button"
                onClick={() => setField('gender', value)}
                className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  form.gender === value
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 active:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {errors.gender && <p className="mt-1 text-xs text-red-500">{errors.gender}</p>}
        </div>

        {/* 생년월일 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
          <input
            type="date" value={form.birth_date}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => setField('birth_date', e.target.value)}
            className={inputCls(!!errors.birth_date)}
          />
          {errors.birth_date && <p className="mt-1 text-xs text-red-500">{errors.birth_date}</p>}
        </div>

        {/* 부모 키 */}
        <div className="grid grid-cols-2 gap-3">
          {heightField('father_height', '아버지 키')}
          {heightField('mother_height', '어머니 키')}
        </div>

        {/* 제출 */}
        <button
          type="submit" disabled={isSubmitting}
          className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm
                     disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          {isSubmitting ? '저장 중...' : isEdit ? '수정하기' : '등록하기'}
        </button>
      </form>
    </Modal>
  );
}
