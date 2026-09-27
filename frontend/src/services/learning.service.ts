import { apiClient } from "../api/client";

export interface VocabularyWord {
  id: string;
  word: string;
  languageCode: string;
  meaning: string;
  example: string | null;
  pronunciation: string | null;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: string | null;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  difficulty: string;
}

export interface QuizSubmitResult {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string | null;
}

export interface LearningProgress {
  xpPoints: number;
  currentStreak: number;
  longestStreak: number;
  wordsLearned: number;
  quizzesCompleted: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function getVocabulary(language: string): Promise<VocabularyWord[]> {
  const { data } = await apiClient.get<ApiEnvelope<VocabularyWord[]>>("/learning/words", {
    params: { language },
  });
  return data.data;
}

export async function getFlashcards(language: string): Promise<Flashcard[]> {
  const { data } = await apiClient.get<ApiEnvelope<Flashcard[]>>("/learning/flashcards", {
    params: { language },
  });
  return data.data;
}

export async function reviewFlashcard(flashcardId: string, result: "correct" | "incorrect") {
  await apiClient.post("/learning/flashcards/review", { flashcardId, result });
}

export async function getQuizzes(language: string): Promise<QuizQuestion[]> {
  const { data } = await apiClient.get<ApiEnvelope<QuizQuestion[]>>("/learning/quiz", {
    params: { language },
  });
  return data.data;
}

export async function submitQuizAnswer(
  quizId: string,
  selectedAnswer: string,
): Promise<QuizSubmitResult> {
  const { data } = await apiClient.post<ApiEnvelope<QuizSubmitResult>>("/learning/quiz/submit", {
    quizId,
    selectedAnswer,
  });
  return data.data;
}

export async function getProgress(): Promise<LearningProgress> {
  const { data } = await apiClient.get<ApiEnvelope<LearningProgress>>("/learning/progress");
  return data.data;
}
