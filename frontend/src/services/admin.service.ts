import { apiClient } from "../api/client";

export interface AdminUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  emailVerified: boolean;
  createdAt: string;
}

export interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalTranslations: number;
  translationsToday: number;
  totalOcr: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const { data } = await apiClient.get<ApiEnvelope<PlatformStats>>("/admin/stats");
  return data.data;
}

export async function listUsers(search?: string): Promise<{ items: AdminUser[]; total: number }> {
  const { data } = await apiClient.get<ApiEnvelope<{ items: AdminUser[]; total: number }>>(
    "/admin/users",
    { params: search ? { search } : {} },
  );
  return data.data;
}

export async function setUserStatus(id: string, status: "ACTIVE" | "SUSPENDED") {
  await apiClient.put(`/admin/users/${id}/status`, { status });
}

export async function setUserRole(id: string, role: "USER" | "ADMIN") {
  await apiClient.put(`/admin/users/${id}/role`, { role });
}
