import { z } from "zod";

export const translateTextSchema = z.object({
  sourceText: z.string().min(1).max(5000),
  sourceLanguage: z.string().optional(),
  targetLanguage: z.string().min(2),
  tone: z.enum(["formal", "informal", "professional", "casual", "academic"]).optional(),
  context: z.string().optional(),
});

export type TranslateTextInput = z.infer<typeof translateTextSchema>;
