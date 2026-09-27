import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/errorHandler";

export async function listGlossaryTerms(userId: string, targetLanguage?: string) {
  return prisma.glossaryTerm.findMany({
    where: { userId, ...(targetLanguage ? { targetLanguage } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

export async function addGlossaryTerm(
  userId: string,
  input: { sourceTerm: string; preferredTerm: string; targetLanguage: string; notes?: string },
) {
  const existing = await prisma.glossaryTerm.findUnique({
    where: {
      userId_sourceTerm_targetLanguage: {
        userId,
        sourceTerm: input.sourceTerm,
        targetLanguage: input.targetLanguage,
      },
    },
  });
  if (existing) {
    throw new AppError(
      `A glossary entry for "${input.sourceTerm}" → ${input.targetLanguage} already exists`,
      409,
    );
  }

  return prisma.glossaryTerm.create({ data: { userId, ...input } });
}

export async function deleteGlossaryTerm(userId: string, id: string) {
  const term = await prisma.glossaryTerm.findUnique({ where: { id } });
  if (!term || term.userId !== userId) {
    throw new AppError("Glossary term not found", 404);
  }
  await prisma.glossaryTerm.delete({ where: { id } });
}
