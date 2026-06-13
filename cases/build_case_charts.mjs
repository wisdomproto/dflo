// 치료사례 후보 페이지용 차트 번들 빌드 — caseChartsStandalone.ts(+ Chart.js + growthStandard)를
// 단일 IIFE 로 묶어 정적 페이지가 <script> 로 싣게 한다. 출력: window.CaseCharts.
// 실행: node cases/build_case_charts.mjs (어느 cwd 든 OK — esbuild 는 v4/node_modules 에서 resolve)
import { createRequire } from 'node:module';
import path from 'node:path';

const ROOT = 'C:/project/dflo/v4';
const require = createRequire(path.join(ROOT, 'package.json'));
const { build } = require('esbuild');

await build({
  entryPoints: [path.join(ROOT, 'src/features/hospital/lib/caseChartsStandalone.ts')],
  bundle: true,
  format: 'iife',
  target: 'es2018',
  minify: true,
  legalComments: 'none',
  outfile: path.join(ROOT, 'public/marketing/strategy/case-charts.js'),
  alias: { '@': path.join(ROOT, 'src') },
  loader: { '.ts': 'ts' },
  logLevel: 'info',
});

console.log('OK → v4/public/marketing/strategy/case-charts.js');
