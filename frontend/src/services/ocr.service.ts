import { apiClient } from "../api/client";

export interface OcrRecord {
  id: string;
  originalFileName: string;
  extractedText: string;
  translatedText: string | null;
  targetLanguage: string | null;
  confidenceScore: number | null;
  processingTimeMs: number | null;
  createdAt: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function processOcrImage(file: File, targetLanguage?: string): Promise<OcrRecord> {
  const formData = new FormData();
  formData.append("image", file);
  if (targetLanguage) formData.append("targetLanguage", targetLanguage);

  const { data } = await apiClient.post<ApiEnvelope<OcrRecord>>("/ocr/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function getOcrHistory(): Promise<{ items: OcrRecord[]; total: number }> {
  const { data } = await apiClient.get<ApiEnvelope<{ items: OcrRecord[]; total: number }>>(
    "/ocr/history",
  );
  return data.data;
}
