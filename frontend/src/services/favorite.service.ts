import { apiClient } from "../api/client";
import { TranslationRecord } from "./translate.service";

export interface FavoriteItem {
  id: string;
  translationId: string;
  createdAt: string;
  translation: TranslationRecord;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function getFavorites(): Promise<FavoriteItem[]> {
  const { data } = await apiClient.get<ApiEnvelope<FavoriteItem[]>>("/favorites");
  return data.data;
}

export async function addFavorite(translationId: string): Promise<void> {
  await apiClient.post("/favorites", { translationId });
}

export async function removeFavorite(translationId: string): Promise<void> {
  await apiClient.delete(`/favorites/${translationId}`);
}
