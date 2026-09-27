export interface GlossaryHint {
  sourceTerm: string;
  preferredTerm: string;
}

export interface TranslationRequest {
  sourceText: string;
  sourceLanguage?: string; // omitted/"auto" -> provider should detect
  targetLanguage: string;
  tone?: "formal" | "informal" | "professional" | "casual" | "academic";
  context?: string; // e.g. "medical", "legal", "general"
  glossaryTerms?: GlossaryHint[]; // user's preferred translations for specific terms
}

export interface TranslationResult {
  translatedText: string;
  detectedSourceLanguage?: string;
  confidenceScore?: number; // 0-1
  provider: string;
  processingTimeMs: number;
}

export interface TranslationProvider {
  readonly name: string;
  translate(req: TranslationRequest): Promise<TranslationResult>;
}
