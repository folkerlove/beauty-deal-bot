/**
 * Beauty Deal Bot - Cloudflare Worker
 * 올리브영/예스스타일 인기 랭킹 페이지에서 30% 이상 할인 제품을 찾아 트위터에 자동 포스팅
 */

import * as cheerio from 'cheerio';

// =====================================================
// 스크래퍼 모듈
// =====================================================

/**
 * 올리브영 랭킹 페이지 스크래핑 (PC 버전)
 */
async function scrapeOliveYoung(env) {
  const products = [];
  
  try {
    // 올리브영 베스트 랭킹 페이지
    const url = 'https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=900000100090001&fltDispCatNo=&pageIdx=1&rowsPerPage=100';
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      }
    });
    
    if (!response.ok) {
      console.error(`올리브영 요청 실패: ${response.status}`);
      return products;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // 올리브영 상품 리스트 파싱 (여러 셀렉터 시도)
    const selectors = [
      '.prd_info',
      'li.flag',
      'li[data-goods-no]',
      '.cate_prd_list li',
      '.prodList li'
    ];
    
    for (const selector of selectors) {
      $(selector).each((index, element) => {
        try {
          const $item = $(element);
          
          // 상품명 추출
          let name = $item.find('.tx_name').text().trim() ||
                     $item.find('.prd_name').text().trim() ||
                     $item.find('a').attr('title')?.trim() || '';
          
          if (!name) return;
          
          // 정가
          const orgPriceText = $item.find('.tx_org .tx_num').text() ||
                              $item.find('.price_org').text() ||
                              $item.find('.org_price').text();
          const originalPrice = parseInt(orgPriceText.replace(/[^\d]/g, '')) || 0;
          
          // 판매가
          const salePriceText = $item.find('.tx_cur .tx_num').text() ||
                               $item.find('.price_sale').text() ||
                               $item.find('.prd_price').text();
          const salePrice = parseInt(salePriceText.replace(/[^\d]/g, '')) || 0;
          
          // 할인율 계산
          let discountRate = 0;
          
          // 직접 표시된 할인율
          const discountText = $item.find('.tx_per').text() ||
                              $item.find('.badge_flag.sale').text() ||
                              $item.find('.discount').text();
          const directDiscount = parseInt(discountText.replace(/[^\d]/g, '')) || 0;
          
          if (directDiscount > 0) {
            discountRate = directDiscount;
          } else if (originalPrice > 0 && salePrice > 0 && originalPrice > salePrice) {
            discountRate = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
          }
          
          // 상품 링크
          const goodsNo = $item.attr('data-goods-no') ||
                         $item.find('a').attr('data-goods-no') ||
                         $item.find('a').attr('href')?.match(/goodsNo=([A-Z0-9]+)/)?.[1] || '';
          
          const link = goodsNo
            ? `https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=${goodsNo}`
            : '';
          
          if (discountRate >= 30 && link && name) {
            products.push({
              source: '올리브영',
              name: name.substring(0, 100),
              originalPrice,
              salePrice: salePrice || originalPrice,
              discountRate,
              link
            });
          }
        } catch (e) {
          console.error('올리브영 상품 파싱 오류:', e.message);
        }
      });
      
      if (products.length > 0) break; // 상품을 찾으면 루프 종료
    }
    
  } catch (error) {
    console.error('올리브영 스크래핑 오류:', error.message);
  }
  
  return products;
}

/**
 * 올리브영 세일 페이지 직접 스크래핑
 */
