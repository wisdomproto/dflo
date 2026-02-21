#!/bin/bash

echo "===================================="
echo "187 성장케어 AI 자동 설치"
echo "===================================="
echo ""

# 1. API 키 설정
echo "[1/4] API 키 설정 중..."
echo "GEMINI_API_KEY=AIzaSyBI8J3EJSlEG7pLH3pAVrFZFq6_4Mbu-q8" > .env
echo "✓ API 키 설정 완료"
echo ""

# 2. 패키지 설치
echo "[2/4] Python 패키지 설치 중..."
pip install -q google-generativeai PyPDF2 Flask flask-cors python-dotenv numpy
if [ $? -eq 0 ]; then
    echo "✓ 패키지 설치 완료"
else
    echo "✗ 패키지 설치 실패"
    exit 1
fi
echo ""

# 3. PDF 처리
echo "[3/4] PDF 파일 처리 중..."
if [ -f "../우리 아이 키 성장 바이블 원고.pdf" ]; then
    echo "../우리 아이 키 성장 바이블 원고.pdf" | python3 pdf_to_rag_free.py
    echo "✓ PDF 처리 완료"
else
    echo "⚠ PDF 파일을 찾을 수 없습니다."
    echo "  경로: ../우리 아이 키 성장 바이블 원고.pdf"
fi
echo ""

# 4. 서버 실행
echo "[4/4] API 서버 시작 중..."
echo "✓ 서버가 http://127.0.0.1:5000 에서 실행됩니다"
echo ""
echo "===================================="
echo "설치 완료! 이제 웹앱을 열어주세요:"
echo "http://localhost:8000/info.html"
echo "===================================="
echo ""
python3 local_api_server.py
