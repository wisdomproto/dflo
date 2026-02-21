/**
 * 한국 표준 성장도표 LMS 계산 라이브러리
 * 대한소아과학회 2017 한국 소아청소년 성장도표 기반
 */

class KoreaGrowthStandard {
    constructor() {
        this.data = null;
        this.isLoaded = false;
    }

    /**
     * 데이터 로드
     */
    async loadData() {
        if (this.isLoaded) return;
        
        try {
            const response = await fetch('data/korea_growth_standard.json');
            this.data = await response.json();
            this.isLoaded = true;
            console.log('✅ 한국 표준 성장도표 데이터 로드 완료');
        } catch (error) {
            console.error('❌ 한국 표준 성장도표 데이터 로드 실패:', error);
            throw error;
        }
    }

    /**
     * 표준정규분포 누적분포함수 (CDF) - 백분위 계산용
     */
    normalCDF(z) {
        const t = 1 / (1 + 0.2316419 * Math.abs(z));
        const d = 0.3989423 * Math.exp(-z * z / 2);
        const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        return z > 0 ? 1 - p : p;
    }

    /**
     * 표준정규분포 역함수 (Inverse CDF) - Z-score를 백분위로 변환
     */
    normalInverseCDF(p) {
        if (p <= 0 || p >= 1) {
            throw new Error('백분위는 0과 1 사이여야 합니다');
        }

        // Beasley-Springer-Moro 알고리즘
        const a0 = 2.50662823884;
        const a1 = -18.61500062529;
        const a2 = 41.39119773534;
        const a3 = -25.44106049637;
        const b1 = -8.47351093090;
        const b2 = 23.08336743743;
        const b3 = -21.06224101826;
        const b4 = 3.13082909833;
        const c0 = -2.78718931138;
        const c1 = -2.29796479134;
        const c2 = 4.85014127135;
        const c3 = 2.32121276858;
        const d1 = 3.54388924762;
        const d2 = 1.63706781897;

        const q = p - 0.5;

        if (Math.abs(q) <= 0.42) {
            const r = q * q;
            return q * (a0 + r * (a1 + r * (a2 + r * a3))) /
                   (1 + r * (b1 + r * (b2 + r * (b3 + r * b4))));
        } else {
            let r = p;
            if (q > 0) r = 1 - p;
            
            r = Math.sqrt(-Math.log(r));
            
            let z = (c0 + r * (c1 + r * (c2 + r * c3))) /
                    (1 + r * (d1 + r * d2));
            
            if (q < 0) z = -z;
            return z;
        }
    }

    /**
     * LMS 데이터에서 특정 나이의 값을 선형 보간
     */
    interpolateLMS(data, age) {
        if (age <= data[0].age) {
            return data[0];
        }
        if (age >= data[data.length - 1].age) {
            return data[data.length - 1];
        }

        // 나이에 해당하는 구간 찾기
        for (let i = 0; i < data.length - 1; i++) {
            if (age >= data[i].age && age <= data[i + 1].age) {
                const lower = data[i];
                const upper = data[i + 1];
                const ratio = (age - lower.age) / (upper.age - lower.age);

                return {
                    age: age,
                    L: lower.L + (upper.L - lower.L) * ratio,
                    M: lower.M + (upper.M - lower.M) * ratio,
                    S: lower.S + (upper.S - lower.S) * ratio
                };
            }
        }

        return data[data.length - 1];
    }

    /**
     * LMS 방법으로 백분위 계산
     * @param {number} measurement - 측정값 (키 또는 체중)
     * @param {number} age - 나이 (연 단위)
     * @param {string} gender - 성별 ('male' 또는 'female')
     * @param {string} type - 유형 ('height' 또는 'weight')
     * @returns {number} 백분위 (0-100)
     */
    calculatePercentile(measurement, age, gender, type) {
        if (!this.isLoaded) {
            console.error('데이터가 로드되지 않았습니다. loadData()를 먼저 호출하세요.');
            return 50;
        }

        const genderData = this.data[gender];
        if (!genderData) {
            console.error('잘못된 성별:', gender);
            return 50;
        }

        const typeData = genderData[type];
        if (!typeData) {
            console.error('잘못된 유형:', type, '| 가능한 값: height, weight | 전달된 gender:', gender, '| genderData keys:', Object.keys(genderData));
            return 50;
        }

        // LMS 값 가져오기 (보간)
        const lms = this.interpolateLMS(typeData, age);
        const { L, M, S } = lms;

        // Z-score 계산 (LMS 공식)
        let zScore;
        if (L !== 0) {
            zScore = (Math.pow(measurement / M, L) - 1) / (L * S);
        } else {
            // L이 0인 경우 (로그 정규분포)
            zScore = Math.log(measurement / M) / S;
        }

        // Z-score를 백분위로 변환
        const percentile = this.normalCDF(zScore) * 100;

        return Math.max(0.1, Math.min(99.9, percentile));
    }

