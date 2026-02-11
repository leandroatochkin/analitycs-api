import { FastifyInstance } from "fastify";
import { getMarketGaps } from "../services/getGapOpportunities.service";
import { normalizeLoc } from "../utils/helpers";


export async function gapOpportunitiesData(app: FastifyInstance) {
  app.get(
    "/gap-opportunities",
    {
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (req, reply) => {
      const { q, page = "1", limit = "10" } = req.query as { 
        q: string; 
        page?: string;
        limit?: string;
      };

      if (!q || q.length < 2) return { status: "EMPTY", results: [] };


      const normalizedCity = normalizeLoc(q);

        try{
            const results = await getMarketGaps(normalizedCity)

                if(!results) {
                    return reply.status(204).send({success: true, data: 'No data'})
                } else {
                    return reply.status(200).send({ success: true, data: results})
                }
            } catch(e){
                    return reply.status(500).send({ success: false, error: e})
            }
      
        }
    )
}