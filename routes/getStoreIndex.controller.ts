import { FastifyInstance } from "fastify";
import { getStoreIndex } from "../services/getStoreIndex.service";
import { normalizeLoc } from "../utils/helpers";

// This function is what you export to register in your main server file
export async function getStoreIndexData(app: FastifyInstance) {
  
  app.get("/store-index", async (req, reply) => {
    const { q } = req.query as { q: string };

    if (!q || q.length < 2) {
      // Returning an object directly in Fastify defaults to 200 OK
      return { success: true, data: [] }; 
    }

    const normalizedCity = normalizeLoc(q);
    
// Lower priceIndex = cheaper store
// Higher promoFrequency = more aggressive discounts
// Higher coverage = broader assortment
// Higher competitivenessScore = stronger competitive position

    const results = await getStoreIndex(normalizedCity);
    
    return { success: true, data: results || [] };
  });
}