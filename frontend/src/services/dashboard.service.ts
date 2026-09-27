import { apiClient } from "../api/client";

export interface DashboardStats {
  totalTranslations: number;
  todayCount: number;
  weeklyCount: number;
  monthlyCount: number;
  favoritesCount: number;
  dailyActivity: { date: string; count: number }[];
  favoriteLanguages: { language: string; count: number }[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get<ApiEnvelope<DashboardStats>>("/dashboard/stats");
  return data.data;
}
