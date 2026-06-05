const ACCENT = '#4A2D6B';

const STEPS = ['키워드', '구조', '생성', 'SEO'] as const;

interface Props {
  current: 1 | 2 | 3 | 4;
  onJump: (step: 1 | 2 | 3 | 4) => void;
}

export function WorkflowStepBar({ current, onJump }: Props) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((label, i) => {
        const step = (i + 1) as 1 | 2 | 3 | 4;
        const isActive = step === current;
        const isDone = step < current;

        return (
          <div key={label} className="flex flex-1 items-center">
            <button
              type="button"
              onClick={() => onJump(step)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-white'
                  : isDone
                    ? 'hover:bg-gray-100'
                    : 'text-gray-400 hover:bg-gray-100'
              }`}
              style={
                isActive
                  ? { backgroundColor: ACCENT }
                  : isDone
                    ? { color: ACCENT }
                    : undefined
              }
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isActive ? 'bg-white/25 text-white' : isDone ? 'text-white' : 'bg-gray-200 text-gray-500'
                }`}
                style={isDone ? { backgroundColor: ACCENT } : undefined}
              >
                {step}
              </span>
              <span className="whitespace-nowrap">{label}</span>
            </button>
            {i < STEPS.length - 1 && <span className="px-1 text-gray-300">›</span>}
          </div>
        );
      })}
    </div>
  );
}
