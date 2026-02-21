# 🚀 187 성장케어 AI - 빠른 시작

## ⚠️ 에러 해결!

위 스크린샷의 에러는 **PyPDF2**와 **fastapi** 패키지가 없어서 발생했습니다.

---

## ✅ 해결 방법 (3가지 옵션)

### **옵션 1: 자동 설치 스크립트 재실행** (권장)

스크립트를 업데이트했습니다. 다시 실행하면 자동으로 해결됩니다:

```cmd
scripts\setup_and_run.bat
```

---

### **옵션 2: 패키지 직접 설치**

```cmd
cd scripts
pip install -r ../requirements-free.txt
```

또는 개별 설치:
```cmd
pip install google-generativeai chromadb PyPDF2 python-dotenv fastapi uvicorn pydantic numpy
```

---

### **옵션 3: 단계별 수동 실행**

#### 1단계: 패키지 설치
```cmd
cd scripts
pip install google-generativeai chromadb PyPDF2 python-dotenv fastapi uvicorn numpy
```

#### 2단계: API 키 설정
`.env` 파일 생성 (scripts 폴더 안):
```
GEMINI_API_KEY=AIzaSyBI8J3EJSlEG7pLH3pAVrFZFq6_4Mbu-q8
```

#### 3단계: PDF 처리
```cmd
python pdf_to_rag_free.py "..\우리 아이 키 성장 바이블 원고.pdf" growth_bible
```

#### 4단계: API 서버 실행
```cmd
uvicorn local_api_server:app --host 127.0.0.1 --port 5000 --reload
```

#### 5단계: 웹 서버 실행 (새 터미널)
```cmd
cd ..
python -m http.server 8000
```

#### 6단계: 브라우저 열기
```
http://localhost:8000/info.html
```

---

## 📋 필수 요구사항

- ✅ Python 3.8 이상
- ✅ PDF 파일: `우리 아이 키 성장 바이블 원고.pdf`
- ✅ API 키: `AIzaSyBI8J3EJSlEG7pLH3pAVrFZFq6_4Mbu-q8`

---

## 🔧 패키지 리스트

```
google-generativeai  # Gemini API
chromadb            # 로컬 벡터 DB
PyPDF2              # PDF 읽기
python-dotenv       # 환경 변수
fastapi             # API 서버
uvicorn             # ASGI 서버
pydantic            # 데이터 검증
numpy               # 수치 계산
```

---

## 🆘 문제 해결

### Q: `ModuleNotFoundError: No module named 'PyPDF2'`

```cmd
pip install PyPDF2
```

### Q: `ModuleNotFoundError: No module named 'fastapi'`

```cmd
pip install fastapi uvicorn
```

### Q: `ModuleNotFoundError: No module named 'chromadb'`

```cmd
pip install chromadb
```

### Q: pip가 느려요

```cmd
pip install --upgrade pip
pip install -r requirements-free.txt --no-cache-dir
```

### Q: PDF 파일을 못 찾아요

파일 경로 확인:
```
프로젝트/
  ├── scripts/
  │   └── (여기서 스크립트 실행)
  └── 우리 아이 키 성장 바이블 원고.pdf  ← 이 위치!
```

또는 절대 경로로 직접 지정:
```cmd
python pdf_to_rag_free.py "C:\Users\...\우리 아이 키 성장 바이블 원고.pdf"
```

---

## ✅ 설치 확인

모든 패키지가 설치되었는지 확인:

```cmd
python -c "import PyPDF2; import fastapi; import chromadb; import google.generativeai; print('✅ 모든 패키지 설치 완료!')"
```

---

## 🎉 완료 후 확인 사항

1. ✅ API 서버 실행 중: `http://127.0.0.1:5000`
2. ✅ 웹 서버 실행 중: `http://localhost:8000`
3. ✅ ChromaDB 생성됨: `scripts/chroma_db/` 폴더
4. ✅ `.env` 파일 존재: `scripts/.env`

---

## 💡 빠른 테스트

API 서버가 실행되면:

```cmd
curl -X POST http://127.0.0.1:5000/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"message\": \"성조숙증이란?\"}"
```

---

**이제 다시 `scripts\setup_and_run.bat`를 실행하면 자동으로 모든 패키지가 설치됩니다!** 🚀
