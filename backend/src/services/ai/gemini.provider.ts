import { getGeminiClient, getGeminiModelName, classifyGeminiError } from "./gemini.client";
import { AppError } from "../../middlewares/errorHandler";
import { TranslationProvider, TranslationRequest, TranslationResult } from "./provider.interface";

const RESPONSE_SCHEMA_INSTRUCTIONS = `
You are a professional translation engine. Respond ONLY with a single JSON object,
no markdown, no code fences, no extra commentary, matching exactly this shape:
{
  "translatedText": string,
  "detectedSourceLanguage": string,
  "confidenceScore": number
}
Translate naturally and idiomatically — preserve meaning, tone, and context.
Do not translate word-by-word. Do not add explanations.
`.trim();

export class GeminiTranslationProvider implements TranslationProvider {
  public readonly name = "gemini";

  async translate(req: TranslationRequest): Promise<TranslationResult> {
    const startedAt = Date.now();
    const client = getGeminiClient();

    const glossaryInstruction =
      req.glossaryTerms && req.glossaryTerms.length > 0
        ? [
            "",
            "The user has specified preferred translations for these terms — use them exactly:",
            ...req.glossaryTerms.map((g) => `- "${g.sourceTerm}" → "${g.preferredTerm}"`),
          ].join("\n")
        : "";

    const userPrompt = [
      `Target language: ${req.targetLanguage}`,
      req.sourceLanguage ? `Source language: ${req.sourceLanguage}` : "Source language: auto-detect",
      req.tone ? `Tone: ${req.tone}` : undefined,
      req.context ? `Context/domain: ${req.context}` : undefined,
      glossaryInstruction || undefined,
      "",
      "Text to translate:",
      req.sourceText,
    ]
      .filter(Boolean)
      .join("\n");

    const model = client.getGenerativeModel({
      model: getGeminiModelName(),
      systemInstruction: RESPONSE_SCHEMA_INSTRUCTIONS,
      generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
    });

    let raw: string;
    try {
      const result = await model.generateContent(userPrompt);
      raw = result.response.text();
    } catch (err) {
      throw classifyGeminiError(err);
    }

    if (!raw) {
      throw new AppError("Gemini API request failed: empty response", 502);
    }

    let parsed: { translatedText: string; detectedSourceLanguage?: string; confidenceScore?: number };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new AppError("Gemini API request failed: response was not valid JSON", 502);
    }

    if (!parsed.translatedText) {
      throw new AppError("Gemini API request failed: response was missing translated text", 502);
    }

    return {
      translatedText: parsed.translatedText,
      detectedSourceLanguage: parsed.detectedSourceLanguage,
      confidenceScore: parsed.confidenceScore,
      provider: this.name,
      processingTimeMs: Date.now() - startedAt,
    };
  }
}
