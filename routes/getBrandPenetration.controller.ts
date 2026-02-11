import { FastifyInstance } from "fastify";
import { getBrandPenetration } from "../services/getBrandPenetration.service";
import { normalizeLoc } from "../utils/helpers";


// This function is what you export to register in your main server file
export async function getBrandPenetrationData(app: FastifyInstance) {
  
  app.get("/brand-penetration", async (req, reply) => {
    const {
        brandName,
        city
      } = req.query as {
        brandName: string;
        city: string;
      };



     if (!brandName || !city) {
        return reply.status(400).send({
          success: false,
          message: "Brand and city are required.",
        });
      }

    const normalizedCity = normalizeLoc(city)

    /**
     * How to Interpret Output
            ///Penetration Rate///
            % of stores in city carrying brand
            80%+ → dominant
            40–60% → moderate presence
            <20% → expansion opportunity
            ///Volatility///
            Price instability
            <0.1 → stable
            0.1–0.3 → moderate
            0.3 → aggressive price competition
            ///Promo Frequency///
            % of price records with discount
            High → brand pushing volume
            Low → premium positioning
            ///Brand Strength Score (0–100)///
            Composite metric combining:
            Distribution
            Stability
            SKU depth
            Promo activity
            This is something you can rank brands with.
     */

    const results = await getBrandPenetration(
        brandName,
        normalizedCity
      );
    
    return { success: true, data: results || [] };
  });
}