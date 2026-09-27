import { apiClient } from "../api/client";

export interface VoiceRecord {
  id: string;
  originalFileName: string;
  transcript: string;
  translatedText: string | null;
  targetLanguage: string | null;
  aiProvider: string;
  processingTimeMs: number | null;
  createdAt: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function transcribeAudio(file: File, targetLanguage?: string): Promise<VoiceRecord> {
  const formData = new FormData();
  formData.append("audio", file);
  if (targetLanguage) formData.append("targetLanguage", targetLanguage);

  const { data } = await apiClient.post<ApiEnvelope<VoiceRecord>>("/speech/transcribe", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

// Text-to-speech is no longer a backend call — SpeechPage.tsx uses the
// browser's built-in window.speechSynthesis API instead (free, offline,
// no OpenAI dependency).

export async function getVoiceHistory(): Promise<{ items: VoiceRecord[]; total: number }> {
  const { data } = await apiClient.get<ApiEnvelope<{ items: VoiceRecord[]; total: number }>>(
    "/speech/history",
  );
  return data.data;
}
