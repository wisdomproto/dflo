# 🔐 HTTPS 및 로컬 개발 가이드

## 🌐 배포 환경 (HTTPS)

### ✅ **프로덕션 URL**
```
https://187-growth-care.pages.dev
```

- ✅ **HTTPS 적용** - 카메라 사용 가능
- ✅ **Cloudflare Pages** - 자동 HTTPS
- ✅ **체형 분석 페이지**: https://187-growth-care.pages.dev/body-analysis.html

---

## 💻 로컬 개발 환경

### ❌ **문제**

로컬에서 `http://` 프로토콜 사용 시:
```
http://localhost:8000/body-analysis.html  ❌
```

**카메라 권한 오류 발생!**
- NotAllowedError 또는 NotReadableError
- 브라우저가 HTTP에서 카메라 접근 차단

---

## ✅ **해결 방법**

### 방법 1: localhost 사용 (권장) ✅

```bash
# Python 3
python -m http.server 8000

# 접속
http://localhost:8000/body-analysis.html  ✅
```

**`localhost`는 예외적으로 허용됩니다!**

---

### 방법 2: 로컬 HTTPS 서버 (고급)

#### A. Python + SSL

```bash
# SSL 인증서 생성
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# HTTPS 서버 실행
python -m http.server 8443 --bind 0.0.0.0
```

```python
# https_server.py
import http.server
import ssl

server_address = ('localhost', 8443)
httpd = http.server.HTTPServer(server_address, http.server.SimpleHTTPRequestHandler)

# SSL 설정
httpd.socket = ssl.wrap_socket(httpd.socket,
                               server_side=True,
                               certfile='cert.pem',
                               keyfile='key.pem',
                               ssl_version=ssl.PROTOCOL_TLS)

print('HTTPS 서버 시작: https://localhost:8443')
httpd.serve_forever()
```

```bash
# 실행
python https_server.py

# 접속
https://localhost:8443/body-analysis.html  ✅
```

**주의**: 자체 서명 인증서 경고 무시 필요

---

#### B. Node.js + http-server

```bash
# http-server 설치
npm install -g http-server

# HTTPS 서버 실행
http-server -S -C cert.pem -K key.pem -p 8443

# 접속
https://localhost:8443/body-analysis.html  ✅
```

---

### 방법 3: ngrok (외부 접속)

```bash
# ngrok 설치 (https://ngrok.com)

# 로컬 서버 실행
python -m http.server 8000

# ngrok 터널 생성
ngrok http 8000
```

**출력 예시**:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:8000
```

**접속**:
```
https://abc123.ngrok.io/body-analysis.html  ✅
```

**장점**: 
- 자동 HTTPS
- 모바일 기기에서 테스트 가능
- 임시 URL 제공

---

## 📱 모바일 테스트

### ✅ **권장 방법**

1. **프로덕션 URL 사용**
   ```
   https://187-growth-care.pages.dev/body-analysis.html
   ```

2. **ngrok 사용**
   ```
   https://abc123.ngrok.io/body-analysis.html
   ```

### ❌ **작동하지 않는 방법**

1. **로컬 IP로 접속**
   ```
   http://192.168.0.10:8000/body-analysis.html  ❌
   ```
   → HTTP라서 카메라 차단

2. **localhost를 IP로 변경**
   ```
   http://127.0.0.1:8000/body-analysis.html  ✅ (PC만)
   http://192.168.0.10:8000/body-analysis.html  ❌ (모바일)
   ```

---

## 🔧 코드에 추가된 HTTPS 체크

```javascript
// body-analysis.js
if (location.protocol !== 'https:' && 
    location.hostname !== 'localhost' && 
    location.hostname !== '127.0.0.1') {
    alert('⚠️ 카메라는 보안 연결(HTTPS)에서만 사용할 수 있습니다.\n\n현재 주소: ' + location.protocol + '//' + location.hostname);
    return;
}
```

**허용되는 환경**:
- ✅ `https://`
- ✅ `http://localhost:*`
- ✅ `http://127.0.0.1:*`

---

## 🎯 권장 워크플로우

### 로컬 개발
```bash
# 1. 로컬 서버 실행
python -m http.server 8000

# 2. 접속 (PC)
http://localhost:8000/body-analysis.html  ✅
```

### 모바일 테스트
```bash
# 1. ngrok 터널 생성
ngrok http 8000

# 2. 모바일에서 접속
https://abc123.ngrok.io/body-analysis.html  ✅
```

### 프로덕션 테스트
```
# Cloudflare Pages
https://187-growth-care.pages.dev/body-analysis.html  ✅
```

---

## 🚨 주의사항

### ❌ 카메라가 작동하지 않는 경우

1. **주소창 확인**
   - `https://` 또는 `http://localhost` 인지 확인

2. **브라우저 권한 확인**
   - 주소창 자물쇠 아이콘 클릭
   - 카메라 권한 "허용" 확인

3. **브라우저 콘솔 확인**
   - F12 → Console 탭
   - HTTPS 경고 메시지 확인

---

## 📋 체크리스트

### 로컬 개발 시

- [ ] `http://localhost` 또는 `http://127.0.0.1` 사용
- [ ] 다른 IP 주소 사용 안 함
- [ ] Python 서버 실행 중

### 모바일 테스트 시

- [ ] ngrok 또는 프로덕션 URL 사용
- [ ] HTTPS 확인
- [ ] 카메라 권한 허용

### 프로덕션 배포 시

- [ ] Cloudflare Pages 자동 HTTPS
- [ ] 도메인 설정 확인
- [ ] SSL 인증서 자동 발급

---

## 🎉 완료!

**HTTPS 환경에서 카메라를 안전하게 사용하세요!**

---

**작성일**: 2026-02-11  
**작성자**: AI Assistant
