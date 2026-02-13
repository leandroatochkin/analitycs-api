import { FastifyInstance } from "fastify";
import { getDemandForecast } from "../services/getDemandForecast.service";
import { normalizeLoc } from "../utils/helpers";

// This function is what you export to register in your main server file
export async function getDemandForecastData(app: FastifyInstance) {
  
  app.get("/demand-forecast", async (req, reply) => {
    const {
        entity,
        city
      } = req.query as {
        entity: string;
        city: string;
      };



     if (!entity && !city) {
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


    const results = await getDemandForecast(
        entity,
        city
      );
    
    return { success: true, data: results || [] };
  });
}