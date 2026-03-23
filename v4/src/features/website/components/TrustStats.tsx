const STATS = [
  { value: '15,000+', label: '누적 치료 아동' },
  { value: '94.7%', label: '성장 목표 달성률' },
  { value: '20년+', label: '전문 진료 경험' },
];

export function TrustStats() {
  return (
    <section className="bg-[#E8F5F0]">
      <div className="max-w-5xl mx-auto flex justify-around items-center px-4 py-5">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-xl md:text-2xl font-black text-[#0F6E56]">{s.value}</p>
            <p className="text-[11px] md:text-xs font-medium text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
