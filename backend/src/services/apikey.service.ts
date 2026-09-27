import crypto from "crypto";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/errorHandler";

const SALT_ROUNDS = 10;
const PREFIX_LENGTH = 12;

function generateRawKey(): string {
  // "lv_" + 32 random hex chars — e.g. lv_9f2a...  Prefixed so leaked keys are
  // greppable/identifiable in logs, same pattern as Stripe/OpenAI keys.
  return `lv_${crypto.randomBytes(24).toString("hex")}`;
}

export async function createApiKey(userId: string, name: string) {
  const rawKey = generateRawKey();
  const keyPrefix = rawKey.slice(0, PREFIX_LENGTH);
  const keyHash = await bcrypt.hash(rawKey, SALT_ROUNDS);

  const record = await prisma.apiKey.create({
    data: { userId, name, keyPrefix, keyHash },
  });

  // The raw key is returned ONLY here — it is never retrievable again after this response.
  return { id: record.id, name: record.name, key: rawKey, createdAt: record.createdAt };
}

export async function listApiKeys(userId: string) {
  const keys = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      revoked: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
  return keys.map((k) => ({ ...k, maskedKey: `${k.keyPrefix}${"•".repeat(20)}` }));
}

export async function revokeApiKey(userId: string, id: string) {
  const key = await prisma.apiKey.findUnique({ where: { id } });
  if (!key || key.userId !== userId) {
    throw new AppError("API key not found", 404);
  }
  await prisma.apiKey.update({ where: { id }, data: { revoked: true } });
}

/** Verifies a raw API key from a request header and returns the owning user's id, or null. */
export async function verifyApiKey(rawKey: string): Promise<{ userId: string; keyId: string } | null> {
  if (!rawKey.startsWith("lv_")) return null;

  const keyPrefix = rawKey.slice(0, PREFIX_LENGTH);
  const candidates = await prisma.apiKey.findMany({
    where: { keyPrefix, revoked: false },
  });

  for (const candidate of candidates) {
    const matches = await bcrypt.compare(rawKey, candidate.keyHash);
    if (matches) {
      // Fire-and-forget usage tracking — never block the request on this write
      prisma.apiKey
        .update({ where: { id: candidate.id }, data: { lastUsedAt: new Date() } })
        .catch(() => undefined);
      return { userId: candidate.userId, keyId: candidate.id };
    }
  }

  return null;
}
