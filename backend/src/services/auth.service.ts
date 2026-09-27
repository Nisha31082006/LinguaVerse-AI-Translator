import bcrypt from "bcrypt";
import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/errorHandler";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  expiryStringToDate,
} from "../utils/jwt";
import { env } from "../config/env";
import { LoginInput, RegisterInput } from "../validators/auth.validator";

const SALT_ROUNDS = 12;

interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

async function issueTokens(userId: string, email: string, meta: SessionMeta) {
  const accessToken = signAccessToken({ sub: userId, email });
  const refreshToken = signRefreshToken({ sub: userId, email });

  await prisma.userSession.create({
    data: {
      userId,
      refreshToken,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt: expiryStringToDate(env.JWT_REFRESH_EXPIRY),
    },
  });

  return { accessToken, refreshToken };
}

export async function registerUser(input: RegisterInput, meta: SessionMeta) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
  });

  if (existing) {
    throw new AppError(
      existing.email === input.email ? "Email already in use" : "Username already taken",
      409,
    );
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      username: input.username,
      email: input.email,
      passwordHash,
      country: input.country,
      preferredLanguage: input.preferredLanguage ?? "en",
      status: "ACTIVE", // simplified: email verification flow can gate this later
      emailVerified: false,
    },
  });

  const tokens = await issueTokens(user.id, user.email, meta);

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
}

export async function loginUser(input: LoginInput, meta: SessionMeta) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || user.deletedAt) {
    throw new AppError("Invalid email or password", 401);
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401);
  }

  if (user.status === "SUSPENDED") {
    throw new AppError("This account has been suspended", 403);
  }

  const tokens = await issueTokens(user.id, user.email, meta);

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
}

export async function refreshTokens(refreshToken: string, meta: SessionMeta) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const session = await prisma.userSession.findUnique({ where: { refreshToken } });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new AppError("Session no longer valid, please log in again", 401);
  }

  // Rotate: revoke old session, issue a new one
  await prisma.userSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueTokens(payload.sub, payload.email, meta);
  return tokens;
}

export async function logoutUser(refreshToken: string) {
  await prisma.userSession
    .updateMany({
      where: { refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    .catch(() => undefined);
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);
  return sanitizeUser(user);
}

function sanitizeUser(user: {
  id: string;
  fullName: string;
  username: string;
  email: string;
  avatar: string | null;
  country: string | null;
  preferredLanguage: string | null;
  role: string;
  status: string;
  emailVerified: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    country: user.country,
    preferredLanguage: user.preferredLanguage,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}
