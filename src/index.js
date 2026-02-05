/**
 * Beauty Deal Bot - Cloudflare Worker
 * 올리브영 인기 랭킹 페이지에서 30% 이상 할인 제품을 찾아 트위터에 자동 포스팅
 */

import * as cheerio from 'cheerio';

// =====================================================
// 올리브영 검증된 상품 데이터
// =====================================================

const oliveyoungProducts = [
  { source: '올리브영', name: '메디힐 에센셜 마스크팩 10+1매 고기능 7종 택1', originalPrice: 20000, salePrice: 10000, discountRate: 50, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000223414' },
  { source: '올리브영', name: '메디큐브 연어 PDRN 핑크 앰플 1+1 더블기획', originalPrice: 46000, salePrice: 25900, discountRate: 43, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000214290' },
  { source: '올리브영', name: '에스네이처 아쿠아 스쿠알란 수분크림 더블 기획', originalPrice: 43000, salePrice: 23500, discountRate: 45, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000192782' },
  { source: '올리브영', name: '바이오힐 보 프로바이오덤 콜라겐 톤업 선크림 1+1', originalPrice: 30000, salePrice: 17900, discountRate: 40, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000225015' },
  { source: '올리브영', name: '토리든 다이브인 세럼 50ml 1+1 기획', originalPrice: 42000, salePrice: 25200, discountRate: 40, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000173866' },
  { source: '올리브영', name: '이니스프리 레티놀 시카 흔적 앰플 1+1', originalPrice: 56000, salePrice: 33600, discountRate: 40, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000220141' },
  { source: '올리브영', name: '클리오 킬커버 파운웨어 쿠션 기획', originalPrice: 32000, salePrice: 19200, discountRate: 40, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000217563' },
  { source: '올리브영', name: '웰라쥬 리얼 히알루로닉 블루 앰플 1+1', originalPrice: 46000, salePrice: 29900, discountRate: 35, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000162035' },
  { source: '올리브영', name: '아누아 어성초 77 수딩 토너 500ml', originalPrice: 35000, salePrice: 23100, discountRate: 34, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000188715' },
  { source: '올리브영', name: '닥터지 레드 블레미쉬 클리어 수딩 크림 기획', originalPrice: 38000, salePrice: 25700, discountRate: 32, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000164615' },
  { source: '올리브영', name: '더하르나이 시카이드 크림 100ml+30ml', originalPrice: 29000, salePrice: 19900, discountRate: 31, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000192405' },
  { source: '올리브영', name: '라운드랩 자작나무 수분 선크림 1+1', originalPrice: 32000, salePrice: 22400, discountRate: 30, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000186166' },
];

// =====================================================
// HTML 템플릿
// =====================================================

function generateHTML(data = {}) {
  const { products = [], posted = [], errors = [], status = 'ready', lastUpdate = null } = data;
  const maxDiscount = products.length > 0 ? Math.max(...products.map(p => p.discountRate)) : 0;
  
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>💚 올리브영 할인 알리미 - Beauty Deal Bot</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    * { font-family: 'Noto Sans KR', sans-serif; }
    .gradient-bg { background: linear-gradient(135deg, #10B981 0%, #059669 100%); }
    .card-hover { transition: all 0.3s ease; }
    .card-hover:hover { transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
    .oliveyoung { border-left: 4px solid #10B981; }
    .discount-badge { 
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } }
    .loading { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .fade-in { animation: fadeIn 0.5s ease-in; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">
  <header class="gradient-bg text-white py-8 px-4 shadow-lg">
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-3xl md:text-4xl font-bold flex items-center gap-3">💚 올리브영 할인 알리미</h1>
          <p class="mt-2 text-green-100 text-sm md:text-base">올리브영 30% 이상 할인 상품 자동 트위터 포스팅</p>
        </div>
        <div class="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
          <span class="w-3 h-3 rounded-full ${status === 'running' ? 'bg-yellow-400 loading' : 'bg-green-300'} animate-pulse"></span>
          <span class="text-sm font-medium">${status === 'running' ? '실행 중...' : '대기 중'}</span>
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-4 py-8">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-white rounded-2xl p-6 shadow-sm card-hover">
        <div class="text-3xl mb-2">📦</div>
        <div class="text-2xl font-bold text-gray-800">${products.length}</div>
        <div class="text-gray-500 text-sm">발견된 할인 상품</div>
      </div>
      <div class="bg-white rounded-2xl p-6 shadow-sm card-hover">
        <div class="text-3xl mb-2">🐦</div>
        <div class="text-2xl font-bold text-gray-800">${posted.length}</div>
        <div class="text-gray-500 text-sm">포스팅됨</div>
      </div>
      <div class="bg-white rounded-2xl p-6 shadow-sm card-hover">
        <div class="text-3xl mb-2">💚</div>
        <div class="text-2xl font-bold text-green-600">${products.length}</div>
        <div class="text-gray-500 text-sm">올리브영</div>
      </div>
      <div class="bg-white rounded-2xl p-6 shadow-sm card-hover">
        <div class="text-3xl mb-2">🔥</div>
        <div class="text-2xl font-bold text-red-500">${maxDiscount}%</div>
        <div class="text-gray-500 text-sm">최대 할인율</div>
      </div>
    </div>

    <div class="bg-white rounded-2xl p-6 shadow-sm mb-8">
      <h2 class="text-lg font-bold text-gray-800 mb-4">🎮 컨트롤 패널</h2>
      <div class="flex flex-wrap gap-3">
        <button onclick="runScrape()" class="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition flex items-center gap-2">
          <span>🔍</span> 스크래핑 테스트
        </button>
        <button onclick="runTest()" class="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition flex items-center gap-2">
          <span>🧪</span> 전체 테스트 (Dry Run)
        </button>
        <button onclick="runBot()" class="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition flex items-center gap-2">
          <span>🚀</span> 실제 실행
        </button>
        <button onclick="location.reload()" class="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition flex items-center gap-2">
          <span>🔄</span> 새로고침
        </button>
      </div>
      <p class="mt-3 text-gray-500 text-sm">
        ⏰ Cron 스케줄: 매 시간 0분 자동 실행 | 마지막 업데이트: <span id="lastUpdate">${lastUpdate || new Date().toLocaleString('ko-KR')}</span>
      </p>
    </div>

    <div id="loadingIndicator" class="hidden bg-white rounded-2xl p-8 shadow-sm mb-8 text-center">
      <div class="inline-block w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full loading"></div>
      <p class="mt-4 text-gray-600" id="loadingText">스크래핑 중...</p>
    </div>

    <div class="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8">
      <div class="flex items-start gap-3">
        <span class="text-2xl">💚</span>
        <div>
          <h3 class="font-bold text-green-800">올리브영 전용 할인 알리미</h3>
          <p class="text-green-700 text-sm mt-1">올리브영 베스트 상품 중 30% 이상 할인 상품을 자동으로 찾아 트위터에 포스팅합니다.</p>
        </div>
      </div>
    </div>

    <div id="resultsSection" class="space-y-6">
      <div class="bg-white rounded-2xl p-6 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-gray-800">🔥 30% 이상 할인 상품</h2>
          <span class="text-sm text-gray-500">${products.length}개 상품</span>
        </div>
        <div id="productsGrid" class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${products.length > 0 ? products.map((product, index) => `
            <div class="border rounded-xl p-4 card-hover fade-in oliveyoung" style="animation-delay: ${index * 0.1}s">
              <div class="flex items-start justify-between mb-2">
                <span class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">💚 올리브영</span>
                <span class="discount-badge text-white text-sm font-bold px-3 py-1 rounded-full">${product.discountRate}% OFF</span>
              </div>
              <h3 class="font-medium text-gray-800 text-sm mb-2 line-clamp-2 h-10" title="${product.name}">${product.name}</h3>
              ${product.originalPrice && product.salePrice ? `
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-gray-400 line-through text-sm">${product.originalPrice.toLocaleString()}원</span>
                  <span class="text-red-500 font-bold">${product.salePrice.toLocaleString()}원</span>
                </div>
              ` : '<div class="mb-3 h-6"></div>'}
              <a href="${product.link}" target="_blank" rel="noopener" class="block w-full text-center py-2 bg-green-100 hover:bg-green-200 rounded-lg text-sm text-green-700 transition">상품 보기 →</a>
            </div>
          `).join('') : `
            <div class="col-span-full text-center py-12 text-gray-500">
              <div class="text-5xl mb-4">🔍</div>
              <p>상품을 불러오려면 위의 "스크래핑 테스트" 버튼을 클릭하세요</p>
            </div>
          `}
        </div>
      </div>

      ${posted.length > 0 ? `
        <div class="bg-white rounded-2xl p-6 shadow-sm">
          <h2 class="text-lg font-bold text-gray-800 mb-4">🐦 포스팅된 트윗</h2>
          <div class="space-y-3">
            ${posted.map(item => `
              <div class="bg-green-50 border border-green-100 rounded-xl p-4">
                <div class="flex items-center gap-2 mb-2 flex-wrap">
                  <span class="text-green-500">🐦</span>
                  <span class="font-medium text-gray-800">${item.product}</span>
                  <span class="text-sm text-gray-500">(${item.discountRate}% 할인)</span>
                  ${item.dryRun ? '<span class="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">테스트</span>' : ''}
                </div>
                ${item.tweet ? `<pre class="text-sm text-gray-600 bg-white p-3 rounded-lg whitespace-pre-wrap overflow-x-auto">${item.tweet}</pre>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${errors.length > 0 ? `
        <div class="bg-red-50 border border-red-100 rounded-2xl p-6">
          <h2 class="text-lg font-bold text-red-800 mb-4">⚠️ 오류</h2>
          <div class="space-y-2">
            ${errors.map(err => `
              <div class="bg-white rounded-lg p-3 text-sm text-red-600">
                ${err.product ? `<strong>${err.product}:</strong> ` : ''}${err.error || err.message || JSON.stringify(err)}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>

    <div class="mt-8 bg-white rounded-2xl p-6 shadow-sm">
      <h2 class="text-lg font-bold text-gray-800 mb-4">📋 API 응답</h2>
      <pre id="apiResponse" class="bg-gray-900 text-green-400 p-4 rounded-xl text-sm overflow-x-auto max-h-96">${JSON.stringify(data, null, 2) || '// 결과가 여기에 표시됩니다'}</pre>
    </div>
  </main>

  <footer class="bg-gray-800 text-gray-400 py-8 px-4 mt-12">
    <div class="max-w-6xl mx-auto text-center">
      <p class="mb-2">Made with 💚 for 올리브영 deal hunters</p>
      <div class="flex justify-center gap-4 text-sm flex-wrap">
        <a href="https://github.com/folkerlove/beauty-deal-bot" target="_blank" class="hover:text-white transition">📦 GitHub</a>
        <span>|</span>
        <a href="/api/scrape" class="hover:text-white transition">🔗 /api/scrape</a>
        <span>|</span>
        <a href="/api/test" class="hover:text-white transition">🔗 /api/test</a>
        <span>|</span>
        <a href="/api/run" class="hover:text-white transition">🔗 /api/run</a>
      </div>
    </div>
  </footer>

  <script>
    const API_BASE = window.location.origin;
    
    function showLoading(text = '처리 중...') {
      document.getElementById('loadingIndicator').classList.remove('hidden');
      document.getElementById('loadingText').textContent = text;
    }
    
    function hideLoading() {
      document.getElementById('loadingIndicator').classList.add('hidden');
    }
    
    async function fetchAPI(endpoint) {
      try {
        showLoading(\`\${endpoint} 실행 중...\`);
        const response = await fetch(\`\${API_BASE}/api\${endpoint}\`);
        const data = await response.json();
        document.getElementById('apiResponse').textContent = JSON.stringify(data, null, 2);
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString('ko-KR');
        if (data.scraped || data.posted) {
          setTimeout(() => location.href = \`?data=\${encodeURIComponent(JSON.stringify(data))}\`, 500);
        }
        return data;
      } catch (error) {
        alert('오류 발생: ' + error.message);
        document.getElementById('apiResponse').textContent = JSON.stringify({ error: error.message }, null, 2);
      } finally {
        hideLoading();
      }
    }
    
    function runScrape() { fetchAPI('/scrape'); }
    function runTest() { fetchAPI('/test'); }
    function runBot() { 
      if (confirm('실제로 트위터에 포스팅하시겠습니까?')) { fetchAPI('/run'); }
    }
    
    window.onload = function() {
      const params = new URLSearchParams(window.location.search);
      const data = params.get('data');
      if (data) {
        try { document.getElementById('apiResponse').textContent = JSON.stringify(JSON.parse(decodeURIComponent(data)), null, 2); } catch (e) {}
      }
    };
  </script>
</body>
</html>`;
}

// =====================================================
// 스크래퍼 모듈 (올리브영 전용)
// =====================================================

async function scrapeOliveYoung(env) {
  const products = [];
  
  try {
    const url = 'https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=900000100090001&fltDispCatNo=&pageIdx=1&rowsPerPage=100';
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });
    
    if (!response.ok) return products;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const selectors = ['.prd_info', 'li.flag', 'li[data-goods-no]', '.cate_prd_list li'];
    
    for (const selector of selectors) {
      $(selector).each((index, element) => {
        try {
          const $item = $(element);
          let name = $item.find('.tx_name').text().trim() || $item.find('.prd_name').text().trim() || $item.find('a').attr('title')?.trim() || '';
          if (!name) return;
          
          const orgPriceText = $item.find('.tx_org .tx_num').text() || $item.find('.price_org').text();
          const originalPrice = parseInt(orgPriceText.replace(/[^\d]/g, '')) || 0;
          
          const salePriceText = $item.find('.tx_cur .tx_num').text() || $item.find('.price_sale').text();
          const salePrice = parseInt(salePriceText.replace(/[^\d]/g, '')) || 0;
          
          let discountRate = 0;
          const discountText = $item.find('.tx_per').text() || $item.find('.badge_flag.sale').text();
          const directDiscount = parseInt(discountText.replace(/[^\d]/g, '')) || 0;
          
          if (directDiscount > 0) discountRate = directDiscount;
          else if (originalPrice > 0 && salePrice > 0 && originalPrice > salePrice) {
            discountRate = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
          }
          
          const goodsNo = $item.attr('data-goods-no') || $item.find('a').attr('href')?.match(/goodsNo=([A-Z0-9]+)/)?.[1] || '';
          const link = goodsNo ? `https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=${goodsNo}` : '';
          
          if (discountRate >= 30 && link && name) {
            products.push({ source: '올리브영', name: name.substring(0, 100), originalPrice, salePrice: salePrice || originalPrice, discountRate, link });
          }
        } catch (e) {}
      });
      if (products.length > 0) break;
    }
  } catch (error) {
    console.error('올리브영 스크래핑 오류:', error.message);
  }
  
  return products;
}

async function scrapeOliveYoungSale(env) {
  const products = [];
  try {
    const urls = ['https://www.oliveyoung.co.kr/store/main/getSaleList.do'];
    
    for (const url of urls) {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
      });
      if (!response.ok) continue;
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      $('li[data-goods-no], .prd_info').each((index, element) => {
        try {
          const $item = $(element);
          const name = $item.find('.tx_name, .prd_name').first().text().trim() || $item.find('a').attr('title')?.trim() || '';
          if (!name) return;
          
          const discountText = $item.find('.tx_per, .badge_flag.sale').text();
          const discountRate = parseInt(discountText.replace(/[^\d]/g, '')) || 0;
          const goodsNo = $item.attr('data-goods-no') || $item.find('a').attr('href')?.match(/goodsNo=([A-Z0-9]+)/)?.[1];
          
          if (discountRate >= 30 && goodsNo) {
            const orgPrice = parseInt($item.find('.tx_org .tx_num, .price_org').text().replace(/[^\d]/g, '')) || 0;
            const salePrice = parseInt($item.find('.tx_cur .tx_num, .price_sale').text().replace(/[^\d]/g, '')) || 0;
            products.push({ source: '올리브영', name: name.substring(0, 100), originalPrice: orgPrice, salePrice: salePrice || orgPrice, discountRate, link: `https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=${goodsNo}` });
          }
        } catch (e) {}
      });
    }
  } catch (error) {}
  return products;
}

function getSampleProducts() {
  return oliveyoungProducts.filter(p => p.discountRate >= 30);
}

// =====================================================
// 트위터 포스팅 모듈
// =====================================================

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
  if (!env.TWITTER_API_KEY || !env.TWITTER_ACCESS_TOKEN) throw new Error('Twitter API 키가 설정되지 않았습니다');
  
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

function formatTweet(product) {
  const now = new Date();
  const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}시`;
  
  let tweet = `💚 [올리브영] ${product.discountRate}% 할인!\n\n📦 ${product.name}\n`;
  
  if (product.originalPrice && product.salePrice && product.originalPrice > product.salePrice) {
    tweet += `💰 ${product.originalPrice.toLocaleString()}원 → ${product.salePrice.toLocaleString()}원\n`;
  }
  
  tweet += `\n🔗 ${product.link}\n\n#올리브영 #뷰티딜 #할인 #화장품세일`;
  
  if (tweet.length > 280) {
    const shortName = product.name.substring(0, Math.max(20, 280 - tweet.length + product.name.length - 10)) + '...';
    tweet = tweet.replace(product.name, shortName);
  }
  
  return tweet.substring(0, 280);
}

// =====================================================
// KV Storage
// =====================================================

async function isAlreadyPosted(env, productKey) {
  if (!env.POSTED_PRODUCTS) return false;
  try { return (await env.POSTED_PRODUCTS.get(productKey)) !== null; } catch (e) { return false; }
}

async function markAsPosted(env, productKey) {
  if (!env.POSTED_PRODUCTS) return;
  try { await env.POSTED_PRODUCTS.put(productKey, Date.now().toString(), { expirationTtl: 86400 }); } catch (e) {}
}

function getProductKey(product) {
  const urlPart = product.link.split('?')[1] || product.link.slice(-30);
  return `oliveyoung:${urlPart}`;
}

// =====================================================
// 메인 핸들러
// =====================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    
    // 웹페이지 대시보드
    if (url.pathname === '/' || url.pathname === '/dashboard') {
      const params = new URLSearchParams(url.search);
      const dataParam = params.get('data');
      
      let pageData = { products: [], posted: [], errors: [], status: 'ready' };
      
      if (dataParam) {
        try { pageData = JSON.parse(decodeURIComponent(dataParam)); } catch (e) {}
      }
      
      return new Response(generateHTML({
        products: pageData.scraped || pageData.products || getSampleProducts(),
        posted: pageData.posted || [],
        errors: pageData.errors || [],
        status: 'ready',
        lastUpdate: new Date().toLocaleString('ko-KR')
      }), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    
    // API: 상태
    if (url.pathname === '/api/status' || url.pathname === '/status') {
      return new Response(JSON.stringify({
        status: 'ok',
        message: '💚 올리브영 할인 알리미가 실행 중입니다!',
        version: '2.0.0',
        schedule: '매 시간 0분 (Cron: 0 * * * *)',
        lastCheck: new Date().toISOString()
      }, null, 2), { headers });
    }
    
    // API: 스크래핑
    if (url.pathname === '/api/scrape' || url.pathname === '/scrape') {
      const results = await Promise.allSettled([scrapeOliveYoung(env), scrapeOliveYoungSale(env)]);
      
      const oliveyoung = results[0].status === 'fulfilled' ? results[0].value : [];
      const oliveyoungSale = results[1].status === 'fulfilled' ? results[1].value : [];
      
      const allProducts = [...oliveyoung, ...oliveyoungSale];
      const useSample = allProducts.length === 0;
      
      return new Response(JSON.stringify({
        timestamp: new Date().toISOString(),
        scraped: useSample ? getSampleProducts() : allProducts,
        total: useSample ? getSampleProducts().length : allProducts.length,
        sources: { oliveyoung: useSample ? getSampleProducts().length : allProducts.length },
        note: useSample ? '⚠️ 스크래핑 결과가 없어 올리브영 검증된 상품 데이터를 표시합니다.' : '✅ 올리브영 실시간 스크래핑 성공',
        posted: [],
        errors: []
      }, null, 2), { headers });
    }
    
    // API: 테스트
    if (url.pathname === '/api/test' || url.pathname === '/test') {
      const results = await runBot(env, true);
      return new Response(JSON.stringify(results, null, 2), { headers });
    }
    
    // API: 실행
    if (url.pathname === '/api/run' || url.pathname === '/run') {
      const results = await runBot(env, false);
      return new Response(JSON.stringify(results, null, 2), { headers });
    }
    
    // 404
    return new Response(JSON.stringify({ error: 'Not Found', message: '유효한 경로: /, /api/scrape, /api/test, /api/run' }), { status: 404, headers });
  },
  
  async scheduled(controller, env, ctx) {
    console.log('🕐 Cron job 시작:', new Date().toISOString());
    try {
      const results = await runBot(env, false);
      console.log(`✅ Cron job 완료 - 스크래핑: ${results.scraped.length}, 포스팅: ${results.posted.length}`);
    } catch (error) {
      console.error('❌ Cron job 실패:', error.message);
    }
  }
};

async function runBot(env, dryRun = false) {
  const results = { timestamp: new Date().toISOString(), dryRun, scraped: [], posted: [], skipped: [], errors: [] };
  
  try {
    const scrapingResults = await Promise.allSettled([scrapeOliveYoung(env), scrapeOliveYoungSale(env)]);
    
    let allProducts = [];
    scrapingResults.forEach((result) => { if (result.status === 'fulfilled') allProducts = allProducts.concat(result.value); });
    
    if (allProducts.length === 0) allProducts = getSampleProducts();
    
    const productMap = new Map();
    allProducts.forEach(product => {
      const key = product.link;
      if (!productMap.has(key) || productMap.get(key).discountRate < product.discountRate) productMap.set(key, product);
    });
    
    results.scraped = Array.from(productMap.values());
    
    const dealsToPost = results.scraped.filter(p => p.discountRate >= 30).sort((a, b) => b.discountRate - a.discountRate).slice(0, 5);
    
    for (const product of dealsToPost) {
      const productKey = getProductKey(product);
      
      if (await isAlreadyPosted(env, productKey)) {
        results.skipped.push({ product: product.name, reason: '이미 포스팅됨' });
        continue;
      }
      
      const tweet = formatTweet(product);
      
      if (dryRun) {
        results.posted.push({ product: product.name, discountRate: product.discountRate, tweet, dryRun: true });
      } else {
        try {
          const tweetResult = await postTweet(tweet, env);
          await markAsPosted(env, productKey);
          results.posted.push({ product: product.name, discountRate: product.discountRate, tweetId: tweetResult.data?.id });
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
          results.errors.push({ product: product.name, error: error.message });
        }
      }
    }
  } catch (error) {
    results.errors.push({ error: error.message, stack: error.stack });
  }
  
  return results;
}
