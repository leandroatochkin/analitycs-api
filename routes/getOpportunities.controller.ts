import { FastifyInstance } from "fastify";
import { getOpportunities } from "../services/getOpportunities.service";
import { normalizeLoc } from "../utils/helpers";

// This function is what you export to register in your main server file
export async function getOpportunitiesData(app: FastifyInstance) {
  
  app.get("/opportunities", async (req, reply) => {
    const { q } = req.query as { q: string };

    if (!q || q.length < 2) {
      // Returning an object directly in Fastify defaults to 200 OK
      return { success: true, data: [] }; 
    }

    const normalizedCity = normalizeLoc(q);
    
    // If getMarketGaps throws an error, Fastify's default 
    // or custom ErrorHandler will catch it automatically.
    const results = await getOpportunities(normalizedCity);
    
    return { success: true, data: results || [] };
  });
}