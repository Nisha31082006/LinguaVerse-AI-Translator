import OpenAI from "openai";
import { env } from "../../config/env";
import { AppError } from "../../middlewares/errorHandler";
import { TranslationProvider, TranslationRequest, TranslationResult } from "./provider.interface";

const RESPONSE_SCHEMA_INSTRUCTIONS = `
You are a professional translation engine. Respond ONLY with a single JSON object,
no markdown, no code fences, no extra commentary, matching exactly this shape:
{
  "translatedText": string,
  "detectedSourceLanguage": string,   // ISO 639-1 code, your best guess if not given
  "confidenceScore": number           // 0 to 1
}
Translate naturally and idiomatically — preserve meaning, tone, and context.
Do not translate word-by-word. Do not add explanations.
`.trim();

export class OpenAITranslationProvider implements TranslationProvider {
  public readonly name = "openai";
  private client: OpenAI;

  constructor() {
    if (!env.OPENAI_API_KEY) {
      throw new AppError(
        "OPENAI_API_KEY is not configured on the server. Set it in backend/.env to enable translation.",
        503,
      );
    }
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  async translate(req: TranslationRequest): Promise<TranslationResult> {
    const startedAt = Date.now();

    const glossaryInstruction =
      req.glossaryTerms && req.glossaryTerms.length > 0
        ? [
            "",
            "The user has specified preferred translations for these terms — use them exactly, even if a different literal translation would normally apply:",
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

    let completion;
    try {
      completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: RESPONSE_SCHEMA_INSTRUCTIONS },
          { role: "user", content: userPrompt },
        ],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      throw new AppError(`OpenAI request failed: ${message}`, 502);
    }

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new AppError("Translation provider returned an empty response", 502);
    }

    let parsed: { translatedText: string; detectedSourceLanguage?: string; confidenceScore?: number };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new AppError("Translation provider returned an unparseable response", 502);
    }

    if (!parsed.translatedText) {
      throw new AppError("Translation provider response was missing translated text", 502);
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
