# 🟡 카카오톡 로그인 가이드

## 📌 개요

카카오톡 간편 로그인 시스템 구현 가이드입니다.

---

## 🔑 카카오 Developers 설정

### 1단계: 앱 등록
1. [Kakao Developers](https://developers.kakao.com/) 접속
2. "내 애플리케이션" → "애플리케이션 추가하기"
3. 앱 이름, 회사명 입력

### 2단계: 플랫폼 설정
1. "앱 설정" → "플랫폼" → "Web 플랫폼 등록"
2. 사이트 도메인 입력:
   - 개발: `http://localhost:8000`
   - 배포: `https://your-domain.com`

### 3단계: Redirect URI 설정
1. "제품 설정" → "카카오 로그인"
2. "Redirect URI 등록"
3. URI 추가:
   - 개발: `http://localhost:8000/kakao-callback.html`
   - 배포: `https://your-domain.com/kakao-callback.html`

### 4단계: 동의 항목 설정
1. "제품 설정" → "카카오 로그인" → "동의 항목"
2. 필수 동의:
   - 닉네임 (필수)
   - 카카오계정(이메일) (선택)
   - 프로필 사진 (선택)

### 5단계: JavaScript 키 확인
1. "앱 설정" → "앱 키"
2. **JavaScript 키** 복사
3. `login.html`에 입력

---

## 🔧 구현 패턴

### 카카오 SDK 초기화
```javascript
Kakao.init('YOUR_JAVASCRIPT_KEY');
console.log('카카오 SDK 초기화:', Kakao.isInitialized());
```

### 로그인 버튼
```javascript
function kakaoLogin() {
    Kakao.Auth.login({
        success: function(authObj) {
            // 액세스 토큰으로 사용자 정보 요청
            Kakao.API.request({
                url: '/v2/user/me',
                success: function(response) {
                    handleKakaoUser(response);
                },
                fail: function(error) {
                    console.error('카카오 사용자 정보 요청 실패:', error);
                }
            });
        },
        fail: function(err) {
            console.error('카카오 로그인 실패:', err);
        }
    });
}
```

### 사용자 정보 처리
```javascript
async function handleKakaoUser(kakaoUser) {
    const kakaoId = kakaoUser.id;
    const nickname = kakaoUser.properties?.nickname || '카카오 사용자';
    const email = kakaoUser.kakao_account?.email || null;
    const profileImage = kakaoUser.properties?.profile_image || null;
    
    // DB에서 기존 사용자 찾기
    const { data: existingUsers } = await supabaseClient
        .from('users')
        .select('*')
        .eq('kakao_id', kakaoId);
    
    if (existingUsers && existingUsers.length > 0) {
        // 기존 사용자 로그인
        const user = existingUsers[0];
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
        window.location.href = 'index.html';
    } else {
        // 신규 사용자 - 회원가입 페이지로 이동
        sessionStorage.setItem('kakao_signup_data', JSON.stringify({
            kakao_id: kakaoId,
            name: nickname,
            email: email,
            profile_image: profileImage
        }));
        window.location.href = 'signup.html';
    }
}
```

### 로그아웃
```javascript
function kakaoLogout() {
    if (Kakao.Auth.getAccessToken()) {
        Kakao.Auth.logout(() => {
            console.log('카카오 로그아웃 완료');
            sessionStorage.removeItem(SESSION_KEY);
            window.location.href = 'login.html';
        });
    } else {
        sessionStorage.removeItem(SESSION_KEY);
        window.location.href = 'login.html';
    }
}
```

---

## 📊 데이터베이스 스키마

### users 테이블에 필드 추가 필요
```sql
ALTER TABLE users 
ADD COLUMN kakao_id BIGINT UNIQUE,
ADD COLUMN profile_image TEXT,
ADD COLUMN login_type VARCHAR(20) DEFAULT 'email'; -- 'email' or 'kakao'
```

---

## 🎯 사용 예시

### 로그인 버튼
```html
<button onclick="kakaoLogin()" class="btn-kakao">
    <img src="kakao-icon.svg" alt="카카오">
    카카오톡으로 시작하기
</button>
```

### 조건부 렌더링
```javascript
// 카카오 로그인 사용자인 경우
if (user.login_type === 'kakao') {
    // 비밀번호 변경 UI 숨김
    document.getElementById('passwordSection').style.display = 'none';
}
```

---

## 🚨 주의사항

### 1. JavaScript 키는 공개 가능
- JavaScript 키는 클라이언트에서 사용
- **Admin 키는 절대 노출 금지**

### 2. Redirect URI 정확히 설정
- 도메인과 정확히 일치해야 함
- http/https 구분 필요

### 3. 로그인 타입 구분
```javascript
// 로그인 타입에 따라 다른 처리
if (user.login_type === 'kakao') {
    // 카카오 사용자
} else {
    // 일반 이메일 사용자
}
```

### 4. 카카오 연결 끊기 vs 로그아웃
- **로그아웃**: 토큰만 삭제
- **연결 끊기**: 앱 연동 완전 해제 (신중하게 사용)

---

## 📱 모바일 대응

카카오톡 앱이 설치된 경우 자동으로 앱을 통한 로그인을 시도합니다.

```javascript
// 모바일에서 카카오톡 앱으로 로그인
Kakao.Auth.login({
    throughTalk: true, // 카카오톡 앱 우선
    success: function(authObj) {
        // 성공 처리
    },
    fail: function(err) {
        // 실패 처리
    }
});
```

---

## ✅ 체크리스트

- [ ] 카카오 Developers 앱 등록
- [ ] JavaScript 키 발급
- [ ] Redirect URI 설정
- [ ] 동의 항목 설정
- [ ] users 테이블에 kakao_id 컬럼 추가
- [ ] 로그인 버튼 추가
- [ ] 콜백 페이지 생성
- [ ] 테스트

---

**마지막 업데이트**: 2026-02-05  
**작성자**: AI Assistant
