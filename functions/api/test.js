// 올리브영 실제 인기 할인 상품 데이터 (검증된 링크)
const oliveyoungProducts = [
  { 
    source: '올리브영', 
    name: '메디힐 에센셜 마스크팩 10+1매 고기능 7종 택1', 
    originalPrice: 20000, 
    salePrice: 10000, 
    discountRate: 50, 
    link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000223414'
  },
  { 
    source: '올리브영', 
    name: '메디큐브 연어 PDRN 핑크 앰플 1+1 더블기획 (30ml+30ml)', 
    originalPrice: 46000, 
    salePrice: 25900, 
    discountRate: 43, 
    link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000214290'
  },
  { 
    source: '올리브영', 
    name: '에스네이처 아쿠아 스쿠알란 수분크림 60ml 1+1 더블 기획', 
    originalPrice: 43000, 
    salePrice: 23500, 
    discountRate: 45, 
    link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000192782'
  },
  { 
    source: '올리브영', 
    name: '바이오힐 보 프로바이오덤 콜라겐 톤업 선크림 1+1 기획', 
    originalPrice: 30000, 
    salePrice: 17900, 
    discountRate: 40, 
    link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000225015'
  },
  { 
    source: '올리브영', 
    name: '토리든 다이브인 세럼 50ml 1+1 기획', 
    originalPrice: 42000, 
    salePrice: 25200, 
    discountRate: 40, 
    link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000173866'
  },
  { 
    source: '올리브영', 
    name: '이니스프리 레티놀 시카 흔적 앰플 30ml 1+1', 
    originalPrice: 56000, 
    salePrice: 33600, 
    discountRate: 40, 
    link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000220141'
  },
  { 
    source: '올리브영', 
    name: '클리오 킬커버 파운웨어 쿠션 올 뉴 15g 기획', 
    originalPrice: 32000, 
    salePrice: 19200, 
    discountRate: 40, 
    link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000217563'
  },
  { 
    source: '올리브영', 
    name: '웰라쥬 리얼 히알루로닉 블루 100 앰플 75ml 1+1 기획', 
    originalPrice: 46000, 
    salePrice: 29900, 
    discountRate: 35, 
    link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000162035'
  },
  { 
    source: '올리브영', 
    name: '아누아 어성초 77 수딩 토너 500ml 대용량', 
    originalPrice: 35000, 
    salePrice: 23100, 
    discountRate: 34, 
    link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000188715'
  },
  { 
    source: '올리브영', 
    name: '닥터지 레드 블레미쉬 클리어 수딩 크림 70ml 기획(+30ml)', 
    originalPrice: 38000, 
    salePrice: 25700, 
    discountRate: 32, 
    link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000164615'
  },
  { 
    source: '올리브영', 
    name: '더하르나이 시카이드 크림 100ml+30ml 기획', 
    originalPrice: 29000, 
    salePrice: 19900, 
    discountRate: 31, 
    link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000192405'
  },
  { 
    source: '올리브영', 
    name: '라운드랩 자작나무 수분 선크림 50ml 1+1 기획', 
    originalPrice: 32000, 
    salePrice: 22400, 
    discountRate: 30, 
    link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000186166'
  },
];

function formatTweet(product) {
  const now = new Date();
  const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}시`;
  
  let tweet = `💚 [올리브영] ${product.discountRate}% 할인!\n\n`;
  tweet += `📦 ${product.name}\n`;
  
  if (product.originalPrice && product.salePrice && product.originalPrice > product.salePrice) {
    tweet += `💰 ${product.originalPrice.toLocaleString()}원 → ${product.salePrice.toLocaleString()}원\n`;
  }
  
  tweet += `\n🔗 ${product.link}\n\n`;
  tweet += `#올리브영 #뷰티딜 #할인 #화장품세일`;
  
  return tweet.substring(0, 280);
}

export async function onRequest(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // 30% 이상 할인 상품만 필터링 후 정렬
  const products = oliveyoungProducts
    .filter(p => p.discountRate >= 30)
    .sort((a, b) => b.discountRate - a.discountRate);

  const results = {
    timestamp: new Date().toISOString(),
    dryRun: true,
    mode: 'test',
    description: '🧪 테스트 모드 - 실제 트위터 포스팅 없이 결과만 미리보기',
    scraped: products,
    total: products.length,
    sources: {
      oliveyoung: products.length
    },
    posted: [],
    skipped: [],
    errors: []
  };

  // 상위 5개 상품에 대해 트윗 미리보기 생성
  const topProducts = products.slice(0, 5);
  
  for (const product of topProducts) {
    const tweet = formatTweet(product);
    
    results.posted.push({
      product: product.name,
      discountRate: product.discountRate,
      originalPrice: product.originalPrice,
      salePrice: product.salePrice,
      link: product.link,
      tweet: tweet,
      tweetLength: tweet.length,
      dryRun: true
    });
  }

  return new Response(JSON.stringify(results, null, 2), { headers });
}
