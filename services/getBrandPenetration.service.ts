import { prisma } from "../prisma";

export async function getBrandPenetration(
  brandName: string,
  city: string
) {
  const normalizedBrand = brandName.trim().toUpperCase();

  // 1️⃣ Get all stores in the city
  const storesInCity = await prisma.store.findMany({
    where: { city },
    select: { id: true, name: true }
  });

  const totalStores = storesInCity.length;

  if (totalStores === 0) {
    return {
      brand: normalizedBrand,
      city,
      penetrationRate: 0,
      message: "No stores found in this city"
    };
  }

  const storeIds = storesInCity.map(s => s.id);

  // 2️⃣ Products from that brand in that city
  const products = await prisma.product.findMany({
    where: {
      brandName: normalizedBrand,
      storeId: { in: storeIds }
    },
    include: {
      prices: {
        orderBy: { scrapedAt: "desc" },
        take: 30
      }
    }
  });

  if (products.length === 0) {
    return {
      brand: normalizedBrand,
      city,
      penetrationRate: 0,
      storesCarryingBrand: 0,
      totalStores,
      skuCount: 0
    };
  }

  // 3️⃣ Unique stores carrying brand
  const storesWithBrand = new Set(products.map(p => p.storeId));
  const storesCarryingBrand = storesWithBrand.size;

  const penetrationRate =
    (storesCarryingBrand / totalStores) * 100;

  // 4️⃣ Compute pricing analytics
  const allPrices = products.flatMap(p =>
    p.prices.map(pr => pr.price)
  );

  const avgPrice =
    allPrices.reduce((a, b) => a + b, 0) /
    (allPrices.length || 1);

  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);

  const volatility =
    allPrices.length > 1
      ? (maxPrice - minPrice) / avgPrice
      : 0;

  // 5️⃣ Promo frequency
  const promoCount = products.flatMap(p =>
    p.prices.filter(pr => pr.discountPct && pr.discountPct > 0)
  ).length;

  const promoFrequency =
    promoCount / (allPrices.length || 1);

  // 6️⃣ Competitive intensity
  const categoryCounts = await prisma.product.groupBy({
    by: ["category"],
    where: {
      storeId: { in: storeIds }
    },
    _count: { brandName: true }
  });

  const competitiveIntensity =
    categoryCounts.length;

  // 7️⃣ Final Score (0–100)
  const penetrationScore = penetrationRate * 0.4;
  const stabilityScore = (1 - volatility) * 20;
  const promoScore = promoFrequency * 20;
  const skuScore = Math.min(products.length / 50, 1) * 20;

  const brandStrengthScore =
    penetrationScore +
    stabilityScore +
    promoScore +
    skuScore;

  return {
    brand: normalizedBrand,
    city,

    summary: {
      totalStores,
      storesCarryingBrand,
      penetrationRate: Number(penetrationRate.toFixed(2)),
      skuCount: products.length,
      avgPrice: Number(avgPrice.toFixed(2)),
      volatility: Number(volatility.toFixed(3)),
      promoFrequency: Number(promoFrequency.toFixed(3)),
      competitiveIntensity
    },

    brandStrengthScore: Number(
      brandStrengthScore.toFixed(2)
    )
  };
}
