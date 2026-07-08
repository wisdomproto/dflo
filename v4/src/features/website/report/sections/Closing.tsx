import { useState } from 'react';
import { ReservationModal } from '../../components/ReservationModal';

export function Closing({ name, desiredHeight }: { name: string; desiredHeight?: string }) {
  const [rvOpen, setRvOpen] = useState(false);
  const dh = desiredHeight && Number(desiredHeight) > 0 ? Number(desiredHeight) : null;
  return (
    <>
      {/* closing hook */}
      <section>
        <div className="card hook" style={{ marginTop: '14px' }}>
          <h3>🏥 {dh ? `희망키 ${dh}cm까지, 가능할까요?` : '더 정확한 평가가 필요하다면'}</h3>
          <p>
            {dh
              ? <>희망하시는 <b className="big">{dh}cm</b> 도달 가능성은 설문·예측만으로는 확정할 수 없습니다. </>
              : '설문으로는 여기까지가 최선입니다. '}
            병원에서는 <b className="big">뼈나이(X-ray)</b>로 남은 성장 시간을 정확히 측정하고,{' '}
            <b className="big">혈액검사</b>로 성장호르몬·갑상선·철분·비타민D·성호르몬을 확인해{' '}
            <b>성장을 저해하는 숨은 원인</b>을 찾아냅니다. {dh ? '희망키까지 갈 수 있는지는' : '정확한 평가는'}{' '}
            <b>내원 정밀 검사(진단)</b>를 통해서만 정확히 알 수 있습니다.
          </p>
        </div>
      </section>

      {/* CTA */}
      <div className="cta">
        <h3>{name} 맞춤 성장 상담</h3>
        <p>
          이 리포트를 바탕으로 원장이 직접
          <br />
          정확한 성장 계획을 안내해 드립니다
        </p>
        <a className="kk" href="https://pf.kakao.com/_mxbWxfX" target="_blank" rel="noopener noreferrer">
          💬 카카오톡 1:1 상담
        </a>
        <button type="button" className="rv" onClick={() => setRvOpen(true)}>
          📞 번호 남기고 예약하기
        </button>
        <div className="tel">
          📞 <a href="tel:1599-0741">1599-0741</a>
        </div>
      </div>

      <ReservationModal open={rvOpen} onClose={() => setRvOpen(false)} source="report" />

      {/* refs */}
      <section id="refs">
        <div className="sec-t" style={{ fontSize: '14px' }}>
          📚 참고문헌
        </div>
        <div className="refs">
          <span className="n">1.</span> Common genetic variants and human height. <i>Nature</i> 2022.{' '}
          <a href="https://pubmed.ncbi.nlm.nih.gov/36224396/" target="_blank" rel="noopener noreferrer">
            36224396
          </a>
          <br />
          <span className="n">2.</span> Prediction of adult height from bone age. <i>Arch Dis Child</i>{' '}
          1975.{' '}
          <a href="https://pubmed.ncbi.nlm.nih.gov/164838/" target="_blank" rel="noopener noreferrer">
            164838
          </a>
          <br />
          <span className="n">3.</span> 질병관리청 2017 소아·청소년 성장도표
          <br />
          <span className="n">4.</span> Neural regulation of GH secretion. <i>NEJM</i> 1973.{' '}
          <a href="https://pubmed.ncbi.nlm.nih.gov/4575024/" target="_blank" rel="noopener noreferrer">
            4575024
          </a>
          <br />
          <span className="n">5.</span> Precocious puberty and statural growth.{' '}
          <i>Hum Reprod Update</i> 2004.{' '}
          <a href="https://pubmed.ncbi.nlm.nih.gov/15073143/" target="_blank" rel="noopener noreferrer">
            15073143
          </a>
          <br />
          <span className="n">6.</span> Effects of obesity on human sexual development.{' '}
          <i>Nat Rev Endocrinol</i> 2012.{' '}
          <a href="https://pubmed.ncbi.nlm.nih.gov/22290357/" target="_blank" rel="noopener noreferrer">
            22290357
          </a>
          <br />
          <span className="n">7.</span> Animal protein intake, IGF-1, and growth. <i>AJCN</i> 2004.{' '}
          <a href="https://pubmed.ncbi.nlm.nih.gov/15277169/" target="_blank" rel="noopener noreferrer">
            15277169
          </a>
          <br />
          <span className="n">8.</span> Cow's milk and linear growth. <i>Annu Rev Nutr</i> 2006.{' '}
          <a href="https://pubmed.ncbi.nlm.nih.gov/16848703/" target="_blank" rel="noopener noreferrer">
            16848703
          </a>
          <br />
          <span className="n">9.</span> Jumping exercise and bone. <i>JBMR</i> 2002.{' '}
          <a href="https://pubmed.ncbi.nlm.nih.gov/11874228/" target="_blank" rel="noopener noreferrer">
            11874228
          </a>
          <br />
          <span className="n">10.</span> Natural growth in children born SGA. <i>Acta Paediatr</i> 1994.{' '}
          <a href="https://pubmed.ncbi.nlm.nih.gov/7949620/" target="_blank" rel="noopener noreferrer">
            7949620
          </a>
          <br />
          <span className="n">11.</span> Consensus on idiopathic short stature. <i>JCEM</i> 2008.{' '}
          <a href="https://pubmed.ncbi.nlm.nih.gov/18782877/" target="_blank" rel="noopener noreferrer">
            18782877
          </a>
          <br />
          <span className="n">12.</span> Chronic inflammation &amp; growth (IBD). <i>Nutrients</i> 2025.{' '}
          <a href="https://pubmed.ncbi.nlm.nih.gov/41305596/" target="_blank" rel="noopener noreferrer">
            41305596
          </a>
          <br />
          <span className="n">13.</span> Stress-related growth failure (psychosocial). <i>Lancet</i>{' '}
          1996.{' '}
          <a href="https://pubmed.ncbi.nlm.nih.gov/8709732/" target="_blank" rel="noopener noreferrer">
            8709732
          </a>
        </div>
      </section>

      <footer>
        본 리포트는 설문 기반 참고용 예측이며 의료 진단이 아닙니다.
        <br />
        정확한 평가는 의료진의 진료가 필요합니다.
        <br />
        연세새봄의원 187 성장클리닉 · dr187growup.com
      </footer>
    </>
  );
}