    /**
     * 백분위를 측정값으로 역계산
     * @param {number} percentile - 백분위 (0-100)
     * @param {number} age - 나이 (연 단위)
     * @param {string} gender - 성별 ('male' 또는 'female')
     * @param {string} type - 유형 ('height' 또는 'weight')
     * @returns {number} 측정값
     */
    percentileToValue(percentile, age, gender, type) {
        if (!this.isLoaded) {
            console.error('데이터가 로드되지 않았습니다.');
            return 0;
        }

        const genderData = this.data[gender];
        const typeData = genderData[type];
        const lms = this.interpolateLMS(typeData, age);
        const { L, M, S } = lms;

        // 백분위를 Z-score로 변환
        const p = percentile / 100;
        const zScore = this.normalInverseCDF(p);

        // Z-score를 측정값으로 변환 (LMS 역공식)
        let value;
        if (L !== 0) {
            value = M * Math.pow(1 + L * S * zScore, 1 / L);
        } else {
            value = M * Math.exp(S * zScore);
        }

        return value;
    }

    /**
     * 18세 최종 예측키 계산 (백분위 기반)
     * @param {number} currentHeight - 현재 키 (cm)
     * @param {number} currentAge - 현재 나이 (연 단위)
     * @param {string} gender - 성별 ('male' 또는 'female')
     * @returns {object} { predictedHeight, percentile, range }
     */
    predictAdultHeight(currentHeight, currentAge, gender) {
        if (!this.isLoaded) {
            console.error('데이터가 로드되지 않았습니다.');
            return null;
        }

        // 18세 이상이면 현재 키 반환
        if (currentAge >= 18) {
            return {
                predictedHeight: currentHeight,
                percentile: this.calculatePercentile(currentHeight, 18, gender, 'height'),
                range: { min: currentHeight, max: currentHeight }
            };
        }

        // 현재 나이에서의 백분위 계산
        const currentPercentile = this.calculatePercentile(currentHeight, currentAge, gender, 'height');

        // 18세에서의 같은 백분위 키 계산
        const predictedHeight = this.percentileToValue(currentPercentile, 18, gender, 'height');

        // 예측 범위 (백분위 ±10%)
        const minPercentile = Math.max(0.1, currentPercentile - 10);
        const maxPercentile = Math.min(99.9, currentPercentile + 10);
        const minHeight = this.percentileToValue(minPercentile, 18, gender, 'height');
        const maxHeight = this.percentileToValue(maxPercentile, 18, gender, 'height');

        return {
            predictedHeight: Math.round(predictedHeight * 10) / 10,
            percentile: Math.round(currentPercentile * 10) / 10,
            range: {
                min: Math.round(minHeight * 10) / 10,
                max: Math.round(maxHeight * 10) / 10
            },
            method: '한국 표준 성장도표 (백분위 기반)'
        };
    }

    /**
     * 성장 곡선 데이터 생성 (P5, P50, P95)
     * @param {string} gender - 성별 ('male' 또는 'female')
     * @param {string} type - 유형 ('height' 또는 'weight')
     * @param {number} startAge - 시작 나이
     * @param {number} endAge - 종료 나이
     * @returns {object} { p5: [], p50: [], p95: [] }
     */
    generateGrowthCurves(gender, type, startAge = 0, endAge = 18) {
        if (!this.isLoaded) {
            console.error('데이터가 로드되지 않았습니다.');
            return null;
        }

        const curves = {
            p5: [],
            p50: [],
            p95: []
        };

        // 0.5세 간격으로 데이터 생성
        for (let age = startAge; age <= endAge; age += 0.5) {
            curves.p5.push({
                age: age,
                value: this.percentileToValue(5, age, gender, type)
            });
            curves.p50.push({
                age: age,
                value: this.percentileToValue(50, age, gender, type)
            });
            curves.p95.push({
                age: age,
                value: this.percentileToValue(95, age, gender, type)
            });
        }

        return curves;
    }

    /**
     * 백분위 레벨 텍스트 반환
     */
    getPercentileLevel(percentile) {
        if (percentile < 3) return { level: '매우 낮음', color: '#dc2626' };
        if (percentile < 10) return { level: '낮음', color: '#ea580c' };
        if (percentile < 25) return { level: '평균 이하', color: '#f59e0b' };
        if (percentile < 75) return { level: '평균', color: '#10b981' };
        if (percentile < 90) return { level: '평균 이상', color: '#3b82f6' };
        if (percentile < 97) return { level: '높음', color: '#6366f1' };
        return { level: '매우 높음', color: '#8b5cf6' };
    }
}

// 전역 인스턴스 생성
window.koreaGrowthStandard = new KoreaGrowthStandard();
