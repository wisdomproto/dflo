# 🧮 계산 로직 가이드

## 📏 만나이 계산

### 기본 공식
```javascript
function calculateAge(birthDate) {
    const birth = new Date(birthDate);
    const today = new Date();
    
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();
    
    // 일수가 음수면 전월에서 빌림
    if (days < 0) {
        months--;
        const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        days += lastMonth.getDate();
    }
    
    // 월수가 음수면 전년에서 빌림
    if (months < 0) {
        years--;
        months += 12;
    }
    
    // 소수점 형식으로 변환
    const ageInYears = years + (months / 12) + (days / 365);
    return Math.round(ageInYears * 10) / 10;  // 소수점 1자리
}
```

### 사용 예시
```javascript
const birthDate = '2013-03-15';
const age = calculateAge(birthDate);  // 12.9
```

---

## 📊 예측키 계산

### 한국 표준 성장도표 사용
```javascript
function calculatePredictedHeight(currentHeight, age, gender) {
    // koreaGrowthStandard 데이터 로드 확인
    if (!window.koreaGrowthStandard || !window.koreaGrowthStandard.isLoaded) {
        console.error('성장도표 데이터 미로드');
        return null;
    }
    
    // 백분위 계산
    const percentile = calculatePercentile(currentHeight, age, gender, 'height');
    
    // 최종 키 예측
    const adultAge = (gender === 'male') ? 20 : 18;
    const predictedHeight = getHeightAtPercentile(adultAge, percentile, gender);
    
    return {
        predictedHeight: Math.round(predictedHeight * 10) / 10,
        percentile: Math.round(percentile * 10) / 10,
        method: '한국 표준 성장도표 (백분위 기반)'
    };
}
```

---

## 📈 백분위 계산

### LMS 방법
```javascript
function calculatePercentile(measurement, age, gender, type) {
    const data = window.koreaGrowthStandard;
    
    if (!data || !data.isLoaded) {
        return 50;  // 기본값
    }
    
    const genderData = data[gender];
    if (!genderData) {
        console.error('잘못된 성별:', gender);
        return 50;
    }
    
    const typeData = genderData[type];  // 'height' or 'weight'
    if (!typeData) {
        console.error('잘못된 유형:', type);
        return 50;
    }
    
    // LMS 파라미터 보간
    const { L, M, S } = interpolateLMS(typeData, age);
    
    // Z-score 계산
    let z;
    if (L !== 0) {
        z = (Math.pow(measurement / M, L) - 1) / (L * S);
    } else {
        z = Math.log(measurement / M) / S;
    }
    
    // Z-score → 백분위
    const percentile = zScoreToPercentile(z);
    
    return percentile;
}
```

---

## ⚠️ 주의사항

### 1. 데이터 로드 확인
```javascript
// ❌ 틀림
const result = calculatePredictedHeight(...);

// ✅ 올바름
if (window.koreaGrowthStandard && window.koreaGrowthStandard.isLoaded) {
    const result = calculatePredictedHeight(...);
} else {
    console.error('성장도표 데이터 미로드');
}
```

### 2. 만나이 필드 항상 표시
```javascript
// 데이터 없어도 만나이 계산
resetForm();
loadRecentMeasurements();

setTimeout(() => {
    calculateAge();  // 만나이 자동 계산
}, 100);
```

### 3. 성별 확인
```javascript
const gender = child.gender;  // 'male' or 'female'
if (gender !== 'male' && gender !== 'female') {
    console.error('잘못된 성별:', gender);
    return;
}
```

---

## 📌 체크리스트

- [ ] koreaGrowthStandard 로드 확인
- [ ] 만나이 계산 후 필드 업데이트
- [ ] 성별 값 검증
- [ ] 예측키 계산 결과 저장
- [ ] 소수점 1자리로 반올림

---

**참조:** `QUICK_RULES.md` > 계산 로직 작업
