import fsp from "fs/promises";
import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/errorHandler";
import { getTranslationProvider } from "./ai/provider.factory";
import { transcribeLocalWav } from "./ai/whisper.local";
import { createNotification } from "./notification.service";

interface TranscribeOptions {
  targetLanguage?: string;
}

export async function transcribeAudio(
  userId: string,
  file: { path: string; originalname: string },
  options: TranscribeOptions,
) {
  const startedAt = Date.now();

  let transcript: string;
  try {
    transcript = await transcribeLocalWav(file.path);
  } finally {
    await fsp.unlink(file.path).catch(() => undefined);
  }

  if (!transcript) {
    throw new AppError("No speech could be detected in this audio", 422);
  }

  let translatedText: string | undefined;
  if (options.targetLanguage) {
    const provider = getTranslationProvider();
    const result = await provider.translate({
      sourceText: transcript,
      targetLanguage: options.targetLanguage,
    });
    translatedText = result.translatedText;
  }

  const saved = await prisma.voiceHistory.create({
    data: {
      userId,
      originalFileName: file.originalname,
      transcript,
      translatedText,
      targetLanguage: options.targetLanguage,
      aiProvider: "whisper-local",
      processingTimeMs: Date.now() - startedAt,
    },
  });

  createNotification(
    userId,
    "Transcription completed",
    `Your audio "${file.originalname}" has been transcribed${translatedText ? " and translated" : ""}.`,
    "TRANSLATION_COMPLETED",
  ).catch(() => undefined);

  return saved;
}

export async function getVoiceHistory(userId: string, page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.voiceHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.voiceHistory.count({ where: { userId } }),
  ]);
  return { items, total, page, pageSize };
}

// NOTE: text-to-speech was previously an OpenAI TTS call. It's been removed
// entirely — the frontend now uses the browser's built-in Web Speech API
// (window.speechSynthesis) for playback, which is free, needs no backend
// call at all, and works offline. See frontend/src/pages/SpeechPage.tsx.
