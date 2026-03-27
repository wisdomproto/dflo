import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { fetchSections, saveSections } from '../services/websiteSectionService';

interface SectionItem {
  id: string;
  emoji: string;
  title: string;
  description: string;
  imageUrl?: string;
  link?: string;
}

interface WebsiteSection {
  id: string;
  order: number;
  sectionType: 'growthGuide' | 'recipe' | 'exercise' | 'case';
  title: string;
  subtitle?: string;
  items?: SectionItem[];
  bgColor?: string;
  titleColor?: string;
  createdAt?: string;
  updatedAt?: string;
}

function generateId() {
  return `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function emptySection(order: number): WebsiteSection {
  return {
    id: generateId(),
    order,
    sectionType: 'growthGuide',
    title: `섹션 ${order + 1}`,
    subtitle: '',
    items: [],
  };
}

const ADMIN_PIN = '8054';
const SECTION_TYPE_LABELS: Record<string, string> = {
  growthGuide: '성장가이드',
  recipe: '레시피',
  exercise: '운동',
  case: '사례',
};

export default function AdminSectionsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [authed, setAuthed] = useState(false);
  const [sections, setSections] = useState<WebsiteSection[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Auth
  useEffect(() => {
    if (user?.role === 'admin') {
      setAuthed(true);
      return;
    }
    if (sessionStorage.getItem('website-admin-auth') === 'true') {
      setAuthed(true);
      return;
    }
    // Not authenticated, show PIN input
  }, [user]);

  const handlePinSubmit = () => {
    if (pinInput === ADMIN_PIN) {
      sessionStorage.setItem('website-admin-auth', 'true');
      setAuthed(true);
      setPinError('');
    } else {
      setPinError('비밀번호가 틀렸습니다');
      setPinInput('');
    }
  };

  // Load sections
  useEffect(() => {
    if (!authed) return;
    fetchSections()
      .then((data) => setSections(data.length > 0 ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authed]);

  const save = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const result = await saveSections(sections);
      setSections(result);
      setSaveMsg('저장됨!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) {
      setSaveMsg(`저장 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
      setTimeout(() => setSaveMsg(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  const addSection = () => {
    const newSections = [...sections, emptySection(sections.length)];
    setSections(newSections);
    setActiveTab(newSections.length - 1);
  };

  const updateSection = (id: string, updates: Partial<WebsiteSection>) => {
    setSections(sections.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeSection = (id: string) => {
    const newSections = sections.filter((s) => s.id !== id);
    setSections(newSections);
    if (activeTab >= newSections.length) setActiveTab(Math.max(0, newSections.length - 1));
  };

  const addItem = (sectionId: string) => {
    setSections(
      sections.map((s) => {
        if (s.id === sectionId) {
          return {
            ...s,
            items: [
              ...(s.items || []),
              {
                id: generateId(),
                emoji: '✨',
                title: '제목',
                description: '설명',
              },
            ],
          };
        }
        return s;
      })
    );
  };

  const updateItem = (sectionId: string, itemId: string, updates: Partial<SectionItem>) => {
    setSections(
      sections.map((s) => {
        if (s.id === sectionId && s.items) {
          return {
            ...s,
            items: s.items.map((item) =>
              item.id === itemId ? { ...item, ...updates } : item
            ),
          };
        }
        return s;
      })
    );
  };

  const removeItem = (sectionId: string, itemId: string) => {
    setSections(
      sections.map((s) => {
        if (s.id === sectionId && s.items) {
          return {
            ...s,
            items: s.items.filter((item) => item.id !== itemId),
          };
        }
        return s;
      })
    );
  };

  const currentSection = sections[activeTab] || null;

  // PIN entry screen
  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
          <h1 className="text-2xl font-bold text-center mb-2">🔐 섹션 관리</h1>
          <p className="text-center text-gray-500 text-sm mb-6">관리자 비밀번호를 입력하세요</p>

          <input
            type="password"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handlePinSubmit()}
            placeholder="비밀번호"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 focus:outline-none focus:border-[#0F6E56] text-center text-lg tracking-widest"
            maxLength={4}
            autoFocus
          />

          {pinError && (
            <p className="text-red-500 text-sm text-center mb-4">{pinError}</p>
          )}

          <button
            onClick={handlePinSubmit}
            disabled={!pinInput}
            className="w-full bg-[#0F6E56] text-white font-bold py-3 rounded-xl hover:bg-[#0D5A47] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            확인
          </button>

          <button
            onClick={() => navigate('/website')}
            className="w-full mt-3 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-all"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Link to="/website" className="text-sm text-gray-500 hover:text-[#0F6E56]">
              💫 웹사이트
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-base font-bold text-gray-800">섹션 관리</h1>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="text-sm font-bold text-white bg-[#0F6E56] px-5 py-2 rounded-xl hover:bg-[#0D5A47] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? '저장 중...' : saveMsg ? `✓ ${saveMsg}` : '저장'}
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Tab bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {sections.map((section, idx) => (
            <button
              key={section.id}
              onClick={() => setActiveTab(idx)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                idx === activeTab
                  ? 'bg-[#0F6E56] text-white shadow-md'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-[#0F6E56] hover:text-[#0F6E56]'
              }`}
            >
              섹션 {idx + 1}
            </button>
          ))}
          <button
            onClick={addSection}
            className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#0F6E56] hover:text-[#0F6E56] transition-colors"
          >
            +
          </button>
        </div>

        {/* Loading / Empty state */}
        {loading && (
          <div className="text-center py-16">
            <p className="text-sm text-gray-400">불러오는 중...</p>
          </div>
        )}
        {!loading && sections.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-500 mb-1">관리할 섹션이 없습니다</p>
            <button
              onClick={addSection}
              className="text-sm font-bold text-[#0F6E56] bg-[#E8F5F0] px-6 py-2.5 rounded-xl hover:bg-[#D0EDE4] transition-colors mt-6"
            >
              + 첫 섹션 추가
            </button>
          </div>
        )}

        {/* Section editor */}
        {currentSection && (
          <div className="space-y-4">
            {/* Section details */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  섹션 제목
                </label>
                <input
                  value={currentSection.title}
                  onChange={(e) =>
                    updateSection(currentSection.id, { title: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-[#0F6E56]"
                  placeholder="섹션 제목"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  섹션 유형
                </label>
                <select
                  value={currentSection.sectionType}
                  onChange={(e) =>
                    updateSection(currentSection.id, {
                      sectionType: e.target.value as any,
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]"
                >
                  {Object.entries(SECTION_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  부제목 (선택)
                </label>
                <input
                  value={currentSection.subtitle || ''}
                  onChange={(e) =>
                    updateSection(currentSection.id, { subtitle: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]"
                  placeholder="부제목"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => removeSection(currentSection.id)}
                  className="flex-1 text-sm font-bold text-red-500 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors"
                >
                  🗑️ 섹션 삭제
                </button>
              </div>
            </div>

            {/* Items list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800">컨텐츠</h3>
                <button
                  onClick={() => addItem(currentSection.id)}
                  className="text-xs font-bold text-[#0F6E56] bg-[#E8F5F0] px-4 py-1.5 rounded-lg hover:bg-[#D0EDE4] transition-colors"
                >
                  + 아이템 추가
                </button>
              </div>

              {(!currentSection.items || currentSection.items.length === 0) && (
                <p className="text-xs text-gray-400 text-center py-4">
                  아이템이 없습니다
                </p>
              )}

              {currentSection.items?.map((item, idx) => (
                <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={item.emoji}
                      onChange={(e) =>
                        updateItem(currentSection.id, item.id, {
                          emoji: e.target.value,
                        })
                      }
                      maxLength={2}
                      className="w-10 text-center rounded-lg border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:border-[#0F6E56]"
                    />
                    <input
                      value={item.title}
                      onChange={(e) =>
                        updateItem(currentSection.id, item.id, {
                          title: e.target.value,
                        })
                      }
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-1 text-sm font-semibold focus:outline-none focus:border-[#0F6E56]"
                      placeholder="제목"
                    />
                    <button
                      onClick={() => removeItem(currentSection.id, item.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>

                  <textarea
                    value={item.description}
                    onChange={(e) =>
                      updateItem(currentSection.id, item.id, {
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56] resize-none"
                    placeholder="설명"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
