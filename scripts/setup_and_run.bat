@echo off
chcp 65001
echo ====================================
echo 187 성장케어 AI 자동 설치
echo ====================================
echo.

REM 1. API 키 설정
echo [1/4] API 키 설정 중...
echo GEMINI_API_KEY=AIzaSyBI8J3EJSlEG7pLH3pAVrFZFq6_4Mbu-q8 > .env
echo ✓ API 키 설정 완료
echo.

REM 2. 패키지 설치
echo [2/4] Python 패키지 설치 중...
echo   필수 패키지 설치 (약 30초~1분 소요)...
pip install --upgrade pip
pip install google-generativeai chromadb PyPDF2 python-dotenv fastapi "uvicorn[standard]" pydantic numpy
if %errorlevel% neq 0 (
    echo ✗ 패키지 설치 실패. requirements-free.txt로 재시도...
    pip install -r ../requirements-free.txt
    if %errorlevel% neq 0 (
        echo ✗ 패키지 설치 실패. 다음을 수동으로 실행해주세요:
        echo   pip install google-generativeai chromadb PyPDF2 fastapi uvicorn
        pause
        exit /b 1
    )
)
echo ✓ 패키지 설치 완료
echo.

REM 3. PDF 처리 (선택 사항 - PDF 없어도 서버 실행됨)
echo [3/4] PDF 파일 처리 중...

set "PDF_FOUND=0"

REM 여러 경로에서 PDF 찾기
if exist "..\우리 아이 키 성장 바이블 원고.pdf" (
    echo   ✓ PDF 파일 발견: ..\우리 아이 키 성장 바이블 원고.pdf
    python pdf_to_rag_free.py "..\우리 아이 키 성장 바이블 원고.pdf" growth_bible
    set "PDF_FOUND=1"
    goto :pdf_done
)

if exist "..\..\우리 아이 키 성장 바이블 원고.pdf" (
    echo   ✓ PDF 파일 발견: ..\..\우리 아이 키 성장 바이블 원고.pdf
    python pdf_to_rag_free.py "..\..\우리 아이 키 성장 바이블 원고.pdf" growth_bible
    set "PDF_FOUND=1"
    goto :pdf_done
)

if exist "우리 아이 키 성장 바이블 원고.pdf" (
    echo   ✓ PDF 파일 발견: 우리 아이 키 성장 바이블 원고.pdf
    python pdf_to_rag_free.py "우리 아이 키 성장 바이블 원고.pdf" growth_bible
    set "PDF_FOUND=1"
    goto :pdf_done
)

:pdf_not_found
echo   ⚠ PDF 파일을 찾을 수 없습니다.
echo   현재 디렉토리: %CD%
echo.
echo   예상 경로:
echo   - %CD%\..\우리 아이 키 성장 바이블 원고.pdf
echo   - %CD%\..\..\우리 아이 키 성장 바이블 원고.pdf
echo   - %CD%\우리 아이 키 성장 바이블 원고.pdf
echo.
echo   ℹ PDF 없이도 서버는 실행됩니다!
echo   나중에 PDF를 수동으로 처리할 수 있습니다:
echo   python scripts\pdf_to_rag_free.py "PDF경로" growth_bible
echo.
timeout /t 3 >nul

:pdf_done
echo.

REM 4. 서버 실행
echo [4/4] API 서버 시작 중...
echo ✓ 서버가 http://127.0.0.1:5000 에서 실행됩니다
echo.
echo ====================================
echo 설치 완료! 이제 웹앱을 열어주세요:
echo 1. 새 터미널을 열고: python -m http.server 8000
echo 2. 브라우저에서: http://localhost:8000/info.html
echo ====================================
echo.
uvicorn local_api_server:app --host 127.0.0.1 --port 5000 --reload
