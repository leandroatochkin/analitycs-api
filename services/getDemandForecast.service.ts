import { prisma } from "../prisma";

type ForecastResult = {
  entity: string;
  city: string;
  currentDemandLevel: number;
  previousDemandLevel: number;
  momentum: number;
  volatility: number;
  forecastNext30Days: number;
  trend: "ACCELERATING" | "DECLINING" | "STABLE";
  confidence: number;
};

export async function getDemandForecast(
  entity: string,
  city: string
): Promise<ForecastResult | null> {
  const now = new Date();

  const last30Start = new Date(now);
  last30Start.setDate(now.getDate() - 30);

  const prev30Start = new Date(now);
  prev30Start.setDate(now.getDate() - 60);

  // 1️⃣ Fetch 60 days of demand data
  const data = await prisma.searchTrend.findMany({
    where: {
      city,
      query: {
        contains: entity,
        mode: "insensitive",
      },
      timestamp: {
        gte: prev30Start,
      },
    },
    orderBy: {
      timestamp: "asc",
    },
  });

  if (data.length === 0) return null;

  // 2️⃣ Split periods
  const last30 = data.filter(d => d.timestamp >= last30Start);
  const previous30 = data.filter(
    d => d.timestamp >= prev30Start && d.timestamp < last30Start
  );

  const sum = (arr: number[]) =>
    arr.reduce((a, b) => a + b, 0);

  const last30Volume = sum(last30.map(d => d.resultsCount));
  const previous30Volume = sum(previous30.map(d => d.resultsCount));

  // 3️⃣ Momentum (growth rate)
  const momentum =
    previous30Volume === 0
      ? 1
      : (last30Volume - previous30Volume) /
        previous30Volume;

  // 4️⃣ Volatility (coefficient of variation)
  const volumes = last30.map(d => d.resultsCount);

  const mean =
    volumes.length > 0
      ? sum(volumes) / volumes.length
      : 0;

  const variance =
    volumes.length > 0
      ? volumes.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
        volumes.length
      : 0;

  const stdDev = Math.sqrt(variance);

  const volatility =
    mean === 0 ? 0 : stdDev / mean;

  // 5️⃣ Weekly velocity
  const weeklyVelocity =
    last30Volume / 4;

  // 6️⃣ Forecast model
  // momentum-weighted projection with volatility dampening

  const forecastNext30Days =
    Math.round(
      last30Volume *
        (1 + momentum * (1 - volatility))
    );

  // 7️⃣ Trend classification
  let trend: ForecastResult["trend"] = "STABLE";

  if (momentum > 0.15) trend = "ACCELERATING";
  if (momentum < -0.15) trend = "DECLINING";

  // 8️⃣ Confidence score
  // lower volatility + strong data = higher confidence

  const confidenceRaw =
    (1 - volatility) *
    Math.min(1, last30Volume / 500);

  const confidence = Math.max(
    0,
    Math.min(1, confidenceRaw)
  );

  return {
    entity,
    city,
    currentDemandLevel: last30Volume,
    previousDemandLevel: previous30Volume,
    momentum,
    volatility,
    forecastNext30Days,
    trend,
    confidence,
  };
}
