import { prisma } from "../prisma";

type Timeframe = "7d" | "30d" | "90d" | "180d";

interface PriceTrendParams {
  productId?: string;
  brand?: string;
  category?: string;
  storeId?: string;
  city?: string;
  timeframe?: Timeframe;
}

export async function getPriceTrends(params: PriceTrendParams) {
  const {
    productId,
    brand,
    category,
    storeId,
    city,
    timeframe = "30d",
  } = params;

  const daysMap: Record<Timeframe, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "180d": 180,
  };

  const startDate = new Date(
    Date.now() - daysMap[timeframe] * 24 * 60 * 60 * 1000
  );

  // Build dynamic where clause
  const where: any = {
    scrapedAt: { gte: startDate },
  };

  if (productId) where.productId = productId;

  if (brand || category || storeId || city) {
    where.product = {};
    if (brand) where.product.brandName = brand;
    if (category) where.product.category = category;
    if (storeId) where.product.storeId = storeId;
    if (city) where.product.store = { city };
  }

  const priceRecords = await prisma.priceRecord.findMany({
    where,
    include: {
      product: {
        include: {
          store: true,
        },
      },
    },
    orderBy: { scrapedAt: "asc" },
  });

  if (priceRecords.length === 0) {
    return {
      status: "NO_DATA",
      dataPoints: [],
    };
  }

  const prices = priceRecords.map((p) => p.price);

  const averagePrice =
    prices.reduce((a, b) => a + b, 0) / prices.length;

  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);

  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];

  const priceChangePct =
    ((lastPrice - firstPrice) / firstPrice) * 100;

  // Standard deviation
  const variance =
    prices.reduce((sum, p) => sum + Math.pow(p - averagePrice, 2), 0) /
    prices.length;

  const stdDev = Math.sqrt(variance);

  const volatilityScore = stdDev / averagePrice;

  // Momentum = acceleration between first half and second half
  const midIndex = Math.floor(prices.length / 2);
  const firstHalfAvg =
    prices.slice(0, midIndex).reduce((a, b) => a + b, 0) /
    midIndex;

  const secondHalfAvg =
    prices.slice(midIndex).reduce((a, b) => a + b, 0) /
    (prices.length - midIndex);

  const momentumScore =
    ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

  let trendDirection: "UP" | "DOWN" | "STABLE" = "STABLE";

  if (priceChangePct > 2) trendDirection = "UP";
  else if (priceChangePct < -2) trendDirection = "DOWN";

  const stabilityScore = 1 - volatilityScore;

  return {
    status: "OK",
    timeframe,
    summary: {
      averagePrice: Number(averagePrice.toFixed(2)),
      lowestPrice,
      highestPrice,
      priceChangePct: Number(priceChangePct.toFixed(2)),
      volatilityScore: Number(volatilityScore.toFixed(4)),
      momentumScore: Number(momentumScore.toFixed(2)),
      stabilityScore: Number(stabilityScore.toFixed(4)),
      trendDirection,
      dataPointsCount: prices.length,
    },
    meta: {
      productCount: new Set(priceRecords.map(p => p.productId)).size,
      storeCount: new Set(priceRecords.map(p => p.product.storeId)).size,
    },
    dataPoints: priceRecords.map((p) => ({
      date: p.scrapedAt,
      price: p.price,
      storeId: p.product.storeId,
      productId: p.productId,
    })),
  };
}
