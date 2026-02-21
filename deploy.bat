@echo off
chcp 65001 >nul
echo 🚀 187 성장케어 배포 시작...
echo.

set PROJECT_NAME=187-growth-care

REM Wrangler 설치 확인
where wrangler >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Wrangler가 설치되지 않았습니다.
    echo 📦 설치 중...
    call npm install -g wrangler
    echo ✅ Wrangler 설치 완료
    echo.
)

REM 로그인 확인
echo 🔐 Cloudflare 로그인 확인 중...
wrangler whoami >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  로그인이 필요합니다.
    call wrangler login
    echo.
)

REM 배포
echo 📤 배포 중...
echo.
call wrangler pages deploy . --project-name=%PROJECT_NAME%

echo.
echo ✅ 배포 완료!
echo 🌍 URL: https://%PROJECT_NAME%.pages.dev
echo.
pause
