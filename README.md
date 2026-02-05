# Beauty Deal Bot 🛍️

올리브영/예스스타일 인기 랭킹 페이지에서 **30% 이상 할인** 제품을 자동으로 찾아 트위터에 포스팅하는 봇입니다.

Cloudflare Workers의 Cron Trigger를 사용하여 **1시간마다** 자동으로 실행됩니다.

## 주요 기능

- 🔍 **자동 스크래핑**: 올리브영, 예스스타일 베스트셀러 페이지 크롤링
- 💰 **할인 필터링**: 30% 이상 할인 상품만 선별
- 🐦 **트위터 자동 포스팅**: Twitter API v2를 통한 자동 트윗
- ⏰ **1시간 주기 실행**: Cloudflare Cron Trigger 활용
- 🔄 **중복 방지**: KV Storage로 이미 포스팅된 상품 추적
- 💻 **24시간 운영**: Cloudflare Workers에서 서버리스로 실행

## 프로젝트 구조

```
beauty-deal-bot/
├── src/
│   └── index.js          # 메인 Worker 코드
├── wrangler.toml         # Cloudflare 설정
├── package.json          # 의존성 및 스크립트
└── README.md             # 이 문서
```

## 배포 가이드

### 1. 사전 요구사항

- [Node.js](https://nodejs.org/) 18 이상
- [Cloudflare 계정](https://dash.cloudflare.com/sign-up)
- [Twitter Developer 계정](https://developer.twitter.com/)

### 2. Twitter API 키 발급

1. [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard) 접속
2. 새 프로젝트/앱 생성
3. **User authentication settings**에서 OAuth 1.0a 활성화
4. 다음 키들을 복사해두세요:
   - API Key
   - API Secret
   - Access Token
   - Access Token Secret

> ⚠️ **중요**: Twitter Free tier에서도 트윗 포스팅이 가능합니다 (월 1,500 트윗 제한)

### 3. Cloudflare 설정

#### 3.1 Wrangler CLI 로그인

```bash
npx wrangler login
```

브라우저에서 Cloudflare 계정 인증

#### 3.2 KV Namespace 생성

```bash
# Production용 KV
npx wrangler kv:namespace create "POSTED_PRODUCTS"
# 출력된 id를 wrangler.toml에 입력

# Preview용 KV (개발 테스트용)
npx wrangler kv:namespace create "POSTED_PRODUCTS" --preview
# 출력된 preview_id를 wrangler.toml에 입력
```

#### 3.3 wrangler.toml 수정

생성된 KV namespace ID를 `wrangler.toml`에 입력:

```toml
[[kv_namespaces]]
binding = "POSTED_PRODUCTS"
id = "여기에_production_id_입력"
preview_id = "여기에_preview_id_입력"
```

#### 3.4 Twitter API 키 설정 (Secrets)

```bash
# 각 명령어 실행 후 프롬프트에 해당 키 값 입력
npx wrangler secret put TWITTER_API_KEY
npx wrangler secret put TWITTER_API_SECRET
npx wrangler secret put TWITTER_ACCESS_TOKEN
npx wrangler secret put TWITTER_ACCESS_TOKEN_SECRET
```

### 4. 배포

```bash
# 프로덕션 배포
npm run deploy

# 또는
npx wrangler deploy
```

배포 후 Cloudflare Dashboard에서 Worker 확인 가능

## 로컬 테스트

### 개발 서버 실행

```bash
npm run dev
```

### 테스트 엔드포인트

```bash
# 스크래핑만 테스트 (트윗 안 함)
curl http://localhost:8787/scrape

# 전체 봇 테스트 (dry run)
curl http://localhost:8787/test

# Cron 트리거 테스트
curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"
```

## 모니터링

### 실시간 로그 확인

```bash
npm run tail
# 또는
npx wrangler tail
```

### Cloudflare Dashboard

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) 접속
2. Workers & Pages > beauty-deal-bot
3. **Triggers** 탭에서 Cron 실행 기록 확인
4. **Logs** 탭에서 실행 로그 확인

## 트윗 포맷 예시

```
💚 [올리브영] 43% 할인!

📦 메디큐브 연어 PDRN 핑크 앰플 더블기획 (30ml+30ml)
💰 46,000원 → 25,900원

🔗 https://www.oliveyoung.co.kr/store/goods/...

#뷰티딜 #할인 #올리브영
```

## 설정 커스터마이징

### Cron 스케줄 변경

`wrangler.toml`에서 cron 표현식 수정:

```toml
[triggers]
crons = ["0 * * * *"]  # 매시 정각
# crons = ["*/30 * * * *"]  # 30분마다
# crons = ["0 9,21 * * *"]  # 매일 9시, 21시
```

### 할인율 기준 변경

`src/index.js`에서 `discountRate >= 30` 부분 수정

### 최대 트윗 수 변경

`src/index.js`에서 `.slice(0, 5)` 부분 수정

## 문제 해결

### "Twitter API 오류: 401"
- API 키가 올바르게 설정되었는지 확인
- OAuth 1.0a가 활성화되어 있는지 확인
- Access Token에 Write 권한이 있는지 확인

### "KV namespace not found"
- KV namespace가 생성되었는지 확인
- wrangler.toml의 id가 올바른지 확인

### 스크래핑 결과가 비어있음
- 해당 사이트의 HTML 구조가 변경되었을 수 있음
- `/scrape` 엔드포인트로 테스트 후 파싱 로직 수정 필요

## 기술 스택

- **Runtime**: Cloudflare Workers
- **Language**: JavaScript (ES Modules)
- **Scraping**: Cheerio
- **Storage**: Cloudflare KV
- **Scheduling**: Cloudflare Cron Triggers
- **API**: Twitter API v2 (OAuth 1.0a)

## 라이선스

ISC

## 기여

Pull Request 환영합니다!

---

Made with ❤️ for beauty deal hunters
