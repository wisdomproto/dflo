# 🚀 원클릭 AI 설치 - 초간단 버전

## ✨ **단 하나의 명령으로 모든 것이 자동 실행됩니다!**

---

## 📦 **사전 준비** (이것만 있으면 됨!)

✅ Python 3.7 이상
```bash
python --version  # 확인
```

✅ PDF 파일
```
프로젝트/
  └── 우리 아이 키 성장 바이블 원고.pdf
```

---

## 🎯 **실행 방법 (딱 1줄!)**

### **Windows**
```cmd
scripts\setup_and_run.bat
```

### **Mac/Linux**
```bash
chmod +x scripts/setup_and_run.sh
./scripts/setup_and_run.sh
```

---

## 🤖 **자동으로 실행되는 것들**

```
[1/4] ✅ API 키 설정 (AIzaSyBI8J3EJSlEG7pLH3pAVrFZFq6_4Mbu-q8)
[2/4] ✅ 패키지 설치 (google-generativeai, Flask 등)
[3/4] ✅ PDF 처리 (임베딩 생성)
[4/4] ✅ API 서버 실행 (http://127.0.0.1:5000)
```

**소요 시간**: 약 2-5분

---

## 🌐 **웹앱 열기**

서버가 실행되면 **새 터미널**에서:

```bash
# 프로젝트 루트에서
python -m http.server 8000
```

브라우저 열기:
```
http://localhost:8000/info.html
```

---

## 🎉 **완료!**

이제 **🤖 AI 성장 상담** 버튼을 클릭하면:
- ✅ PDF 내용 기반 답변
- ✅ 출처 표시
- ✅ 완전 무료 (Google Gemini)

---

## 🆘 **문제 해결**

### PDF를 못 찾아요
```bash
# 직접 경로 입력
cd scripts
python pdf_to_rag_free.py
```

### 포트 충돌
```bash
# 다른 포트 사용
python local_api_server.py --port 5001
```

---

## 📚 **자세한 가이드**

- `docs/ONE_CLICK_SETUP.md` - 전체 가이드
- `docs/FREE_AI_QUICKSTART.md` - 수동 설정 방법

---

**이게 끝입니다!** 🎊
