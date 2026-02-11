import { prisma } from "../prisma";

type StoreIndexResult = {
  storeId: string;
  storeName: string;
  priceIndex: number;
  avgPrice: number;
  promoFrequency: number;
  productCoverage: number;
  competitivenessScore: number;
};

export async function getStoreIndex(city: string): Promise<StoreIndexResult[]> {
  // 1️⃣ Get stores in city
  const stores = await prisma.store.findMany({
    where: { city },
    select: {
      id: true,
      name: true,
    },
  });

  if (stores.length === 0) {
    return [];
  }

  // 2️⃣ City-wide average price
  const cityAvgResult = await prisma.$queryRaw<
    { city_avg: number | null }[]
  >`
    SELECT AVG(pr."price") as city_avg
    FROM "PriceRecord" pr
    JOIN "Product" p ON p.id = pr."productId"
    JOIN "Store" s ON s.id = p."storeId"
    WHERE s.city = ${city}
  `;

  const cityAvg = Number(cityAvgResult[0]?.city_avg ?? 0);

  if (!cityAvg) {
    return [];
  }

  const intermediateResults: Omit<
    StoreIndexResult,
    "competitivenessScore"
  >[] = [];

  // 3️⃣ Gather per-store metrics
  for (const store of stores) {
    // Store average price
    const storeAvgResult = await prisma.$queryRaw<
      { store_avg: number | null }[]
    >`
      SELECT AVG(pr."price") as store_avg
      FROM "PriceRecord" pr
      JOIN "Product" p ON p.id = pr."productId"
      WHERE p."storeId" = ${store.id}
    `;

    const storeAvg = Number(storeAvgResult[0]?.store_avg ?? 0);

    // Promo frequency
    const promoResult = await prisma.$queryRaw<
      { discounted: bigint; total: bigint }[]
    >`
      SELECT
        COUNT(*) FILTER (
          WHERE pr."discountPct" IS NOT NULL AND pr."discountPct" > 0
        ) as discounted,
        COUNT(*) as total
      FROM "PriceRecord" pr
      JOIN "Product" p ON p.id = pr."productId"
      WHERE p."storeId" = ${store.id}
    `;

    const discounted = Number(promoResult[0]?.discounted ?? 0);
    const total = Number(promoResult[0]?.total ?? 0);

    const promoFrequency = total > 0 ? discounted / total : 0;

    // Product coverage
    const productCoverage = await prisma.product.count({
      where: { storeId: store.id },
    });

    const priceIndex =
      storeAvg > 0 ? (storeAvg / cityAvg) * 100 : 100;

    intermediateResults.push({
      storeId: store.id,
      storeName: store.name,
      priceIndex: Number(priceIndex.toFixed(2)),
      avgPrice: Number(storeAvg.toFixed(2)),
      promoFrequency: Number(promoFrequency.toFixed(3)),
      productCoverage,
    });
  }

  // 4️⃣ Normalize product coverage
  const maxCoverage =
    Math.max(...intermediateResults.map(r => r.productCoverage)) || 1;

  // 5️⃣ Compute competitiveness score
  const finalResults: StoreIndexResult[] = intermediateResults.map(r => {
    const coverageNormalized = r.productCoverage / maxCoverage;

    const competitivenessScore =
      ((100 - r.priceIndex) * 0.6) +
      (r.promoFrequency * 100 * 0.3) +
      (coverageNormalized * 100 * 0.1);

    return {
      ...r,
      competitivenessScore: Number(
        competitivenessScore.toFixed(2)
      ),
    };
  });

  // 6️⃣ Rank descending
  finalResults.sort(
    (a, b) => b.competitivenessScore - a.competitivenessScore
  );

  return finalResults;
}