async function scrapeOliveYoungSale(env) {
  const products = [];
  
  try {
    // 올리브영 세일/기획전 페이지 (할인 상품이 더 많음)
    const urls = [
      'https://www.oliveyoung.co.kr/store/main/getSaleList.do',
      'https://www.oliveyoung.co.kr/store/display/getMCategoryList.do?dispCatNo=90000010001'
    ];
    
    for (const url of urls) {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        }
      });
      
      if (!response.ok) continue;
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // 세일 상품 파싱
      $('li[data-goods-no], .prd_info').each((index, element) => {
        try {
          const $item = $(element);
          
          const name = $item.find('.tx_name, .prd_name').first().text().trim() ||
                      $item.find('a').attr('title')?.trim() || '';
          if (!name) return;
          
          const discountText = $item.find('.tx_per, .badge_flag.sale, .discount_rate').text();
          const discountRate = parseInt(discountText.replace(/[^\d]/g, '')) || 0;
          
          const goodsNo = $item.attr('data-goods-no') ||
                         $item.find('a').attr('href')?.match(/goodsNo=([A-Z0-9]+)/)?.[1];
          
          if (discountRate >= 30 && goodsNo) {
            const orgPrice = parseInt($item.find('.tx_org .tx_num, .price_org').text().replace(/[^\d]/g, '')) || 0;
            const salePrice = parseInt($item.find('.tx_cur .tx_num, .price_sale').text().replace(/[^\d]/g, '')) || 0;
            
            products.push({
              source: '올리브영',
              name: name.substring(0, 100),
              originalPrice: orgPrice,
              salePrice: salePrice || orgPrice,
              discountRate,
              link: `https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=${goodsNo}`
            });
          }
        } catch (e) {
          // 개별 상품 파싱 오류 무시
        }
      });
    }
  } catch (error) {
    console.error('올리브영 세일 스크래핑 오류:', error.message);
  }
  
  return products;
}

/**
 * 예스스타일 베스트셀러 스크래핑
 */
async function scrapeYesStyle(env) {
  const products = [];
  
  try {
    // 예스스타일 K-Beauty 베스트셀러
    const urls = [
      'https://www.yesstyle.com/en/beauty-skincare/list.html/bcc.15541_bpt.46?sb=136',
      'https://www.yesstyle.com/en/korean-skin-care/list.html/bcc.15541_bpt.46_bt.37?sb=136'
    ];
    
    for (const url of urls) {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
        }
      });
      
      if (!response.ok) {
        console.error(`예스스타일 요청 실패: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // 예스스타일 상품 목록 파싱
      const selectors = [
        '.product-list-item',
        '.productList .itemContainer',
        '[data-product-id]',
        '.product-item'
      ];
      
      for (const selector of selectors) {
        $(selector).each((index, element) => {
          try {
            const $item = $(element);
            
            // 상품명
            const name = $item.find('.product-name').text().trim() ||
                        $item.find('.itemTitle').text().trim() ||
                        $item.find('a').attr('title')?.trim() ||
                        $item.find('.name').text().trim() || '';
            
            if (!name) return;
            
            // 할인율 확인
            const discountBadge = $item.find('.discount, .sale-badge, .discount-badge').text();
            const discountMatch = discountBadge.match(/(\d+)%/);
            let discountRate = discountMatch ? parseInt(discountMatch[1]) : 0;
            
            // 가격에서 할인율 계산
            if (discountRate === 0) {
              const originalText = $item.find('.was-price, .original-price, .orgPrice').text();
              const saleText = $item.find('.now-price, .sale-price, .salePrice').text();
              
              const originalPrice = parseFloat(originalText.replace(/[^\d.]/g, '')) || 0;
              const salePrice = parseFloat(saleText.replace(/[^\d.]/g, '')) || 0;
              
              if (originalPrice > salePrice && salePrice > 0) {
                discountRate = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
              }
            }
            
            // 상품 링크
            const href = $item.find('a').attr('href') || '';
            const link = href.startsWith('http') ? href :
                        href ? `https://www.yesstyle.com${href}` : '';
            
            if (discountRate >= 30 && link) {
              products.push({
                source: '예스스타일',
                name: name.substring(0, 100),
                originalPrice: 0,
                salePrice: 0,
                discountRate,
                link
              });
            }
          } catch (e) {
            // 개별 상품 파싱 오류 무시
          }
        });
        
        if (products.length > 0) break;
      }
    }
  } catch (error) {
    console.error('예스스타일 스크래핑 오류:', error.message);
  }
  
  return products;
}

/**
 * 예스스타일 세일 페이지 스크래핑
 */
