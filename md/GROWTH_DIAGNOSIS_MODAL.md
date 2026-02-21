# 성장 진단 팝업 모듈 (GrowthDiagnosisModal)

## 📋 개요

`GrowthDiagnosisModal`은 growth.html의 성장 진단 기능을 재사용 가능한 팝업 모듈로 구현한 클래스입니다. 다른 페이지에서 쉽게 성장 진단 기능을 팝업 형태로 띄울 수 있습니다.

## 🎯 주요 기능

- **독립적인 팝업**: 어떤 페이지에서도 독립적으로 동작
- **아이별 데이터 로드**: 선택한 아이의 성장 데이터 자동 로드
- **차트 시각화**: Chart.js를 이용한 성장 차트 렌더링
- **탭 기반 UI**: 신장, 체중, BMI 등 여러 측정 항목을 탭으로 구분
- **반응형 디자인**: 모바일/데스크톱 모두 최적화
- **접근성**: ESC 키로 닫기, 포커스 트랩, ARIA 속성

## 📦 설치 방법

### 1. 파일 포함

HTML 파일의 `<head>` 섹션에 다음을 추가:

```html
<!-- CSS -->
<link rel="stylesheet" href="css/mobile.css">
<link rel="stylesheet" href="css/growth-modal.css">

<!-- JavaScript -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="js/korea-growth-standard.js"></script>
<script src="js/growth-diagnosis-modal.js"></script>
```

### 2. 의존성

- **Chart.js**: 차트 렌더링
- **korea-growth-standard.js**: 한국 표준 성장도표 데이터
- **localStorage**: 아이 데이터 저장

## 🚀 사용 방법

### 기본 사용

```javascript
// 1. 인스턴스 생성
const growthModal = new GrowthDiagnosisModal({
    onClose: () => {
        console.log('팝업이 닫혔습니다');
    }
});

// 2. 팝업 열기
growthModal.open('child-id-here');

// 3. 팝업 닫기
growthModal.close();
```

### routine.html에서 사용 예시

```javascript
let growthModal = null;

function openGrowthDiagnosis() {
    if (!selectedChildId) {
        alert('아이를 먼저 선택해주세요.');
        return;
    }
    
    if (!growthModal) {
        growthModal = new GrowthDiagnosisModal({
            onClose: () => {
                console.log('성장 진단 팝업 닫힘');
            }
        });
    }
    
    growthModal.open(selectedChildId);
}
```

### HTML 버튼 예시

```html
<button onclick="openGrowthDiagnosis()">
    📊 성장 진단 보기
</button>
```

## 🎨 API 레퍼런스

### 생성자 (Constructor)

```javascript
new GrowthDiagnosisModal(options)
```

**Parameters:**

- `options` (Object, optional):
  - `onClose` (Function): 팝업이 닫힐 때 호출되는 콜백 함수

**Returns:** `GrowthDiagnosisModal` 인스턴스

### 메서드 (Methods)

#### `open(childId)`

팝업을 열고 지정된 아이의 성장 데이터를 로드합니다.

```javascript
growthModal.open('child-id-123');
```

**Parameters:**

- `childId` (String): 로드할 아이의 ID (localStorage의 'children' 배열에서 찾음)

**Returns:** void

**동작:**

1. 아이 데이터 로드
2. 성장 데이터 로드 (localStorage의 `routine_${childId}_${date}` 키)
3. 팝업 렌더링
4. 차트 그리기
5. 애니메이션 효과로 팝업 표시

#### `close()`

팝업을 닫습니다.

```javascript
growthModal.close();
```

**Returns:** void

**동작:**

1. 애니메이션 효과로 페이드아웃
2. DOM에서 제거
3. `onClose` 콜백 호출

#### `destroy()`

팝업 인스턴스를 완전히 제거합니다.

```javascript
growthModal.destroy();
growthModal = null;
```

**Returns:** void

**동작:**

1. 이벤트 리스너 제거
2. DOM 요소 제거
3. 메모리 정리

## 📊 데이터 구조

### 아이 데이터 (localStorage: 'children')

```javascript
[
    {
        id: 'child-id-123',
        name: '홍길동',
        gender: 'male', // 'male' | 'female'
        birth_date: '2015-03-15' // 또는 birthDate
    }
]
```

### 성장 데이터 (localStorage: `routine_${childId}_${date}`)

```javascript
{
    date: '2026-02-04',
    actualAge: 10.5,
    height: 145.2,
    weight: 38.5,
    predictedHeightBasic: 165.3,
    boneAge: 11.0,
    predictedHeightBoneAge: 167.0,
    // ... 기타 루틴 데이터
}
```

## 🎯 주요 기능 상세

### 1. 아이 선택 UI

팝업 상단에 드롭다운으로 아이를 선택할 수 있습니다:

```html
<div class="growth-modal-child-selector">
    <label>아이 선택</label>
    <select id="modalChildSelector">
        <option value="child-1">홍길동 (남)</option>
        <option value="child-2">김영희 (여)</option>
    </select>
</div>
```

