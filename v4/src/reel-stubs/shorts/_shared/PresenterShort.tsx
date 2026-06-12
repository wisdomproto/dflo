// Railway 빌드 폴백 스텁 — 배포 빌드 컨텍스트(root dir=v4)에는 ../remotion/src 가 없어
// '@reel/*' 크로스 import 가 깨진다. tsconfig paths / vite alias 가 remotion 소스 부재 시
// 이 디렉토리로 폴백해 빌드를 통과시키고, 에디터 미리보기 자리엔 안내만 렌더한다.
// (릴 미리보기·렌더는 로컬 전용 워크플로우 — 프로덕션에서 Player 동작이 필요해지면
//  Railway 빌드 컨텍스트에 remotion/src 를 포함시키는 쪽으로 전환할 것)
export const PresenterShort = (_props: Record<string, unknown>) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1a1625',
      color: '#b9b3c9',
      fontSize: 28,
      textAlign: 'center',
      lineHeight: 1.6,
      padding: 40,
    }}
  >
    릴 미리보기는 로컬 개발 환경에서만
    <br />
    지원됩니다 (remotion 소스 필요)
  </div>
);
