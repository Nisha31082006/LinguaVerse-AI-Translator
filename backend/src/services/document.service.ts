import fs from "fs/promises";
import path from "path";
import mammoth from "mammoth";
import { Document, Packer, Paragraph } from "docx";
import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/errorHandler";
import { getTranslationProvider } from "./ai/provider.factory";
import { createNotification } from "./notification.service";

const GENERATED_DIR = path.join(__dirname, "../../uploads/generated");
const MAX_DOCUMENT_CHARS = 20000;

async function ensureGeneratedDir() {
  await fs.mkdir(GENERATED_DIR, { recursive: true });
}

async function extractText(filePath: string, mimeType: string): Promise<string> {
  if (mimeType === "text/plain") {
    return (await fs.readFile(filePath, "utf-8")).trim();
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value.trim();
  }

  throw new AppError(`Unsupported document type: ${mimeType}`, 400);
}

async function buildTranslatedDocx(translatedText: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: translatedText
          .split(/\n+/)
          .filter((line) => line.length > 0)
          .map((line) => new Paragraph({ text: line })),
      },
    ],
  });
  return Packer.toBuffer(doc);
}

export async function translateDocument(
  userId: string,
  file: { path: string; originalname: string; mimetype: string },
  targetLanguage: string,
) {
  const startedAt = Date.now();

  let sourceText: string;
  try {
    sourceText = await extractText(file.path, file.mimetype);
  } finally {
    await fs.unlink(file.path).catch(() => undefined);
  }

  if (!sourceText) {
    throw new AppError("No text could be extracted from this document", 422);
  }
  if (sourceText.length > MAX_DOCUMENT_CHARS) {
    throw new AppError(
      `Document is too long (${sourceText.length} characters). Max supported is ${MAX_DOCUMENT_CHARS} — this MVP translates in a single pass without chunking.`,
      413,
    );
  }

  const provider = getTranslationProvider();
  const result = await provider.translate({
    sourceText,
    targetLanguage,
  });

  await ensureGeneratedDir();
  const downloadFileName = `translated-${Date.now()}.docx`;
  const outputBuffer = await buildTranslatedDocx(result.translatedText);
  await fs.writeFile(path.join(GENERATED_DIR, downloadFileName), outputBuffer);

  const saved = await prisma.documentTranslation.create({
    data: {
      userId,
      originalFileName: file.originalname,
      fileType: file.mimetype,
      sourceText,
      translatedText: result.translatedText,
      targetLanguage,
      downloadFileName,
      aiProvider: result.provider,
      processingTimeMs: Date.now() - startedAt,
    },
  });

  createNotification(
    userId,
    "Document translation completed",
    `"${file.originalname}" has been translated to ${targetLanguage.toUpperCase()}.`,
    "TRANSLATION_COMPLETED",
  ).catch(() => undefined);

  return saved;
}

export async function getDocumentHistory(userId: string, page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.documentTranslation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        originalFileName: true,
        fileType: true,
        targetLanguage: true,
        downloadFileName: true,
        createdAt: true,
      },
    }),
    prisma.documentTranslation.count({ where: { userId } }),
  ]);
  return { items, total, page, pageSize };
}

export async function getDownloadPath(userId: string, id: string): Promise<{ filePath: string; fileName: string }> {
  const record = await prisma.documentTranslation.findUnique({ where: { id } });
  if (!record || record.userId !== userId) {
    throw new AppError("Document translation not found", 404);
  }
  return {
    filePath: path.join(GENERATED_DIR, record.downloadFileName),
    fileName: record.downloadFileName,
  };
}
