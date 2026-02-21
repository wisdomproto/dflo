#!/bin/bash

# 187 성장케어 - Cloudflare Pages 배포 스크립트

echo "🚀 187 성장케어 배포 시작..."
echo ""

# 프로젝트명
PROJECT_NAME="187-growth-care"

# Wrangler 설치 확인
if ! command -v wrangler &> /dev/null
then
    echo "❌ Wrangler가 설치되지 않았습니다."
    echo "📦 설치 중..."
    npm install -g wrangler
    echo "✅ Wrangler 설치 완료"
    echo ""
fi

# 로그인 확인
echo "🔐 Cloudflare 로그인 확인 중..."
if ! wrangler whoami &> /dev/null
then
    echo "⚠️  로그인이 필요합니다."
    wrangler login
    echo ""
fi

# 배포
echo "📤 배포 중..."
echo ""
wrangler pages deploy . --project-name=$PROJECT_NAME

echo ""
echo "✅ 배포 완료!"
echo "🌍 URL: https://$PROJECT_NAME.pages.dev"
echo ""
