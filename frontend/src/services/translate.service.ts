import { apiClient } from "../api/client";

export interface TranslationRecord {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  translatedText: string;
  aiProvider: string;
  confidenceScore: number | null;
  processingTimeMs: number | null;
  createdAt: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function translateText(payload: {
  sourceText: string;
  targetLanguage: string;
  sourceLanguage?: string;
  tone?: string;
  context?: string;
}): Promise<TranslationRecord> {
  const { data } = await apiClient.post<ApiEnvelope<TranslationRecord>>("/translate/text", payload);
  return data.data;
}

export async function getHistory(page = 1): Promise<{ items: TranslationRecord[]; total: number }> {
  const { data } = await apiClient.get<ApiEnvelope<{ items: TranslationRecord[]; total: number }>>(
    "/translate/history",
    { params: { page } },
  );
  return data.data;
}

export interface ProviderComparisonEntry {
  provider: string;
  success: boolean;
  result?: {
    translatedText: string;
    detectedSourceLanguage?: string;
    confidenceScore?: number;
    processingTimeMs: number;
  };
  error?: string;
}

export async function compareProviders(payload: {
  sourceText: string;
  targetLanguage: string;
  sourceLanguage?: string;
}): Promise<ProviderComparisonEntry[]> {
  const { data } = await apiClient.post<ApiEnvelope<ProviderComparisonEntry[]>>(
    "/translate/compare",
    payload,
  );
  return data.data;
}
