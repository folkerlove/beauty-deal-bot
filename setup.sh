#!/bin/bash

# Beauty Deal Bot 설정 스크립트
# ================================

echo "🛍️ Beauty Deal Bot 설정을 시작합니다..."
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Wrangler 로그인 확인
echo "📌 Step 1: Cloudflare 로그인"
echo "----------------------------"
if npx wrangler whoami 2>/dev/null | grep -q "You are logged in"; then
    echo -e "${GREEN}✓ 이미 Cloudflare에 로그인되어 있습니다${NC}"
else
    echo "Cloudflare에 로그인이 필요합니다..."
    npx wrangler login
fi
echo ""

# 2. KV Namespace 생성
echo "📌 Step 2: KV Namespace 생성"
echo "----------------------------"
echo "Production KV Namespace를 생성합니다..."
KV_OUTPUT=$(npx wrangler kv:namespace create "POSTED_PRODUCTS" 2>&1)
echo "$KV_OUTPUT"

# KV ID 추출
KV_ID=$(echo "$KV_OUTPUT" | grep -oP 'id = "\K[^"]+')
if [ -n "$KV_ID" ]; then
    echo -e "${GREEN}✓ KV ID: $KV_ID${NC}"
    sed -i "s/id = \"your-kv-namespace-id\"/id = \"$KV_ID\"/" wrangler.toml
else
    echo -e "${YELLOW}⚠ KV ID를 자동으로 추출하지 못했습니다. wrangler.toml을 수동으로 수정해주세요.${NC}"
fi

echo ""
echo "Preview KV Namespace를 생성합니다..."
PREVIEW_OUTPUT=$(npx wrangler kv:namespace create "POSTED_PRODUCTS" --preview 2>&1)
echo "$PREVIEW_OUTPUT"

PREVIEW_ID=$(echo "$PREVIEW_OUTPUT" | grep -oP 'id = "\K[^"]+')
if [ -n "$PREVIEW_ID" ]; then
    echo -e "${GREEN}✓ Preview KV ID: $PREVIEW_ID${NC}"
    sed -i "s/preview_id = \"your-preview-kv-namespace-id\"/preview_id = \"$PREVIEW_ID\"/" wrangler.toml
fi
echo ""

# 3. Twitter API 키 설정
echo "📌 Step 3: Twitter API 키 설정"
echo "-------------------------------"
echo -e "${YELLOW}Twitter Developer Portal에서 발급받은 키를 입력해주세요.${NC}"
echo "https://developer.twitter.com/en/portal/dashboard"
echo ""

read -p "Twitter API Key를 입력하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "TWITTER_API_KEY를 설정합니다 (값을 입력하세요):"
    npx wrangler secret put TWITTER_API_KEY
    
    echo "TWITTER_API_SECRET를 설정합니다 (값을 입력하세요):"
    npx wrangler secret put TWITTER_API_SECRET
    
    echo "TWITTER_ACCESS_TOKEN를 설정합니다 (값을 입력하세요):"
    npx wrangler secret put TWITTER_ACCESS_TOKEN
    
    echo "TWITTER_ACCESS_TOKEN_SECRET를 설정합니다 (값을 입력하세요):"
    npx wrangler secret put TWITTER_ACCESS_TOKEN_SECRET
    
    echo -e "${GREEN}✓ Twitter API 키 설정 완료${NC}"
else
    echo -e "${YELLOW}⚠ Twitter API 키 설정을 건너뜁니다. 나중에 다음 명령어로 설정하세요:${NC}"
    echo "  npx wrangler secret put TWITTER_API_KEY"
    echo "  npx wrangler secret put TWITTER_API_SECRET"
    echo "  npx wrangler secret put TWITTER_ACCESS_TOKEN"
    echo "  npx wrangler secret put TWITTER_ACCESS_TOKEN_SECRET"
fi
echo ""

# 4. 배포
echo "📌 Step 4: Cloudflare Workers에 배포"
echo "------------------------------------"
read -p "지금 배포하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx wrangler deploy
    echo ""
    echo -e "${GREEN}✓ 배포 완료!${NC}"
else
    echo -e "${YELLOW}⚠ 배포를 건너뜁니다. 나중에 'npm run deploy'로 배포하세요.${NC}"
fi
echo ""

# 5. 완료 메시지
echo "================================"
echo -e "${GREEN}🎉 설정이 완료되었습니다!${NC}"
echo "================================"
echo ""
echo "📋 다음 단계:"
echo "  1. Cloudflare Dashboard에서 Worker 확인"
echo "     https://dash.cloudflare.com/"
echo ""
echo "  2. 로그 모니터링"
echo "     npm run tail"
echo ""
echo "  3. 테스트"
echo "     curl https://beauty-deal-bot.<your-subdomain>.workers.dev/scrape"
echo ""
echo "  4. Cron Trigger는 매 시간 0분에 자동 실행됩니다"
echo ""
echo "문제가 있으면 README.md를 참고하세요!"
