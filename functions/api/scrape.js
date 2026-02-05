// 샘플 데이터
const sampleProducts = [
  { source: '올리브영', name: '메디힐 에센셜 마스크팩 10+1매 고기능 택1', originalPrice: 20000, salePrice: 10000, discountRate: 50, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000223414' },
  { source: '올리브영', name: '메디큐브 연어 PDRN 핑크 앰플 더블기획', originalPrice: 46000, salePrice: 25900, discountRate: 43, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000214290' },
  { source: '올리브영', name: '에스네이처 아쿠아 스쿠알란 수분크림 더블 기획', originalPrice: 43000, salePrice: 23500, discountRate: 45, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000192782' },
  { source: '예스스타일', name: 'COSRX - Advanced Snail 96 Mucin Power Essence', originalPrice: 25, salePrice: 15, discountRate: 40, link: 'https://www.yesstyle.com/en/cosrx-advanced-snail-96-mucin-power-essence-100ml/info.html/pid.1052684987' },
  { source: '예스스타일', name: 'Beauty of Joseon - Glow Serum', originalPrice: 17, salePrice: 11, discountRate: 35, link: 'https://www.yesstyle.com/en/beauty-of-joseon-glow-serum-30ml/info.html/pid.1090727386' },
  { source: '올리브영', name: '라운드랩 자작나무 수분 선크림 1+1 기획', originalPrice: 25000, salePrice: 17500, discountRate: 30, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000186166' },
  { source: '예스스타일', name: 'SKIN1004 - Madagascar Centella Ampoule', originalPrice: 22, salePrice: 13, discountRate: 41, link: 'https://www.yesstyle.com/en/skin1004-madagascar-centella-ampoule/info.html/pid.1067270134' },
  { source: '올리브영', name: '닥터지 레드 블레미쉬 클리어 수딩 크림 70ml 기획', originalPrice: 38000, salePrice: 25700, discountRate: 32, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000164615' },
];

export async function onRequest(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    // 실제 스크래핑 시도
    const products = await scrapeProducts();
    
    // 스크래핑 결과가 없으면 샘플 데이터 사용
    const finalProducts = products.length > 0 ? products : sampleProducts;
    
    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(),
      scraped: finalProducts,
      total: finalProducts.length,
      note: products.length === 0 ? '⚠️ 스크래핑 결과가 없어 샘플 데이터를 표시합니다.' : null,
      posted: [],
      errors: []
    }, null, 2), { headers });
  } catch (error) {
    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(),
      scraped: sampleProducts,
      total: sampleProducts.length,
      note: '⚠️ 스크래핑 중 오류 발생. 샘플 데이터를 표시합니다.',
      error: error.message,
      posted: [],
      errors: [{ error: error.message }]
    }, null, 2), { headers });
  }
}

async function scrapeProducts() {
  const products = [];
  
  try {
    // 올리브영 스크래핑 시도
    const oyResponse = await fetch('https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=900000100090001&pageIdx=1&rowsPerPage=50', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      }
    });
    
    if (oyResponse.ok) {
      const html = await oyResponse.text();
      // 간단한 파싱 (정규식 사용)
      const matches = html.matchAll(/goodsNo=([A-Z0-9]+).*?(\d+)%/gs);
      for (const match of matches) {
        const goodsNo = match[1];
        const discount = parseInt(match[2]);
        if (discount >= 30) {
          products.push({
            source: '올리브영',
            name: `올리브영 할인 상품 (${goodsNo})`,
            originalPrice: 0,
            salePrice: 0,
            discountRate: discount,
            link: `https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=${goodsNo}`
          });
        }
      }
    }
  } catch (e) {
    console.error('스크래핑 오류:', e);
  }
  
  return products;
}
