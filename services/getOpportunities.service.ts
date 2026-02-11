import { prisma } from '../prisma';

export async function getOpportunities(city: string) {
  // 1️⃣ Get top searched queries in city
  const searchData = await prisma.searchTrend.groupBy({
    by: ['query'],
    where: { city },
    _count: { query: true },
    orderBy: {
      _count: { query: 'desc' }
    },
    take: 20
  });

  const opportunities = [];

  for (const item of searchData) {
    const query = item.query;
    const searchVolume = item._count.query;

    // 2️⃣ Product availability
    const productCount = await prisma.product.count({
      where: {
        name: {
          contains: query.split(' ')[0],
          mode: 'insensitive'
        }
      }
    });

    // Avoid division by zero
    const availabilityScore = productCount > 0
      ? 1 / productCount
      : 1;

    // 3️⃣ Price volatility (raw SQL for aggregation)
    const volatilityResult: any = await prisma.$queryRaw`
      SELECT
        MAX("price") as max_price,
        MIN("price") as min_price,
        AVG("price") as avg_price
      FROM "PriceRecord" pr
      JOIN "Product" p ON p.id = pr."productId"
      WHERE p.name ILIKE ${'%' + query.split(' ')[0] + '%'}
    `;

    const maxPrice = Number(volatilityResult[0]?.max_price || 0);
    const minPrice = Number(volatilityResult[0]?.min_price || 0);
    const avgPrice = Number(volatilityResult[0]?.avg_price || 0);

    let volatilityScore = 0;

    if (avgPrice > 0) {
      volatilityScore = (maxPrice - minPrice) / avgPrice;
    }

    // 4️⃣ Opportunity Score
    const opportunityScore =
      (searchVolume * 0.5) +
      (availabilityScore * 100 * 0.3) +
      (volatilityScore * 100 * 0.2);

    opportunities.push({
      query,
      searchVolume,
      productCount,
      avgPrice,
      volatilityScore: Number(volatilityScore.toFixed(3)),
      opportunityScore: Number(opportunityScore.toFixed(2))
    });
  }

  // 5️⃣ Rank descending
  opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);

  return opportunities;
}
