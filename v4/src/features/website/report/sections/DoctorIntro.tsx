export function DoctorIntro() {
  return (
    <section>
      <div className="doc">
        <img className="doc-photo" src="/images/doctor.webp" alt="채용현 대표원장" />
        <div>
          <span className="doc-badge">원장 소개</span>
          <div className="doc-name">
            채용현 <span>대표원장</span>
          </div>
          <div className="doc-quote">"고객의 건강과 웰빙을 위해 헌신합니다."</div>
        </div>
      </div>
      <div className="doc-cv">
        <div className="cv-row">
          <b>연세대 의과대학·의학대학원 졸업</b> · 강남세브란스 인턴·레지던트 수료
        </div>
        <div className="cv-row">
          <b>호르몬 치료 전문</b> · 연세새봄의원 대표원장 (한국 본원·태국 지점)
        </div>
        <div className="cv-row">프로 스포츠팀 전담의 (SSG 랜더스·넥센 히어로즈)</div>
        <div className="cv-chips">
          <span>📺 알토란·황금알·만물상 출연</span>
          <span>📰 Vogue·중앙일보 칼럼</span>
          <span>▶ YouTube @187growup</span>
        </div>
      </div>
    </section>
  );
}