async function scrapeYesStyleSale(env) {
  const products = [];
  
  try {
    // 예스스타일 세일 페이지
    const url = 'https://www.yesstyle.com/en/beauty-on-sale/list.html/bcc.15541_bpt.46_ss.1';
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    if (!response.ok) return products;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // JSON-LD 스크립트에서 제품 데이터 추출 시도
    $('script[type="application/ld+json"]').each((i, script) => {
      try {
        const data = JSON.parse($(script).html() || '{}');
        if (data.itemListElement) {
          for (const item of data.itemListElement) {
            const product = item.item;
            if (product && product.offers) {
              const offer = product.offers;
              const originalPrice = parseFloat(offer.highPrice || offer.price) || 0;
              const salePrice = parseFloat(offer.lowPrice || offer.price) || 0;
              
              let discountRate = 0;
              if (originalPrice > salePrice && salePrice > 0) {
                discountRate = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
              }
              
              if (discountRate >= 30 && product.url) {
                products.push({
                  source: '예스스타일',
                  name: (product.name || '').substring(0, 100),
                  originalPrice,
                  salePrice,
                  discountRate,
                  link: product.url
                });
              }
            }
          }
        }
      } catch (e) {
        // JSON 파싱 오류 무시
      }
    });
    
  } catch (error) {
    console.error('예스스타일 세일 스크래핑 오류:', error.message);
  }
  
  return products;
}

// =====================================================
// 데모/테스트용 샘플 데이터 (스크래핑 실패 시 사용)
// =====================================================

function getSampleProducts() {
  // 실제 올리브영/예스스타일에서 자주 보이는 할인 상품 패턴
  return [
    {
      source: '올리브영',
      name: '메디힐 에센셜 마스크팩 10+1매 고기능 택1',
      originalPrice: 20000,
      salePrice: 10000,
      discountRate: 50,
      link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000223414'
    },
    {
      source: '올리브영',
      name: '메디큐브 연어 PDRN 핑크 앰플 더블기획',
      originalPrice: 46000,
      salePrice: 25900,
      discountRate: 43,
      link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000214290'
    },
    {
      source: '올리브영',
      name: '에스네이처 아쿠아 스쿠알란 수분크림 더블 기획',
      originalPrice: 43000,
      salePrice: 23500,
      discountRate: 45,
      link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000192782'
    },
    {
      source: '예스스타일',
      name: 'COSRX - Advanced Snail 96 Mucin Power Essence',
      originalPrice: 25,
      salePrice: 15,
      discountRate: 40,
      link: 'https://www.yesstyle.com/en/cosrx-advanced-snail-96-mucin-power-essence-100ml/info.html/pid.1052684987'
    },
    {
      source: '예스스타일',
      name: 'Beauty of Joseon - Glow Serum',
      originalPrice: 17,
      salePrice: 11,
      discountRate: 35,
      link: 'https://www.yesstyle.com/en/beauty-of-joseon-glow-serum-30ml/info.html/pid.1090727386'
    }
  ];
}

// =====================================================
// 트위터 포스팅 모듈
// =====================================================

/**
 * HMAC-SHA1 구현 (Web Crypto API 사용)
 */
async function hmacSha1(message, key) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * OAuth 1.0a 서명 생성
 */
async function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params).sort().map(key => 
    `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
  ).join('&');
  
  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&');
  
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret || '')}`;
  
  return await hmacSha1(signatureBase, signingKey);
}

/**
 * 랜덤 nonce 생성
 */
function generateNonce() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 트위터에 트윗 포스팅 (OAuth 1.0a)
 */
async function postTweet(text, env) {
  // API 키가 없으면 에러
  if (!env.TWITTER_API_KEY || !env.TWITTER_ACCESS_TOKEN) {
    throw new Error('Twitter API 키가 설정되지 않았습니다');
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
  
  const signature = await generateOAuthSignature(
    'POST',
    url,
    oauthParams,
    env.TWITTER_API_SECRET,
    env.TWITTER_ACCESS_TOKEN_SECRET
  );
  
  oauthParams.oauth_signature = signature;
  
  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twitter API 오류: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
}

/**
 * 상품을 트윗 형식으로 변환
 */
function formatTweet(product) {
  const emoji = product.source === '올리브영' ? '💚' : '💜';
  const now = new Date();
  const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}시`;
  
  let tweet = `${emoji} [${product.source}] ${product.discountRate}% 할인!\n\n`;
  tweet += `📦 ${product.name}\n`;
  
  if (product.originalPrice && product.salePrice && product.originalPrice > product.salePrice) {
    if (product.source === '올리브영') {
      tweet += `💰 ${product.originalPrice.toLocaleString()}원 → ${product.salePrice.toLocaleString()}원\n`;
    } else {
      tweet += `💰 $${product.originalPrice} → $${product.salePrice}\n`;
    }
  }
  
  tweet += `\n🔗 ${product.link}`;
  tweet += `\n\n#뷰티딜 #할인 #${product.source.replace(/\s/g, '')} #${timeStr.replace(/\s/g, '')}`;
  
  // 트위터 280자 제한
  if (tweet.length > 280) {
    const maxNameLength = 280 - tweet.length + product.name.length - 10;
    const shortName = product.name.substring(0, Math.max(20, maxNameLength)) + '...';
    tweet = tweet.replace(product.name, shortName);
  }
  
  return tweet.substring(0, 280);
}

