# 예측키 실시간 계산 기능 추가

## 🔍 문제 상황

### 로그 분석
```
🔍 [예측키 체크] 2023-04-25: null → NaN (유효: false)
🔍 [예측키 체크] 2023-11-07: null → NaN (유효: false)
...
🔍 [예측키 변화] 예측키 있는 기록: 0 개
⚠️ [예측키 변화] 예측키 데이터 없음
```

### 원인
- **routine 데이터에 예측키가 저장되지 않음**
- `loadGrowthRecords()` 시 `predictedHeightBasic` 값이 `null`
- 기존 저장 데이터에는 예측키 필드 없음

---

## ✅ 해결 방법: 실시간 예측키 계산

### 핵심 아이디어
> 기존 데이터에 예측키가 없으면, **차트 로드 시점에 실시간으로 계산**

### 구현 방식
```javascript
// 데이터 로드 시
if (!record.predictedHeight && record.age && record.height) {
    // 실시간 계산
    const predicted = this.calculatePredictedHeight(
        record.height, 
        record.age, 
        gender
    );
    record.predictedHeight = predicted.predictedHeight;
}
```

---

## 📝 수정 내역

### 📁 js/growth-diagnosis-modal.js

#### 1. loadGrowthRecords() 함수 개선

**Before:**
```javascript
if (data.height && data.weight) {
    this.growthRecords.push({
        ...
        predictedHeight: data.predictedHeightBasic || data.predictedHeightBoneAge || null,
        ...
    });
}
```

**After:**
```javascript
if (data.height && data.weight) {
    const record = {
        ...
        predictedHeight: data.predictedHeightBasic || data.predictedHeightBoneAge || null,
        ...
    };
    
    // 예측키가 없으면 실시간 계산
    if (!record.predictedHeight && record.age && record.height) {
        try {
            const predicted = this.calculatePredictedHeight(
                record.height, 
                record.age, 
                this.selectedChild?.gender || 'male'
            );
            if (predicted && predicted.predictedHeight) {
                record.predictedHeight = predicted.predictedHeight;
                console.log(`📊 [예측키 계산] ${data.date}: ${record.predictedHeight.toFixed(1)} cm`);
            }
        } catch (error) {
            console.error('[예측키 계산 오류]', error);
        }
    }
    
    this.growthRecords.push(record);
}
```

#### 2. calculatePredictedHeight() 함수 추가

```javascript
/**
 * 예측키 계산 (한국 표준 성장도표 사용)
 */
calculatePredictedHeight(height, age, gender = 'male') {
    // koreaGrowthStandard가 로드되지 않았으면 null 반환
    if (typeof window.koreaGrowthStandard === 'undefined' || !window.koreaGrowthStandard.isLoaded) {
        console.warn('[예측키 계산] 한국 표준 성장도표가 로드되지 않았습니다');
        return null;
    }
    
    try {
        const result = window.koreaGrowthStandard.predictAdultHeight(height, age, gender);
        return result;
    } catch (error) {
        console.error('[예측키 계산 오류]', error);
        return null;
    }
}
```

---

## 🔄 데이터 흐름

### 1. 차트 모달 열기
```
'📊 차트로 보기' 버튼 클릭
↓
loadGrowthRecords() 호출
```

### 2. 데이터 로드
```
localStorage에서 routine 데이터 읽기
↓
각 날짜별 키/몸무게/나이 추출
```

### 3. 예측키 확인
```
predictedHeight 필드 확인
↓
null이면 실시간 계산
```

### 4. 실시간 계산
```javascript
calculatePredictedHeight(height, age, gender)
↓
koreaGrowthStandard.predictAdultHeight() 호출
↓
예측키 반환 (예: 182.1 cm)
```

### 5. 차트 렌더링
```
백분위선 + 사용자 데이터 표시
↓
updatePredictedHeightChange() 호출
↓
예측키 변화 카드 표시
```

---

## 🧪 테스트 방법

### Step 1: 페이지 새로고침
```
Ctrl+Shift+R
```

### Step 2: 차트 모달 열기
```
'📊 차트로 보기' 버튼 클릭
```

### Step 3: 콘솔 로그 확인
```
✅ 예상 로그:
📊 [예측키 계산] 2023-04-25: 182.1 cm
📊 [예측키 계산] 2023-11-07: 185.3 cm
📊 [예측키 계산] 2023-12-05: 186.2 cm
...
🔍 [예측키 체크] 2023-04-25: 182.1 → 182.1 (유효: true)
🔍 [예측키 체크] 2023-11-07: 185.3 → 185.3 (유효: true)
...
🔍 [예측키 변화] 예측키 있는 기록: 7 개
📊 [예측키 변화] 첫 측정: 182.1 cm @ 2023-04-25
📊 [예측키 변화] 최근 측정: 185.3 cm @ 2025-07-25
📊 [예측키 변화] 변화량: ↑ 3.2 cm
✅ [예측키 변화] UI 업데이트 완료
🎬 [예측키 변화] 애니메이션 시작
```

### Step 4: UI 확인
```
┌─────────────────────────────────────┐
│       📊 예측키 변화                │
├─────────────────────────────────────┤
│  첫 측정          │  최근 측정       │
│  182.1 cm        │  185.3 cm        │
│  2023.04.25      │  2025.07.25      │
│                                     │
│      ↑ 3.2 cm 증가 (초록색)         │
└─────────────────────────────────────┘
```

---

## 🎯 장점

### 1. 기존 데이터 호환성
- ✅ 예측키 없는 기존 데이터도 자동 계산
- ✅ 새로 저장된 데이터는 예측키 포함
- ✅ 하위 호환성 유지

### 2. 데이터 일관성
- ✅ 한국 표준 성장도표 기반
- ✅ 모든 기록에 동일한 계산 로직 적용
- ✅ 백분위 정확도 보장

### 3. 사용자 경험
- ✅ 과거 데이터도 차트에 표시
- ✅ 예측키 변화 추적 가능
- ✅ 즉시 결과 확인

---

## 📊 데이터 케이스

### Case 1: 예측키가 있는 경우
```javascript
{
    date: '2026-02-04',
    height: 177.9,
    predictedHeight: 182.1  // ✅ 기존 값 사용
}
```

### Case 2: 예측키가 없는 경우
```javascript
{
    date: '2023-04-25',
    height: 155.7,
    age: 12.25,
    predictedHeight: null  // ❌ 없음
}
↓
calculatePredictedHeight(155.7, 12.25, 'male')
↓
{
    date: '2023-04-25',
    height: 155.7,
    predictedHeight: 182.1  // ✅ 실시간 계산
}
```

---

## 🔧 수정된 파일
- **js/growth-diagnosis-modal.js**
  - `loadGrowthRecords()` - 실시간 계산 로직 추가
  - `calculatePredictedHeight()` - 새 함수 추가

---

## 🎉 완료!

이제 **과거 데이터도 예측키 변화가 정확하게 표시**됩니다!

### 테스트
1. Ctrl+Shift+R로 페이지 새로고침
2. '📊 차트로 보기' 클릭
3. 콘솔 로그 확인
4. 예측키 변화 카드 확인

---

## 📚 관련 문서
- [PREDICTED_HEIGHT_DEBUG.md](PREDICTED_HEIGHT_DEBUG.md) - 디버깅 가이드
- [GROWTH_DIAGNOSIS_MODAL.md](GROWTH_DIAGNOSIS_MODAL.md) - 성장 진단 모달 문서
