import { prisma } from "../prisma";

export async function getCategoryGrowth(
  category: string,
  city: string
) {
  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const prev30 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // 1️⃣ Search demand growth
  const currentSearch = await prisma.searchTrend.count({
    where: {
      city,
      query: { contains: category, mode: "insensitive" },
      timestamp: { gte: last30 }
    }
  });

  const previousSearch = await prisma.searchTrend.count({
    where: {
      city,
      query: { contains: category, mode: "insensitive" },
      timestamp: { gte: prev30, lt: last30 }
    }
  });

  const searchGrowth =
    previousSearch === 0
      ? currentSearch
      : (currentSearch - previousSearch) / previousSearch;

  // 2️⃣ SKU growth
  const currentProducts = await prisma.product.count({
    where: {
      category: { contains: category, mode: "insensitive" },
      store: { city }
    }
  });

  // Simulate historical SKU count (approx via price records older than 30 days)
  const previousProducts = await prisma.product.count({
    where: {
      category: { contains: category, mode: "insensitive" },
      store: { city },
      prices: {
        some: {
          scrapedAt: { lt: last30 }
        }
      }
    }
  });

  const skuGrowth =
    previousProducts === 0
      ? currentProducts
      : (currentProducts - previousProducts) / previousProducts;

  // 3️⃣ Revenue estimation (price × search volume proxy)
  const currentRevenueData = await prisma.priceRecord.findMany({
    where: {
      product: {
        category: { contains: category, mode: "insensitive" },
        store: { city }
      },
      scrapedAt: { gte: last30 }
    },
    select: { price: true }
  });

  const previousRevenueData = await prisma.priceRecord.findMany({
    where: {
      product: {
        category: { contains: category, mode: "insensitive" },
        store: { city }
      },
      scrapedAt: { gte: prev30, lt: last30 }
    },
    select: { price: true }
  });

  const avg = (arr: number[]) =>
    arr.reduce((a, b) => a + b, 0) / (arr.length || 1);

  const currentAvgPrice = avg(currentRevenueData.map(p => p.price));
  const previousAvgPrice = avg(previousRevenueData.map(p => p.price));

  const revenueGrowth =
    previousAvgPrice === 0
      ? currentAvgPrice
      : (currentAvgPrice - previousAvgPrice) / previousAvgPrice;

  // 4️⃣ Volatility shift
  const volatility = (arr: number[]) => {
    const mean = avg(arr);
    const variance =
      avg(arr.map(v => Math.pow(v - mean, 2)));
    return Math.sqrt(variance);
  };

  const currentVolatility = volatility(
    currentRevenueData.map(p => p.price)
  );

  const previousVolatility = volatility(
    previousRevenueData.map(p => p.price)
  );

  const volatilityChange =
    previousVolatility === 0
      ? currentVolatility
      : (currentVolatility - previousVolatility) /
        previousVolatility;

  // 5️⃣ Composite Growth Score (0–100)

  const demandScore = searchGrowth * 30;
  const supplyScore = skuGrowth * 20;
  const revenueScore = revenueGrowth * 30;
  const stabilityPenalty = volatilityChange * 20;

  const growthScore =
    demandScore +
    supplyScore +
    revenueScore -
    stabilityPenalty;

  return {
    category,
    city,

    metrics: {
      searchGrowth: Number(searchGrowth.toFixed(3)),
      skuGrowth: Number(skuGrowth.toFixed(3)),
      revenueGrowth: Number(revenueGrowth.toFixed(3)),
      volatilityChange: Number(volatilityChange.toFixed(3))
    },

    score: Number(growthScore.toFixed(2)),

    interpretation:
      growthScore > 40
        ? "HIGH_GROWTH"
        : growthScore > 10
        ? "MODERATE_GROWTH"
        : growthScore > -10
        ? "STABLE"
        : "DECLINING"
  };
}