// =====================================================
// KV Storage 관리 (중복 포스팅 방지)
// =====================================================

async function isAlreadyPosted(env, productKey) {
  if (!env.POSTED_PRODUCTS) return false;
  
  try {
    const posted = await env.POSTED_PRODUCTS.get(productKey);
    return posted !== null;
  } catch (e) {
    return false;
  }
}

async function markAsPosted(env, productKey) {
  if (!env.POSTED_PRODUCTS) return;
  
  try {
    await env.POSTED_PRODUCTS.put(productKey, Date.now().toString(), {
      expirationTtl: 86400 // 24시간 후 만료
    });
  } catch (e) {
    console.error('KV 저장 오류:', e.message);
  }
}

function getProductKey(product) {
  // 링크의 고유 부분만 추출하여 키 생성
  const urlPart = product.link.split('?')[1] || product.link.slice(-30);
  return `${product.source}:${urlPart}`;
}

// =====================================================
// 메인 핸들러
// =====================================================

export default {
  /**
   * HTTP 요청 핸들러 (수동 테스트/모니터링용)
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS 헤더
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    };
    
    // 상태 확인
    if (url.pathname === '/' || url.pathname === '/status') {
      return new Response(JSON.stringify({
        status: 'ok',
        message: '🛍️ Beauty Deal Bot이 실행 중입니다!',
        version: '1.0.0',
        endpoints: {
          '/': '봇 상태 확인',
          '/scrape': '스크래핑 테스트 (트윗 안 함)',
          '/test': '전체 테스트 (dry run)',
          '/run': '실제 실행 (트윗 포스팅)'
        },
        schedule: '매 시간 0분 (Cron: 0 * * * *)',
        lastCheck: new Date().toISOString()
      }, null, 2), { headers });
    }
    
    // 스크래핑만 테스트
    if (url.pathname === '/scrape') {
      console.log('스크래핑 테스트 시작...');
      
      const results = await Promise.allSettled([
        scrapeOliveYoung(env),
        scrapeOliveYoungSale(env),
        scrapeYesStyle(env),
        scrapeYesStyleSale(env)
      ]);
      
      const oliveyoung = results[0].status === 'fulfilled' ? results[0].value : [];
      const oliveyoungSale = results[1].status === 'fulfilled' ? results[1].value : [];
      const yesstyle = results[2].status === 'fulfilled' ? results[2].value : [];
      const yesstyleSale = results[3].status === 'fulfilled' ? results[3].value : [];
      
      // 스크래핑 실패시 샘플 데이터 제공
      const allProducts = [...oliveyoung, ...oliveyoungSale, ...yesstyle, ...yesstyleSale];
      const useSample = allProducts.length === 0;
      
      return new Response(JSON.stringify({
        timestamp: new Date().toISOString(),
        oliveyoung: oliveyoung,
        oliveyoungSale: oliveyoungSale,
        yesstyle: yesstyle,
        yesstyleSale: yesstyleSale,
        total: allProducts.length,
        note: useSample ? '⚠️ 스크래핑 결과가 없습니다. 사이트가 봇을 차단했거나 HTML 구조가 변경되었을 수 있습니다.' : null,
        sampleData: useSample ? getSampleProducts() : null
      }, null, 2), { headers });
    }
    
    // 전체 테스트 (dry run)
    if (url.pathname === '/test') {
      const results = await runBot(env, true);
      return new Response(JSON.stringify(results, null, 2), { headers });
    }
    
    // 실제 실행
    if (url.pathname === '/run') {
      const results = await runBot(env, false);
      return new Response(JSON.stringify(results, null, 2), { headers });
    }
    
    // 404
    return new Response(JSON.stringify({
      error: 'Not Found',
      message: '유효한 엔드포인트: /, /scrape, /test, /run'
    }), { 
      status: 404,
      headers 
    });
  },
  
  /**
   * 스케줄된 작업 핸들러 (Cron Trigger)
   * 매 시간 0분에 실행
   */
  async scheduled(controller, env, ctx) {
    console.log('='.repeat(50));
    console.log('🕐 Cron job 시작:', new Date().toISOString());
    console.log('='.repeat(50));
    
    try {
      const results = await runBot(env, false);
      console.log('✅ Cron job 완료');
      console.log(`   - 스크래핑: ${results.scraped.length}개 상품`);
      console.log(`   - 포스팅: ${results.posted.length}개`);
      console.log(`   - 건너뜀: ${results.skipped.length}개`);
      console.log(`   - 오류: ${results.errors.length}개`);
    } catch (error) {
      console.error('❌ Cron job 실패:', error.message);
    }
  }
};

