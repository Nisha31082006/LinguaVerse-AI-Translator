import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/errorHandler";
import { getTranslationProvider, AVAILABLE_PROVIDERS } from "./ai/provider.factory";
import { TranslateTextInput } from "../validators/translate.validator";
import { createNotification } from "./notification.service";

export async function translateText(userId: string, input: TranslateTextInput) {
  // Translation Memory: reuse an exact prior translation instead of re-calling the AI
  // provider — but only for plain (no tone/context) requests, since TranslationHistory
  // doesn't record which tone/context produced a given result, so reusing across a
  // tone-specific request risks serving a mismatched translation.
  if (!input.tone && !input.context) {
    const cached = await prisma.translationHistory.findFirst({
      where: { userId, sourceText: input.sourceText, targetLanguage: input.targetLanguage },
      orderBy: { createdAt: "desc" },
    });
    if (cached) return cached;
  }

  const glossaryTerms = await prisma.glossaryTerm.findMany({
    where: { userId, targetLanguage: input.targetLanguage },
    select: { sourceTerm: true, preferredTerm: true },
  });

  const provider = getTranslationProvider();

  const result = await provider.translate({
    sourceText: input.sourceText,
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
    tone: input.tone,
    context: input.context,
    glossaryTerms: glossaryTerms.length > 0 ? glossaryTerms : undefined,
  });

  const saved = await prisma.translationHistory.create({
    data: {
      userId,
      sourceLanguage: result.detectedSourceLanguage ?? input.sourceLanguage ?? "auto",
      targetLanguage: input.targetLanguage,
      sourceText: input.sourceText,
      translatedText: result.translatedText,
      aiProvider: result.provider,
      confidenceScore: result.confidenceScore,
      processingTimeMs: result.processingTimeMs,
    },
  });

  // Fire-and-forget: don't let a notification failure break translation
  createNotification(
    userId,
    "Translation completed",
    `Your translation to ${input.targetLanguage.toUpperCase()} is ready.`,
    "TRANSLATION_COMPLETED",
  ).catch(() => undefined);

  return saved;
}

export async function getHistory(userId: string, page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.translationHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.translationHistory.count({ where: { userId } }),
  ]);

  return { items, total, page, pageSize };
}

export async function deleteTranslation(userId: string, id: string) {
  const record = await prisma.translationHistory.findUnique({ where: { id } });
  if (!record || record.userId !== userId) {
    throw new AppError("Translation not found", 404);
  }
  await prisma.translationHistory.delete({ where: { id } });
}

/**
 * Runs the same translation request against every configured provider in
 * parallel and returns each result (or a per-provider error) so the caller
 * can compare quality/speed. Nothing is persisted to TranslationHistory —
 * this is an exploratory comparison, not a saved translation.
 */
export async function compareProviders(input: {
  sourceText: string;
  sourceLanguage?: string;
  targetLanguage: string;
}) {
  const results = await Promise.allSettled(
    AVAILABLE_PROVIDERS.map(async (name) => {
      const provider = getTranslationProvider(name);
      return provider.translate({
        sourceText: input.sourceText,
        sourceLanguage: input.sourceLanguage,
        targetLanguage: input.targetLanguage,
      });
    }),
  );

  return AVAILABLE_PROVIDERS.map((name, i) => {
    const outcome = results[i];
    if (outcome.status === "fulfilled") {
      return { provider: name, success: true as const, result: outcome.value };
    }
    return {
      provider: name,
      success: false as const,
      error: outcome.reason instanceof Error ? outcome.reason.message : "Unknown error",
    };
  });
}
