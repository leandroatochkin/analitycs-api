export const normalizeLoc = (val?: string) => 
        val?.toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_') || "GENERAL";

// utils/tryCatcher.ts
export const catchAsync = (fn: Function) => {
  return async (req: any, reply: any) => {
    try {
      const results = await fn(req);
      if (!results) {
        return reply.status(200).send({ success: true, data: [] }); // Avoid 204 if sending a body
      }
      return reply.status(200).send({ success: true, data: results });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e.message });
    }
  };
};

      