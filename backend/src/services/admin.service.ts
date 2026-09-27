import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/errorHandler";

export async function listUsers(page = 1, pageSize = 20, search?: string) {
  const skip = (page - 1) * pageSize;

  const where = search
    ? {
        OR: [
          { email: { contains: search } },
          { username: { contains: search } },
          { fullName: { contains: search } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function setUserStatus(adminId: string, userId: string, status: "ACTIVE" | "SUSPENDED") {
  if (adminId === userId && status === "SUSPENDED") {
    throw new AppError("You cannot suspend your own account", 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  return prisma.user.update({
    where: { id: userId },
    data: { status },
    select: { id: true, email: true, status: true },
  });
}

export async function setUserRole(adminId: string, userId: string, role: "USER" | "ADMIN") {
  if (adminId === userId && role !== "ADMIN") {
    throw new AppError("You cannot remove your own admin role", 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  return prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, email: true, role: true },
  });
}

export async function getPlatformStats() {
  const [totalUsers, activeUsers, totalTranslations, translationsToday, totalOcr] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.translationHistory.count(),
      prisma.translationHistory.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      prisma.ocrHistory.count(),
    ]);

  return { totalUsers, activeUsers, totalTranslations, translationsToday, totalOcr };
}
