import { apiClient } from "../api/client";

export interface TutorExplanation {
  explanation: string;
  difficultWords: { word: string; meaning: string }[];
  culturalNotes?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function explainText(text: string, language: string): Promise<TutorExplanation> {
  const { data } = await apiClient.post<ApiEnvelope<TutorExplanation>>("/learning/tutor/explain", {
    text,
    language,
  });
  return data.data;
}

export async function generateQuizQuestion(language: string, topic?: string) {
  const { data } = await apiClient.post("/learning/tutor/generate-quiz", { language, topic });
  return data.data;
}
