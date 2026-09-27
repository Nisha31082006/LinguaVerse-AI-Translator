import { prisma } from "../config/prisma";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getDashboardStats(userId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6); // last 7 days including today
  const monthStart = new Date(todayStart);
  monthStart.setDate(monthStart.getDate() - 29); // last 30 days

  const [totalTranslations, todayCount, weekTranslations, favoritesCount] = await Promise.all([
    prisma.translationHistory.count({ where: { userId } }),
    prisma.translationHistory.count({ where: { userId, createdAt: { gte: todayStart } } }),
    prisma.translationHistory.findMany({
      where: { userId, createdAt: { gte: weekStart } },
      select: { createdAt: true, targetLanguage: true },
    }),
    prisma.favoriteTranslation.count({ where: { userId } }),
  ]);

  const monthTranslations = await prisma.translationHistory.findMany({
    where: { userId, createdAt: { gte: monthStart } },
    select: { createdAt: true },
  });

  // Build a 7-day daily activity series
  const dailyActivity: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(todayStart);
    day.setDate(day.getDate() - i);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const count = weekTranslations.filter(
      (t) => t.createdAt >= day && t.createdAt < nextDay,
    ).length;
    dailyActivity.push({ date: day.toISOString().slice(0, 10), count });
  }

  // Language usage breakdown (last 30 days)
  const languageCounts = new Map<string, number>();
  const monthWithLang = await prisma.translationHistory.groupBy({
    by: ["targetLanguage"],
    where: { userId, createdAt: { gte: monthStart } },
    _count: { targetLanguage: true },
  });
  for (const row of monthWithLang) {
    languageCounts.set(row.targetLanguage, row._count.targetLanguage);
  }
  const favoriteLanguages = Array.from(languageCounts.entries())
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalTranslations,
    todayCount,
    weeklyCount: weekTranslations.length,
    monthlyCount: monthTranslations.length,
    favoritesCount,
    dailyActivity,
    favoriteLanguages,
  };
}
