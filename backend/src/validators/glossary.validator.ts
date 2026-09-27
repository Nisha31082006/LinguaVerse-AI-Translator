import { z } from "zod";

export const createGlossaryTermSchema = z.object({
  sourceTerm: z.string().min(1).max(200),
  preferredTerm: z.string().min(1).max(200),
  targetLanguage: z.string().min(2).max(10),
  notes: z.string().max(500).optional(),
});
