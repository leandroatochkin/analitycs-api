export const normalizeLoc = (val?: string) => 
        val?.toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_') || "GENERAL";
      