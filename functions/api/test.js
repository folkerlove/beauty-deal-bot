// 샘플 데이터
const sampleProducts = [
  { source: '올리브영', name: '메디힐 에센셜 마스크팩 10+1매 고기능 택1', originalPrice: 20000, salePrice: 10000, discountRate: 50, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000223414' },
  { source: '올리브영', name: '메디큐브 연어 PDRN 핑크 앰플 더블기획', originalPrice: 46000, salePrice: 25900, discountRate: 43, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000214290' },
  { source: '올리브영', name: '에스네이처 아쿠아 스쿠알란 수분크림 더블 기획', originalPrice: 43000, salePrice: 23500, discountRate: 45, link: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000192782' },
  { source: '예스스타일', name: 'COSRX - Advanced Snail 96 Mucin Power Essence', originalPrice: 25, salePrice: 15, discountRate: 40, link: 'https://www.yesstyle.com/en/cosrx-advanced-snail-96-mucin-power-essence-100ml/info.html/pid.1052684987' },
  { source: '예스스타일', name: 'Beauty of Joseon - Glow Serum', originalPrice: 17, salePrice: 11, discountRate: 35, link: 'https://www.yesstyle.com/en/beauty-of-joseon-glow-serum-30ml/info.html/pid.1090727386' },
];

function formatTweet(product) {
  const emoji = product.source === '올리브영' ? '💚' : '💜';
  const now = new Date();
  const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}시`;
  
  let tweet = `${emoji} [${product.source}] ${product.discountRate}% 할인!\n\n📦 ${product.name}\n`;
  
  if (product.originalPrice && product.salePrice && product.originalPrice > product.salePrice) {
    tweet += product.source === '올리브영' 
      ? `💰 ${product.originalPrice.toLocaleString()}원 → ${product.salePrice.toLocaleString()}원\n`
      : `💰 $${product.originalPrice} → $${product.salePrice}\n`;
  }
  
  tweet += `\n🔗 ${product.link}\n\n#뷰티딜 #할인 #${product.source.replace(/\s/g, '')}`;
  
  return tweet.substring(0, 280);
}

export async function onRequest(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // 테스트 모드 (Dry Run)
  const products = sampleProducts.sort((a, b) => b.discountRate - a.discountRate).slice(0, 5);
  
  const posted = products.map(product => ({
    product: product.name,
    discountRate: product.discountRate,
    tweet: formatTweet(product),
    dryRun: true
  }));

  return new Response(JSON.stringify({
    timestamp: new Date().toISOString(),
    dryRun: true,
    scraped: sampleProducts,
    posted: posted,
    skipped: [],
    errors: [],
    note: '🧪 테스트 모드 - 실제 트윗은 발송되지 않았습니다.'
  }, null, 2), { headers });
}
