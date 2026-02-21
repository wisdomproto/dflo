# 자동 데이터 연결 및 실시간 업데이트

## 📋 구현 완료 (2026-02-04)

### ✅ 로그인 시 자동 아이 데이터 로드

#### routine.html (이미 구현되어 있음)
```javascript
// 로그인 체크 및 아이 데이터 로딩
const userJson = sessionStorage.getItem('growth_care_user');
const childrenJson = sessionStorage.getItem('growth_care_children');

if (childrenJson) {
    const children = JSON.parse(childrenJson);
    // localStorage에 저장
    localStorage.setItem('children', JSON.stringify(children));
    
    // 첫 번째 아이 자동 선택
    if (children.length > 0 && !localStorage.getItem('selectedChildId')) {
        localStorage.setItem('selectedChildId', children[0].id);
    }
}
```

### ✅ 페이지 로드 시 자동 데이터 연결

#### js/routine.js
```javascript
document.addEventListener('DOMContentLoaded', function() {
    loadChildren(); // 아이 목록 로드
    updateDateDisplay();
    loadRoutineData(); // 선택된 아이의 루틴 데이터 로드
    // ...
});

function loadChildren() {
    const children = JSON.parse(localStorage.getItem('children'));
    const savedChildId = localStorage.getItem('selectedChildId');
    
    if (savedChildId) {
        selectedChildId = savedChildId;
        updateChildName();
    } else if (children.length > 0) {
        // 첫 번째 아이 자동 선택
        selectedChildId = children[0].id;
        localStorage.setItem('selectedChildId', selectedChildId);
        updateChildName();
    }
}
```

### ✅ 데이터 저장 시 팝업 자동 업데이트

#### js/routine.js - saveRoutine()
```javascript
function saveRoutine() {
    // ... 데이터 저장 로직 ...
    
    const storageKey = `routine_${selectedChildId}_${dateStr}`;
    localStorage.setItem(storageKey, JSON.stringify(data));
    
    alert('✅ 저장되었습니다!');
    
    // 성장 진단 팝업이 열려있으면 자동 업데이트
    if (window.growthDiagnosisModal && window.growthDiagnosisModal.isOpen) {
        console.log('📊 성장 진단 팝업 자동 업데이트');
        window.growthDiagnosisModal.loadGrowthRecords();
    }
}
```

### ✅ 전역 팝업 인스턴스

```javascript
// 팝업을 window 객체에 저장하여 어디서든 접근 가능
function openGrowthDiagnosis() {
    if (!window.growthDiagnosisModal) {
        window.growthDiagnosisModal = new GrowthDiagnosisModal({
            onClose: () => {
                console.log('성장 진단 팝업 닫힘');
            }
        });
    }
    
    window.growthDiagnosisModal.open(selectedChildId);
}
```

---

## 🔄 데이터 흐름

### 1. 로그인
```
사용자 로그인
    ↓
sessionStorage에서 children 데이터 가져오기
    ↓
localStorage에 저장
    ↓
첫 번째 아이 자동 선택
```

### 2. 페이지 로드
```
routine.html 접속
    ↓
DOMContentLoaded 이벤트
    ↓
loadChildren() - 아이 목록 로드
    ↓
selectedChildId 설정 (저장된 값 또는 첫 번째)
    ↓
loadRoutineData() - 오늘 날짜 데이터 로드
    ↓
calculateAge() - 만나이 자동 계산
```

### 3. 데이터 입력 및 저장
```
사용자가 키, 몸무게 입력
    ↓
키 입력 시 예측키 자동 계산
    ↓
저장 버튼 클릭
    ↓
localStorage에 저장 (routine_${childId}_${date})
    ↓
팝업 열려있으면 자동 업데이트
```

### 4. 성장 진단 팝업
```
"📊 성장 진단" 버튼 클릭
    ↓
openGrowthDiagnosis() 호출
    ↓
window.growthDiagnosisModal 생성 (없으면)
    ↓
팝업 열기 with selectedChildId
    ↓
loadGrowthRecords() - 모든 routine 데이터 로드
    ↓
차트 렌더링
```