### 2. 탭 기반 측정 항목

- **신장 (Height)**: 성장 차트 및 예측키
- **체중 (Weight)**: 체중 변화 추이
- **BMI**: 체질량지수 변화
- **예측키 비교**: 통계 vs 뼈나이 기반

### 3. 차트 렌더링

Chart.js를 사용하여 성장 데이터를 시각화:

```javascript
this.renderHeightChart(data);
```

**차트 타입:**

- Line Chart: 시간에 따른 변화
- Percentile Curves: 한국 표준 성장 곡선 (P5, P50, P95)

### 4. 반응형 디자인

- **모바일**: 전체 화면 모달
- **데스크톱**: 중앙 팝업 (max-width: 600px)

## 🔒 접근성 (Accessibility)

### 키보드 지원

- **ESC**: 팝업 닫기
- **Tab**: 포커스 이동 (팝업 내에서만)

### ARIA 속성

```html
<div class="growth-modal-overlay" 
     role="dialog" 
     aria-modal="true" 
     aria-labelledby="growth-modal-title">
    <div class="growth-modal-container">
        <h2 id="growth-modal-title">성장 진단</h2>
        <!-- ... -->
    </div>
</div>
```

## 🎨 스타일 커스터마이징

### CSS 변수 (선택 사항)

```css
:root {
    --growth-modal-primary: #14b8a6;
    --growth-modal-secondary: #0891b2;
    --growth-modal-overlay-bg: rgba(0, 0, 0, 0.7);
    --growth-modal-border-radius: 16px;
}
```

### 클래스 재정의

```css
/* 커스텀 헤더 색상 */
.growth-modal-header {
    background: linear-gradient(135deg, #your-color1, #your-color2);
}

/* 커스텀 버튼 스타일 */
.view-growth-btn {
    background: your-custom-gradient;
}
```

## 🐛 디버깅

### 콘솔 로그

```javascript
// 데이터 로드 확인
console.log('아이 데이터:', childData);
console.log('성장 데이터:', growthData);

// 차트 렌더링 확인
console.log('차트 캔버스:', canvas);
console.log('차트 인스턴스:', chartInstance);
```

### 흔한 문제 해결

1. **팝업이 안 뜨는 경우**
   - Chart.js가 로드되었는지 확인
   - korea-growth-standard.js가 로드되었는지 확인
   - 콘솔에 에러 메시지 확인

2. **차트가 안 그려지는 경우**
   - Canvas 요소가 존재하는지 확인
   - 데이터가 올바른 형식인지 확인
   - Chart.js 버전 확인 (권장: 4.x)

3. **데이터가 안 로드되는 경우**
   - localStorage에 데이터가 있는지 확인
   - childId가 올바른지 확인
   - 데이터 키 형식 확인 (`routine_${childId}_${date}`)

## 📝 예제 프로젝트

### 전체 예제 (test-growth-modal.html)

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>성장 진단 팝업 테스트</title>
    
    <!-- CSS -->
    <link rel="stylesheet" href="css/mobile.css">
    <link rel="stylesheet" href="css/growth-modal.css">
    
    <style>
        body {
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .test-btn {
            padding: 12px 24px;
            font-size: 16px;
            background: #14b8a6;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <h1>성장 진단 팝업 테스트</h1>
    <button class="test-btn" onclick="openTest()">
        📊 성장 진단 열기
    </button>
    
    <!-- JavaScript -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="js/korea-growth-standard.js"></script>
    <script src="js/growth-diagnosis-modal.js"></script>
    
    <script>
        // 테스트 데이터 생성
        localStorage.setItem('children', JSON.stringify([
            {
                id: 'test-child-1',
                name: '테스트 아이',
                gender: 'male',
                birth_date: '2015-03-15'
            }
        ]));
        
        // 성장 데이터 생성
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(`routine_test-child-1_${today}`, JSON.stringify({
            date: today,
            actualAge: 10.8,
            height: 145.2,
            weight: 38.5,
            predictedHeightBasic: 165.3
        }));
        
        // 팝업 인스턴스
        let modal = null;
        
        function openTest() {
            if (!modal) {
                modal = new GrowthDiagnosisModal({
                    onClose: () => console.log('팝업 닫힘')
                });
            }
            modal.open('test-child-1');
        }
    </script>
</body>
</html>
```

## 🔄 업데이트 내역

### v1.0.0 (2026-02-04)

- ✅ 초기 릴리스
- ✅ 기본 팝업 기능
- ✅ 차트 시각화
- ✅ 반응형 디자인
- ✅ 접근성 지원

## 📄 라이선스

이 프로젝트는 187 성장케어 플랫폼의 일부입니다.

## 🤝 기여

버그 리포트 및 기능 제안은 이슈로 등록해주세요.

## 📞 지원

문제가 있으시면 개발팀에 문의하세요.
