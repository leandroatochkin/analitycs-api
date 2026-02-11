import { FastifyInstance } from "fastify";
import { getPriceTrends } from "../services/getPriceTrends.service";
import { normalizeLoc } from "../utils/helpers";

// This function is what you export to register in your main server file
export async function getPriceTrendsData(app: FastifyInstance) {
  
  app.get("/price-trends", async (req, reply) => {
    const {
        productId,
        brand,
        category,
        storeId,
        city,
        timeframe
      } = req.query as {
        productId?: string;
        brand?: string;
        category?: string;
        storeId?: string;
        city?: string;
        timeframe?: "7d" | "30d" | "90d" | "180d";
      };



     if (!productId && !brand && !category && !storeId && !city) {
        return reply.status(400).send({
          success: false,
          message: "At least one filter is required",
        });
      }


    const results = await getPriceTrends({
        productId,
        brand,
        category,
        storeId,
        city,
        timeframe,
      });
    
    return { success: true, data: results || [] };
  });
}