# 성장 진단 팝업 - 데이터 로딩 업데이트

## 📋 변경 사항 (2026-02-04)

### 1. **데이터 소스 변경**
- ❌ 이전: `growth_records_${childId}` (별도 저장소)
- ✅ 현재: `routine_${childId}_${date}` (데일리 루틴 데이터)

### 2. **자동 데이터 로딩**
팝업을 열면 선택된 아이의 모든 routine 데이터를 자동으로 로드합니다.

```javascript
// localStorage에서 routine_ 데이터 자동 검색
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`routine_${childId}_`)) {
        // 데이터 로드 및 차트에 추가
    }
}
```

### 3. **UI 변경**
- ❌ 제거: "입력" 탭 (routine.html에서 입력하므로 중복 제거)
- ✅ 유지: "📊 차트" 탭 (기본 뷰)
- ✅ 유지: "📋 기록" 탭 (테이블 뷰)

### 4. **차트 개선**
- ✅ 날짜 포맷팅: `2026-02-04` → `2/4`
- ✅ 툴팁 강화: 만나이, 예측키 추가 정보 표시
- ✅ 포인트 스타일: 더 큰 포인트, 호버 효과
- ✅ 그리드 스타일: 부드러운 배경 그리드

## 🎯 데이터 구조

### routine 데이터 예시
```javascript
{
    date: '2026-02-04',
    actualAge: 10.5,
    height: 145.2,
    weight: 38.5,
    boneAge: 11.0,
    predictedHeightBasic: 165.3,
    predictedHeightBoneAge: 167.0,
    measurementNotes: '정상 성장 중',
    savedAt: '2026-02-04T10:30:00.000Z'
}
```

### 차트에 표시되는 데이터
```javascript
{
    id: 'routine_child-123_2026-02-04',
    date: '2026-02-04',
    age: 10.5,
    height: 145.2,
    weight: 38.5,
    boneAge: 11.0,
    predictedHeight: 165.3,
    notes: '정상 성장 중',
    createdAt: '2026-02-04T10:30:00.000Z'
}
```

## 🚀 사용 방법

### routine.html에서 열기
```javascript
// 1. 아이 선택
selectedChildId = 'child-id-123';

// 2. 팝업 열기
openGrowthDiagnosis();
```

### 팝업에서 자동으로 수행되는 작업
1. ✅ 선택된 아이의 모든 routine 데이터 로드
2. ✅ 날짜순 정렬 (오래된 것부터)
3. ✅ 차트 렌더링 (키, 몸무게)
4. ✅ 기록 테이블 생성

## 📊 차트 기능

### 표시되는 데이터
- **키 (cm)**: 청록색 라인
- **몸무게 (kg)**: 주황색 라인

### 툴팁 정보
- 측정 날짜 (전체 날짜)
- 키 (cm)
- 몸무게 (kg)
- 만 나이 (세)
- 예측키 (cm)

### 차트 인터랙션
- 마우스 호버: 해당 날짜의 상세 정보 표시
- 포인트 클릭: 데이터 포인트 강조
- 범례 클릭: 데이터셋 표시/숨김

## 📋 기록 테이블

### 표시 항목
- 측정 날짜
- 나이 (세)
- 키 (cm)
- 몸무게 (kg)
- 뼈나이 (세) - 있는 경우
- 예측키 (cm) - 있는 경우
- 메모 - 있는 경우

### 정렬
- 최신 기록부터 표시 (내림차순)

## 🐛 문제 해결

### "기록이 없어 차트를 표시할 수 없습니다"
**원인:**
- localStorage에 routine 데이터가 없음
- 키/몸무게가 입력되지 않은 데이터

**해결:**
1. routine.html에서 신체 측정 데이터 입력
2. 키와 몸무게 필수 입력
3. 저장 버튼 클릭

### 차트가 그려지지 않음
**원인:**
- Chart.js 미로드
- Canvas 요소 오류

**해결:**
1. 브라우저 콘솔 확인
2. Chart.js CDN 확인
3. 페이지 새로고침

### 데이터가 표시되지 않음
**원인:**
- 잘못된 childId
- 데이터 키 형식 불일치

**해결:**
1. 콘솔 로그 확인: `[GrowthDiagnosisModal] 로드된 기록: X개`
2. localStorage 키 확인: `routine_${childId}_${date}`
3. 아이 선택 확인

## 💡 개발자 팁

### 디버깅
```javascript
// 콘솔에서 직접 확인
const modal = window.growthDiagnosisModal;
console.log('기록 수:', modal.growthRecords.length);
console.log('선택된 아이:', modal.selectedChildId);
console.log('차트 인스턴스:', modal.chart);
```

### localStorage 데이터 확인
```javascript
// 특정 아이의 모든 routine 데이터 찾기
const childId = 'child-id-123';
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(`routine_${childId}_`)) {
        console.log(key, JSON.parse(localStorage.getItem(key)));
    }
}
```

### 차트 재렌더링
```javascript
// 데이터 변경 후 차트 업데이트
window.growthDiagnosisModal.loadGrowthRecords();
```

## 📝 다음 개선 사항

- [ ] 성장 백분위 곡선 추가
- [ ] 예측키 트렌드 라인
- [ ] 데이터 필터링 (날짜 범위)
- [ ] CSV 내보내기
- [ ] 차트 인쇄/저장 기능
- [ ] 성장 속도 분석

## 🎉 완료!

이제 routine.html에서 입력한 모든 데이터가 성장 진단 팝업에서 자동으로 차트로 표시됩니다! 🚀
