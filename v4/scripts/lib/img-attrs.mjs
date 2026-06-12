// 빌드 산출 HTML 의 <img> 에 지연 로딩 속성을 더하는 후처리.
// - 문서의 첫 2개 <img>(마스트헤드 로고 + 첫 히어로 = 첫 화면/LCP 후보)는 eager 로 두고
//   fetchpriority="high" 부여 — LCP 이미지를 lazy 로 만들면 오히려 LCP 가 늦어진다
// - 나머지는 loading="lazy" decoding="async" (이미 loading= 이 있으면 존중)
// - <script>…</script> 내부 문자열은 건드리지 않는다 (케이스 뷰어 등 JS 템플릿 보호)

const IMG_TAG = /<img\b[^>]*>/g;
const EAGER_COUNT = 2;

function addAttrs(tag, attrs) {
  if (tag.endsWith('/>')) return `${tag.slice(0, -2).trimEnd()} ${attrs} />`;
  return `${tag.slice(0, -1).trimEnd()} ${attrs}>`;
}

export function lazifyImages(html) {
  let seen = 0;
  const transform = (segment) =>
    segment.replace(IMG_TAG, (tag) => {
      if (seen < EAGER_COUNT) {
        seen += 1;
        return /fetchpriority=/i.test(tag) ? tag : addAttrs(tag, 'fetchpriority="high"');
      }
      if (/loading=/i.test(tag)) return tag;
      const attrs = /decoding=/i.test(tag) ? 'loading="lazy"' : 'loading="lazy" decoding="async"';
      return addAttrs(tag, attrs);
    });

  // 캡처 그룹 split — 홀수 인덱스가 <script> 블록 원문이라 그대로 보존된다
  return html
    .split(/(<script\b[\s\S]*?<\/script>)/gi)
    .map((seg, i) => (i % 2 === 1 ? seg : transform(seg)))
    .join('');
}
