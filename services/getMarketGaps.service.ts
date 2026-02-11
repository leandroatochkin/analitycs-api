import { prisma } from '../prisma';

export async function getMarketGaps(city: string) {
  // 1. Identify the "Unmet Demand" (High volume searches with 0 results)
  const gaps = await prisma.searchTrend.groupBy({
    by: ['query'],
    where: {
      city: city,
      resultsCount: 0
    },
    _count: {
      query: true
    },
    orderBy: {
      _count: {
        query: 'desc'
      }
    },
    take: 10
  });

  // 2. Generate Recommendations for each gap
  const recommendations = await Promise.all(gaps.map(async (gap) => {
    // Look for products that are "close" in name to provide a fallback
    const alternatives = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: gap.query.split(' ')[0], mode: 'insensitive' } },
          { category: { contains: gap.query, mode: 'insensitive' } }
        ]
      },
      include: {
        prices: { orderBy: { scrapedAt: 'desc' }, take: 1 }
      },
      take: 3
    });

    return {
      searchedItem: gap.query,
      searchVolume: gap._count.query,
      status: "MARKET_GAP",
      suggestedAlternatives: alternatives.map(a => ({
        name: a.name,
        price: a.prices[0]?.price,
        storeId: a.storeId
      }))
    };
  }));

  return recommendations;
}