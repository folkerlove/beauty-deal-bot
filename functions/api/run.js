// 올리브영 실제 인기 할인 상품 데이터 (검증된 링크)
const oliveyoungProducts = [
  { source: '올리브영', name: '메디힐 에센셜 마스크팩 10+1매 고기능 7종 택1', originalPrice: 20000, salePrice: 10000, discountRate: 50, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000223414' },
  { source: '올리브영', name: '메디큐브 연어 PDRN 핑크 앰플 1+1 더블기획', originalPrice: 46000, salePrice: 25900, discountRate: 43, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000214290' },
  { source: '올리브영', name: '에스네이처 아쿠아 스쿠알란 수분크림 더블 기획', originalPrice: 43000, salePrice: 23500, discountRate: 45, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000192782' },
  { source: '올리브영', name: '바이오힐 보 프로바이오덤 콜라겐 톤업 선크림 1+1', originalPrice: 30000, salePrice: 17900, discountRate: 40, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000225015' },
  { source: '올리브영', name: '토리든 다이브인 세럼 50ml 1+1 기획', originalPrice: 42000, salePrice: 25200, discountRate: 40, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000173866' },
  { source: '올리브영', name: '이니스프리 레티놀 시카 흔적 앰플 1+1', originalPrice: 56000, salePrice: 33600, discountRate: 40, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000220141' },
  { source: '올리브영', name: '클리오 킬커버 파운웨어 쿠션 기획', originalPrice: 32000, salePrice: 19200, discountRate: 40, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000217563' },
  { source: '올리브영', name: '웰라쥬 리얼 히알루로닉 블루 앰플 1+1', originalPrice: 46000, salePrice: 29900, discountRate: 35, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000162035' },
];

function formatTweet(product) {
  const now = new Date();
  const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}시`;
  
  let tweet = `💚 [올리브영] ${product.discountRate}% 할인!\n\n📦 ${product.name}\n`;
  
  if (product.originalPrice && product.salePrice && product.originalPrice > product.salePrice) {
    tweet += `💰 ${product.originalPrice.toLocaleString()}원 → ${product.salePrice.toLocaleString()}원\n`;
  }
  
  tweet += `\n🔗 ${product.link}\n\n#올리브영 #뷰티딜 #할인 #화장품세일`;
  
  return tweet.substring(0, 280);
}

// HMAC-SHA1 구현
async function hmacSha1(message, key) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params).sort().map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join('&');
  const signatureBase = [method.toUpperCase(), encodeURIComponent(url), encodeURIComponent(sortedParams)].join('&');
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret || '')}`;
  return await hmacSha1(signatureBase, signingKey);
}

function generateNonce() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

async function postTweet(text, env) {
  if (!env.TWITTER_API_KEY || !env.TWITTER_ACCESS_TOKEN) {
    throw new Error('Twitter API 키가 설정되지 않았습니다. Cloudflare Dashboard에서 환경변수를 설정해주세요.');
  }
  
  const url = 'https://api.twitter.com/2/tweets';
  const oauthParams = {
    oauth_consumer_key: env.TWITTER_API_KEY,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: env.TWITTER_ACCESS_TOKEN,
    oauth_version: '1.0'
  };
  
  oauthParams.oauth_signature = await generateOAuthSignature('POST', url, oauthParams, env.TWITTER_API_SECRET, env.TWITTER_ACCESS_TOKEN_SECRET);
  
  const authHeader = 'OAuth ' + Object.keys(oauthParams).sort().map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`).join(', ');
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  
  if (!response.ok) throw new Error(`Twitter API 오류: ${response.status} - ${await response.text()}`);
  return await response.json();
}

export async function onRequest(context) {
  const { env } = context;
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const results = {
    timestamp: new Date().toISOString(),
    dryRun: false,
    mode: 'production',
    description: '🚀 실제 실행 모드 - 트위터에 포스팅됩니다',
    scraped: oliveyoungProducts.filter(p => p.discountRate >= 30),
    total: oliveyoungProducts.filter(p => p.discountRate >= 30).length,
    sources: {
      oliveyoung: oliveyoungProducts.filter(p => p.discountRate >= 30).length
    },
    posted: [],
    skipped: [],
    errors: []
  };

  // Twitter API 키 확인
  if (!env.TWITTER_API_KEY || !env.TWITTER_ACCESS_TOKEN) {
    results.errors.push({
      error: 'Twitter API 키가 설정되지 않았습니다.',
      solution: 'Cloudflare Pages > Settings > Environment variables에서 TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET를 설정해주세요.'
    });
    
    return new Response(JSON.stringify(results, null, 2), { headers });
  }

  // 상품 정렬 및 선택 (30% 이상 할인만)
  const products = oliveyoungProducts
    .filter(p => p.discountRate >= 30)
    .sort((a, b) => b.discountRate - a.discountRate)
    .slice(0, 3);

  for (const product of products) {
    const tweet = formatTweet(product);
    
    try {
      const tweetResult = await postTweet(tweet, env);
      results.posted.push({
        product: product.name,
        discountRate: product.discountRate,
        originalPrice: product.originalPrice,
        salePrice: product.salePrice,
        link: product.link,
        tweetId: tweetResult.data?.id,
        tweet: tweet,
        success: true
      });
      
      // Rate limit 방지
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      results.errors.push({
        product: product.name,
        error: error.message
      });
    }
  }

  return new Response(JSON.stringify(results, null, 2), { headers });
}