/**
 * 봇 메인 로직 실행
 */
async function runBot(env, dryRun = false) {
  const results = {
    timestamp: new Date().toISOString(),
    dryRun,
    scraped: [],
    posted: [],
    skipped: [],
    errors: []
  };
  
  try {
    // 1. 스크래핑
    console.log('📡 스크래핑 시작...');
    
    const scrapingResults = await Promise.allSettled([
      scrapeOliveYoung(env),
      scrapeOliveYoungSale(env),
      scrapeYesStyle(env),
      scrapeYesStyleSale(env)
    ]);
    
    // 결과 수집
    let allProducts = [];
    scrapingResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allProducts = allProducts.concat(result.value);
      } else {
        console.error(`스크래핑 소스 ${index} 실패:`, result.reason);
      }
    });
    
    // 스크래핑 실패시 샘플 데이터 사용 (테스트용)
    if (allProducts.length === 0 && dryRun) {
      console.log('⚠️ 스크래핑 결과 없음. 샘플 데이터 사용...');
      allProducts = getSampleProducts();
    }
    
    // 중복 제거
    const productMap = new Map();
    allProducts.forEach(product => {
      const key = product.link;
      if (!productMap.has(key) || productMap.get(key).discountRate < product.discountRate) {
        productMap.set(key, product);
      }
    });
    
    const uniqueProducts = Array.from(productMap.values());
    results.scraped = uniqueProducts;
    
    console.log(`📦 ${uniqueProducts.length}개 30% 이상 할인 상품 발견`);
    
    // 2. 포스팅할 상품 선택 (할인율 높은 순, 최대 5개)
    const dealsToPost = uniqueProducts
      .filter(p => p.discountRate >= 30)
      .sort((a, b) => b.discountRate - a.discountRate)
      .slice(0, 5);
    
    // 3. 트위터 포스팅
    for (const product of dealsToPost) {
      const productKey = getProductKey(product);
      
      // 중복 체크
      if (await isAlreadyPosted(env, productKey)) {
        results.skipped.push({ 
          product: product.name, 
          reason: '이미 포스팅됨' 
        });
        continue;
      }
      
      const tweet = formatTweet(product);
      
      if (dryRun) {
        // 테스트 모드
        results.posted.push({ 
          product: product.name,
          discountRate: product.discountRate,
          tweet,
          dryRun: true 
        });
        console.log(`[DRY RUN] 트윗 생성: ${product.name} (${product.discountRate}% 할인)`);
      } else {
        // 실제 포스팅
        try {
          const tweetResult = await postTweet(tweet, env);
          await markAsPosted(env, productKey);
          
          results.posted.push({ 
            product: product.name,
            discountRate: product.discountRate,
            tweetId: tweetResult.data?.id 
          });
          console.log(`✅ 트윗 성공: ${product.name}`);
          
          // Rate limit 방지
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
          results.errors.push({ 
            product: product.name, 
            error: error.message 
          });
          console.error(`❌ 트윗 실패: ${product.name} - ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    results.errors.push({ 
      error: error.message, 
      stack: error.stack 
    });
    console.error('봇 실행 오류:', error);
  }
  
  return results;
}
