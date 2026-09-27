import { apiClient } from "../api/client";

export interface ApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  maskedKey: string;
  revoked: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function listApiKeys(): Promise<ApiKeySummary[]> {
  const { data } = await apiClient.get<ApiEnvelope<ApiKeySummary[]>>("/api-keys");
  return data.data;
}

export async function createApiKey(name: string): Promise<{ id: string; name: string; key: string }> {
  const { data } = await apiClient.post<ApiEnvelope<{ id: string; name: string; key: string }>>(
    "/api-keys",
    { name },
  );
  return data.data;
}

export async function revokeApiKey(id: string): Promise<void> {
  await apiClient.delete(`/api-keys/${id}`);
}
