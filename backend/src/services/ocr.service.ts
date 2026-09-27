import Tesseract from "tesseract.js";
import fs from "fs/promises";
import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/errorHandler";
import { getTranslationProvider } from "./ai/provider.factory";
import { createNotification } from "./notification.service";

interface OcrOptions {
  targetLanguage?: string;
}

export async function processImage(
  userId: string,
  file: { path: string; originalname: string },
  options: OcrOptions,
) {
  const startedAt = Date.now();

  let extractedText: string;
  let confidenceScore: number;

  try {
    const result = await Tesseract.recognize(file.path, "eng");
    extractedText = result.data.text.trim();
    confidenceScore = result.data.confidence / 100;
  } catch (err) {
    await fs.unlink(file.path).catch(() => undefined);
    const message = err instanceof Error ? err.message : "Unknown error";
    throw new AppError(`Failed to extract text from the image: ${message}`, 502);
  }

  // Clean up the uploaded file — we only persist the extracted text, not the image
  await fs.unlink(file.path).catch(() => undefined);

  if (!extractedText) {
    throw new AppError("No text could be detected in this image", 422);
  }

  let translatedText: string | undefined;

  if (options.targetLanguage) {
    const provider = getTranslationProvider();
    const translation = await provider.translate({
      sourceText: extractedText,
      targetLanguage: options.targetLanguage,
    });
    translatedText = translation.translatedText;
  }

  const saved = await prisma.ocrHistory.create({
    data: {
      userId,
      originalFileName: file.originalname,
      extractedText,
      translatedText,
      targetLanguage: options.targetLanguage,
      confidenceScore,
      processingTimeMs: Date.now() - startedAt,
    },
  });

  createNotification(
    userId,
    "OCR extraction completed",
    `Text extracted from "${file.originalname}"${translatedText ? " and translated" : ""}.`,
    "TRANSLATION_COMPLETED",
  ).catch(() => undefined);

  return saved;
}

export async function getOcrHistory(userId: string, page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.ocrHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.ocrHistory.count({ where: { userId } }),
  ]);
  return { items, total, page, pageSize };
}
