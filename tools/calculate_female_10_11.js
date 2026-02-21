// 여아 10-11세 (120-131개월) 성장도표 데이터 분석

const data = [
  {month: 120, p50: 139.1, p75: 143.3},
  {month: 121, p50: 139.7, p75: 143.9},
  {month: 122, p50: 140.2, p75: 144.5},
  {month: 123, p50: 140.8, p75: 145.0},
  {month: 124, p50: 141.4, p75: 145.6},
  {month: 125, p50: 141.9, p75: 146.2},
  {month: 126, p50: 142.5, p75: 146.7},
  {month: 127, p50: 143.0, p75: 147.3},
  {month: 128, p50: 143.6, p75: 147.8},
  {month: 129, p50: 144.1, p75: 148.4},
  {month: 130, p50: 144.7, p75: 149.0},
  {month: 131, p50: 145.2, p75: 149.5}
];

// Z-score for 75th percentile ≈ 0.674
const z75 = 0.674;

// LMS 계산 (L=1 가정)
const results = data.map(d => {
  const M = d.p50;
  const S = (d.p75 / M - 1) / z75;
  const age = (d.month / 12).toFixed(1);
  
  return {
    age: parseFloat(age),
    L: 1,
    M: Math.round(M * 10) / 10,
    S: Math.round(S * 10000) / 10000
  };
});

console.log('여아 10-11세 LMS 값:');
console.log(JSON.stringify(results, null, 2));

// 130개월 (10.8세) 백분위 계산
const data130 = results.find(r => Math.abs(r.age - 10.833) < 0.05) || 
                results.find(r => Math.abs(r.age - 10.8) < 0.05);
                
console.log('\n130개월 (10.8세) 데이터:', data130);

// 142cm의 백분위 계산
const height = 142;
const M = data130.M;
const S = data130.S;
const L = 1;

const zScore = ((height / M) ** L - 1) / (L * S);

// Normal CDF 근사
function normalCDF(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

const percentile = normalCDF(zScore) * 100;

console.log('\n142cm의 백분위:');
console.log('Z-score:', zScore.toFixed(3));
console.log('백분위:', percentile.toFixed(1) + '%');

// 예측키 계산 (18세)
const age18_M = 161.1;
const age18_S = 0.0304;
const predicted18 = age18_M * Math.pow(1 + 1 * age18_S * zScore, 1);

console.log('\n18세 예측키:', predicted18.toFixed(1) + 'cm');
