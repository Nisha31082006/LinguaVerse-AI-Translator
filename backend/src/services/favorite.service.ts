import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/errorHandler";

export async function addFavorite(userId: string, translationId: string) {
  const translation = await prisma.translationHistory.findUnique({
    where: { id: translationId },
  });
  if (!translation || translation.userId !== userId) {
    throw new AppError("Translation not found", 404);
  }

  const existing = await prisma.favoriteTranslation.findUnique({
    where: { userId_translationId: { userId, translationId } },
  });
  if (existing) return existing;

  return prisma.favoriteTranslation.create({ data: { userId, translationId } });
}

export async function removeFavorite(userId: string, translationId: string) {
  await prisma.favoriteTranslation
    .delete({ where: { userId_translationId: { userId, translationId } } })
    .catch(() => undefined);
}

export async function listFavorites(userId: string) {
  return prisma.favoriteTranslation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { translation: true },
  });
}
