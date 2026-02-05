/**
 * 가격 비교 API - 올리브영 상품을 네이버/쿠팡에서 검색하여 가격 비교
 */

// 올리브영 검증된 상품 데이터
const oliveyoungProducts = [
  { source: '올리브영', name: '메디힐 에센셜 마스크팩 10+1매', originalPrice: 20000, salePrice: 10000, discountRate: 50, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000223414', searchKeyword: '메디힐 마스크팩' },
  { source: '올리브영', name: '메디큐브 연어 PDRN 핑크 앰플 1+1', originalPrice: 46000, salePrice: 25900, discountRate: 43, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000214290', searchKeyword: '메디큐브 PDRN 앰플' },
  { source: '올리브영', name: '에스네이처 아쿠아 스쿠알란 수분크림', originalPrice: 43000, salePrice: 23500, discountRate: 45, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000192782', searchKeyword: '에스네이처 수분크림' },
  { source: '올리브영', name: '바이오힐보 콜라겐 톤업 선크림 1+1', originalPrice: 30000, salePrice: 17900, discountRate: 40, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000225015', searchKeyword: '바이오힐보 톤업 선크림' },
  { source: '올리브영', name: '토리든 다이브인 세럼 1+1', originalPrice: 42000, salePrice: 25200, discountRate: 40, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000173866', searchKeyword: '토리든 다이브인 세럼' },
  { source: '올리브영', name: '이니스프리 레티놀 시카 앰플 1+1', originalPrice: 56000, salePrice: 33600, discountRate: 40, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000220141', searchKeyword: '이니스프리 레티놀 앰플' },
  { source: '올리브영', name: '클리오 킬커버 파운웨어 쿠션', originalPrice: 32000, salePrice: 19200, discountRate: 40, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000217563', searchKeyword: '클리오 킬커버 쿠션' },
  { source: '올리브영', name: '웰라쥬 히알루로닉 블루 앰플 1+1', originalPrice: 46000, salePrice: 29900, discountRate: 35, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000162035', searchKeyword: '웰라쥬 히알루로닉 앰플' },
  { source: '올리브영', name: '아누아 어성초 토너 500ml', originalPrice: 35000, salePrice: 23100, discountRate: 34, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000188715', searchKeyword: '아누아 어성초 토너' },
  { source: '올리브영', name: '닥터지 레드 블레미쉬 크림', originalPrice: 38000, salePrice: 25700, discountRate: 32, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000164615', searchKeyword: '닥터지 레드 블레미쉬 크림' },
  { source: '올리브영', name: '라운드랩 자작나무 선크림 1+1', originalPrice: 32000, salePrice: 22400, discountRate: 30, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000186166', searchKeyword: '라운드랩 자작나무 선크림' },
];

// 네이버 쇼핑 검색 (API 키 필요 - 없으면 검색 URL 제공)
async function searchNaver(keyword, env) {
  const results = [];
  
  try {
    // 네이버 API가 설정되어 있으면 API 사용
    if (env?.NAVER_CLIENT_ID && env?.NAVER_CLIENT_SECRET) {
      const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(keyword)}&display=5&sort=sim`;
      
      const response = await fetch(url, {
        headers: {
          'X-Naver-Client-Id': env.NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': env.NAVER_CLIENT_SECRET
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.items) {
          for (const item of data.items.slice(0, 3)) {
            results.push({
              source: '네이버',
              name: item.title.replace(/<[^>]*>/g, ''),
              price: parseInt(item.lprice) || 0,
              link: item.link,
              image: item.image,
              mallName: item.mallName || '네이버쇼핑'
            });
          }
        }
      }
    }
    
    // API가 없으면 검색 링크만 제공
    if (results.length === 0) {
      results.push({
        source: '네이버',
        name: `"${keyword}" 검색 결과`,
        price: null,
        link: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(keyword)}`,
        searchUrl: true,
        mallName: '네이버쇼핑'
      });
    }
  } catch (error) {
    console.error('네이버 검색 오류:', error.message);
    results.push({
      source: '네이버',
      name: `"${keyword}" 검색`,
      price: null,
      link: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(keyword)}`,
      searchUrl: true,
      error: error.message
    });
  }
  
  return results;
}

// 쿠팡 검색 (파트너스 API 필요 - 없으면 검색 URL 제공)
async function searchCoupang(keyword, env) {
  const results = [];
  
  try {
    // 쿠팡 파트너스 API가 설정되어 있으면 API 사용
    if (env?.COUPANG_ACCESS_KEY && env?.COUPANG_SECRET_KEY) {
      // 쿠팡 파트너스 API 호출 (HMAC 서명 필요)
      // 복잡한 서명 과정이 필요하므로 여기서는 검색 URL로 대체
      // 실제 구현 시 쿠팡 파트너스 API 문서 참조
    }
    
    // 검색 링크 제공
    results.push({
      source: '쿠팡',
      name: `"${keyword}" 검색 결과`,
      price: null,
      link: `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(keyword)}&channel=user`,
      searchUrl: true,
      mallName: '쿠팡'
    });
  } catch (error) {
    console.error('쿠팡 검색 오류:', error.message);
    results.push({
      source: '쿠팡',
      name: `"${keyword}" 검색`,
      price: null,
      link: `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(keyword)}&channel=user`,
      searchUrl: true,
      error: error.message
    });
  }
  
  return results;
}

// 11번가 검색
async function search11st(keyword) {
  return [{
    source: '11번가',
    name: `"${keyword}" 검색 결과`,
    price: null,
    link: `https://search.11st.co.kr/Search.tmall?kwd=${encodeURIComponent(keyword)}`,
    searchUrl: true,
    mallName: '11번가'
  }];
}

// G마켓 검색
async function searchGmarket(keyword) {
  return [{
    source: 'G마켓',
    name: `"${keyword}" 검색 결과`,
    price: null,
    link: `https://browse.gmarket.co.kr/search?keyword=${encodeURIComponent(keyword)}`,
    searchUrl: true,
    mallName: 'G마켓'
  }];
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };
  
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: { ...headers, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }
  
  // 특정 상품 비교 요청
  const productIndex = url.searchParams.get('product');
  const keyword = url.searchParams.get('keyword');
  
  let productsToCompare = [];
  
  if (keyword) {
    // 키워드로 직접 검색
    productsToCompare = [{
      name: keyword,
      searchKeyword: keyword,
      salePrice: null,
      link: null
    }];
  } else if (productIndex !== null) {
    // 특정 상품 인덱스로 검색
    const index = parseInt(productIndex);
    if (index >= 0 && index < oliveyoungProducts.length) {
      productsToCompare = [oliveyoungProducts[index]];
    }
  } else {
    // 전체 상품 비교 (상위 5개만)
    productsToCompare = oliveyoungProducts.slice(0, 5);
  }
  
  const comparisons = [];
  
  for (const product of productsToCompare) {
    const searchKeyword = product.searchKeyword || product.name;
    
    // 병렬로 각 쇼핑몰 검색
    const [naverResults, coupangResults, st11Results, gmarketResults] = await Promise.all([
      searchNaver(searchKeyword, env),
      searchCoupang(searchKeyword, env),
      search11st(searchKeyword),
      searchGmarket(searchKeyword)
    ]);
    
    // 가격 비교 결과 생성
    const comparison = {
      oliveyoung: {
        name: product.name,
        price: product.salePrice,
        originalPrice: product.originalPrice,
        discountRate: product.discountRate,
        link: product.link
      },
      competitors: [
        ...naverResults,
        ...coupangResults,
        ...st11Results,
        ...gmarketResults
      ],
      searchKeyword,
      timestamp: new Date().toISOString()
    };
    
    // 최저가 찾기
    const allPrices = [
      { source: '올리브영', price: product.salePrice },
      ...comparison.competitors.filter(c => c.price).map(c => ({ source: c.source, price: c.price }))
    ].filter(p => p.price);
    
    if (allPrices.length > 0) {
      const lowestPrice = allPrices.reduce((min, p) => p.price < min.price ? p : min, allPrices[0]);
      comparison.lowestPrice = lowestPrice;
      comparison.isOliveyoungCheapest = lowestPrice.source === '올리브영';
    }
    
    comparisons.push(comparison);
  }
  
  return new Response(JSON.stringify({
    timestamp: new Date().toISOString(),
    total: comparisons.length,
    note: '💡 각 쇼핑몰 링크를 클릭하여 실제 가격을 확인하세요. API 키가 설정되면 실시간 가격 비교가 가능합니다.',
    apiStatus: {
      naver: env?.NAVER_CLIENT_ID ? '연결됨' : '미설정 (검색 링크만 제공)',
      coupang: env?.COUPANG_ACCESS_KEY ? '연결됨' : '미설정 (검색 링크만 제공)'
    },
    comparisons
  }, null, 2), { headers });
}
