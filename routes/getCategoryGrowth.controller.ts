import { FastifyInstance } from "fastify";
import { getCategoryGrowth } from "../services/getCategoryGrowth.service";
import { normalizeLoc } from "../utils/helpers";

// This function is what you export to register in your main server file
export async function getCategoryGrowthData(app: FastifyInstance) {
  
  app.get("/category-growth", async (req, reply) => {
    const {
        category,
        city
      } = req.query as {
        category: string;
        city: string;
      };



     if (!category && !city) {
        return reply.status(400).send({
          success: false,
          message: "At least one filter is required",
        });
      }

    /**
     * How To Interpret Output
        ///HIGH_GROWTH
        Demand increasing
        SKUs expanding
        Revenue rising
        Stable pricing
        Investor signal.
        ///MODERATE_GROWTH///
        Healthy but not explosive.
        ///STABLE///
        Flat category.
        ///DECLINING///
        Demand down or unstable pricing.
     */


    const results = await getCategoryGrowth(
        category,
        city
      );
    
    return { success: true, data: results || [] };
  });
}