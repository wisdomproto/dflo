# 디버깅 가이드

## 성장 기록이 표시되지 않는 문제

### 1. 브라우저 콘솔 확인
1. 개발자 도구 열기 (F12 또는 Ctrl+Shift+I)
2. Console 탭으로 이동
3. 성장 기록 추가 시 다음 로그 확인:
   - "저장할 기록: ..."
   - "선택된 아이: ..."
   - "저장 후 전체 기록: ..."
   - "loadRecords 호출됨, 기록 개수: ..."

### 2. 로컬 스토리지 확인
1. 개발자 도구 > Application 탭
2. Storage > Local Storage 선택
3. 다음 키 확인:
   - `children`: 아이 목록
   - `selectedChildId`: 현재 선택된 아이 ID
   - `growthRecords`: 성장 기록 (아이별)

### 3. 체크리스트

#### ✅ 아이 선택 확인
```javascript
// 콘솔에서 실행
StorageManager.getSelectedChild()
// 결과: {id: "child-...", name: "김민수", ...} 또는 null
```

**null이 나오면**: 홈 화면에서 아이를 먼저 추가하고 선택해야 합니다.

#### ✅ 성장 기록 확인
```javascript
// 콘솔에서 실행
StorageManager.getGrowthRecords()
// 결과: [{date: "2025-01-15", height: 140, ...}, ...]
```

**빈 배열 []이 나오면**: 
- 선택된 아이가 없거나
- 해당 아이의 기록이 아직 없음

#### ✅ 전체 데이터 구조 확인
```javascript
// 콘솔에서 실행
console.log('Children:', localStorage.getItem('children'));
console.log('Selected:', localStorage.getItem('selectedChildId'));
console.log('Records:', localStorage.getItem('growthRecords'));
```

### 4. 문제 해결

#### 문제: "아이를 선택해주세요" 알림이 뜸
**해결**: 
1. 홈 화면 (index.html)으로 이동
2. "➕ 아이 추가하기" 클릭
3. 이름, 성별, 생년월일 입력
4. 아이 카드 클릭하여 선택 (파란 테두리 확인)
5. 성장 진단 페이지로 다시 이동

#### 문제: 기록을 추가해도 목록/차트에 표시 안됨
**해결**:
1. 콘솔에서 `loadRecords()` 호출
2. "기록 개수: 0"이 나오면 → 데이터 저장 실패
3. "recordsList 요소를 찾을 수 없습니다" 에러 → HTML 구조 확인

```html
<!-- growth.html에 다음 요소가 있는지 확인 -->
<div id="recordsList"></div>
```

#### 문제: 차트가 업데이트 안됨
```javascript
// 콘솔에서 강제 업데이트
updateChart()
```

### 5. 데이터 초기화 (주의!)

**모든 데이터를 삭제하고 다시 시작하려면**:
```javascript
// 콘솔에서 실행 (복구 불가능!)
localStorage.clear();
location.reload();
```

### 6. 샘플 데이터 추가

**테스트용 아이 & 기록 추가**:
```javascript
// 1. 아이 추가
const testChild = {
    name: '테스트',
    gender: 'male',
    birthDate: '2015-01-01'
};
const newChild = StorageManager.addChild(testChild);
StorageManager.setSelectedChild(newChild.id);

// 2. 성장 기록 추가
StorageManager.saveGrowthRecord({
    date: '2025-01-15',
    gender: 'male',
    age: 10.0,
    height: 140,
    weight: 35
});

// 3. 페이지 새로고침
location.reload();
```

### 7. 자주 발생하는 오류

#### 오류: "Cannot read property 'value' of null"
- **원인**: HTML 요소를 찾지 못함
- **해결**: HTML ID 확인 (date, gender, age, height, weight, recordsList)

#### 오류: "selectedChildId is null"
- **원인**: 아이를 선택하지 않음
- **해결**: 홈에서 아이 선택

#### 오류: 차트가 깨짐
- **원인**: Chart.js 라이브러리 로드 실패
- **해결**: 
  ```html
  <!-- growth.html 확인 -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  ```

### 8. 개발자용 헬퍼 함수

**콘솔에 다음 함수를 붙여넣고 사용**:
```javascript
// 현재 상태 진단
function diagnose() {
    const child = StorageManager.getSelectedChild();
    const records = StorageManager.getGrowthRecords();
    
    console.log('=== 진단 결과 ===');
    console.log('선택된 아이:', child ? `${child.name} (${child.id})` : '❌ 없음');
    console.log('성장 기록 개수:', records.length);
    console.log('전체 아이 수:', StorageManager.getChildren().length);
    
    if (!child) {
        console.warn('⚠️ 아이를 먼저 선택해주세요!');
    }
    if (records.length === 0) {
        console.warn('⚠️ 성장 기록이 없습니다!');
    }
}

// 실행
diagnose();
```

---

## 연락처

문제가 계속되면 다음 정보와 함께 문의:
1. 브라우저 버전 (Chrome, Safari, Firefox 등)
2. 콘솔 오류 메시지 스크린샷
3. `diagnose()` 함수 실행 결과