---

## 🎯 자동 연결되는 데이터

### localStorage 키
- `children`: 모든 아이 정보 배열
- `selectedChildId`: 현재 선택된 아이 ID
- `routine_${childId}_${date}`: 날짜별 루틴 데이터

### 연결되는 필드
| routine.html | 팝업 차트 | 비고 |
|---|---|---|
| height (키) | height | 청록색 라인 |
| weight (몸무게) | weight | 주황색 라인 |
| actualAge (만나이) | age | 툴팁에 표시 |
| predictedHeightBasic | predictedHeight | 툴팁에 표시 |
| boneAge (뼈나이) | boneAge | 툴팁에 표시 |
| measurementNotes | notes | 기록 테이블 |
| date (날짜) | date | X축 라벨 |

---

## 🚀 사용 시나리오

### 시나리오 1: 첫 방문
1. ✅ 로그인
2. ✅ routine.html 자동 이동
3. ✅ 첫 번째 아이 자동 선택
4. ✅ 오늘 날짜로 초기화
5. ✅ 만나이 자동 계산
6. ✅ 키, 몸무게 입력
7. ✅ 저장
8. ✅ "📊 성장 진단" 클릭
9. ✅ 방금 입력한 데이터가 차트에 표시됨!

### 시나리오 2: 데이터 누적 후
1. ✅ routine.html 접속
2. ✅ 이전에 선택한 아이 자동 선택
3. ✅ "📊 성장 진단" 클릭
4. ✅ 모든 기록이 차트로 표시됨
5. ✅ 트렌드 확인 (키/몸무게 증가 추이)

### 시나리오 3: 실시간 업데이트
1. ✅ "📊 성장 진단" 팝업 열기
2. ✅ 팝업을 열어둔 채로
3. ✅ routine.html에서 새로운 데이터 입력
4. ✅ 저장 버튼 클릭
5. ✅ 팝업의 차트가 자동으로 업데이트됨!
6. ✅ 새로운 데이터 포인트가 즉시 표시됨

---

## 🔧 디버깅

### 콘솔 로그 확인
```javascript
// 아이 데이터 확인
console.log('children:', localStorage.getItem('children'));

// 선택된 아이 확인
console.log('selectedChildId:', localStorage.getItem('selectedChildId'));

// 특정 날짜 데이터 확인
const childId = localStorage.getItem('selectedChildId');
const dateStr = '2026-02-04';
const key = `routine_${childId}_${dateStr}`;
console.log('routine data:', localStorage.getItem(key));

// 팝업 상태 확인
console.log('팝업 열림:', window.growthDiagnosisModal?.isOpen);
console.log('기록 수:', window.growthDiagnosisModal?.growthRecords.length);
```

### 예상 로그
```
✅ [routine.js] 아이 목록 로드: 2명
✅ [routine.js] 선택된 아이: 김민준 (child-id-123)
✅ [routine.js] 만나이 계산 완료: 10.5
✅ [routine.js] 루틴 데이터 로드: 2026-02-04
✅ [routine.js] 예측키 계산 결과: 165.3cm
📊 [routine.js] 저장 완료
📊 성장 진단 팝업 자동 업데이트
✅ [GrowthDiagnosisModal] 로드된 기록: 15개
✅ [GrowthDiagnosisModal] 차트 렌더링 완료: 15개 데이터
```

---

## 🎉 완료!

이제 모든 것이 자동으로 연결됩니다:
- ✅ 로그인 시 아이 데이터 자동 로드
- ✅ 페이지 로드 시 첫 번째 아이 자동 선택
- ✅ 데이터 입력 시 예측키 자동 계산
- ✅ 데이터 저장 시 팝업 자동 업데이트
- ✅ 팝업 열 때 모든 기록 자동 로드
- ✅ 차트 실시간 업데이트

**테스트 방법:**
1. routine.html 접속
2. 키, 몸무게 입력
3. 저장
4. "📊 성장 진단" 클릭
5. 차트 확인! 🎊
