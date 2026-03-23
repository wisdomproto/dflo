export function HeroSection() {
  const scrollToCalc = () => {
    document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0F6E56 0%, #0D5A47 60%, #1A3A32 100%)' }}>
      <div className="max-w-5xl mx-auto px-6 pt-16 pb-12 md:pt-24 md:pb-20">
        <div className="max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 mb-6">
            <span className="text-sm">📏</span>
            <span className="text-xs font-semibold text-white/80">187 성장클리닉</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-4">
            우리 아이,<br />얼마나 클까?
          </h1>
          <p className="text-base md:text-lg text-white/65 mb-8">
            지금 바로 예상 키를 무료로 측정해보세요
          </p>
          <button onClick={scrollToCalc}
            className="flex items-center justify-center gap-2 w-full md:w-auto rounded-2xl bg-white px-8 py-4
                       text-[#0F6E56] font-bold text-base hover:bg-gray-50 active:scale-[0.98] transition-all shadow-lg">
            <span>📐</span>
            예측키 무료 측정하기
          </button>
        </div>
      </div>
    </section>
  );
}
