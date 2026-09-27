import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import AppLayout from "../layouts/AppLayout";
import {
  getVocabulary,
  getFlashcards,
  reviewFlashcard,
  getQuizzes,
  submitQuizAnswer,
  getProgress,
} from "../services/learning.service";
import { explainText, generateQuizQuestion } from "../services/tutor.service";

const LANGUAGES = [
  { code: "ta", name: "Tamil" },
  { code: "hi", name: "Hindi" },
  { code: "te", name: "Telugu" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
];

type Tab = "vocabulary" | "flashcards" | "quiz" | "tutor";

export default function LearningPage() {
  const queryClient = useQueryClient();
  const [language, setLanguage] = useState("ta");
  const [tab, setTab] = useState<Tab>("vocabulary");

  const { data: progress } = useQuery({ queryKey: ["learning-progress"], queryFn: getProgress });

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary-600">Learning</h1>
        {progress && (
          <div className="flex gap-4 text-sm text-slate-500">
            <span>🔥 {progress.currentStreak} day streak</span>
            <span>⭐ {progress.xpPoints} XP</span>
            <span>✓ {progress.quizzesCompleted} quizzes</span>
          </div>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value);
            queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
            queryClient.invalidateQueries({ queryKey: ["flashcards"] });
            queryClient.invalidateQueries({ queryKey: ["quizzes"] });
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>

        <div className="flex gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-800">
          {(["vocabulary", "flashcards", "quiz", "tutor"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${
                tab === t
                  ? "bg-primary-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "vocabulary" && <VocabularyTab language={language} />}
      {tab === "flashcards" && <FlashcardsTab language={language} />}
      {tab === "quiz" && <QuizTab language={language} />}
      {tab === "tutor" && <TutorTab language={language} />}
    </AppLayout>
  );
}

function VocabularyTab({ language }: { language: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["vocabulary", language],
    queryFn: () => getVocabulary(language),
  });

  if (isLoading) return <p className="text-slate-400">Loading…</p>;
  if (data?.length === 0) return <p className="text-sm text-slate-400">No vocabulary yet for this language.</p>;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {data?.map((w) => (
        <div key={w.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold">{w.word}</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-500 dark:bg-slate-800">
              {w.difficulty.toLowerCase()}
            </span>
          </div>
          {w.pronunciation && <p className="text-xs text-slate-400">/{w.pronunciation}/</p>}
          <p className="mt-1 text-sm">{w.meaning}</p>
          {w.example && <p className="mt-1 text-sm italic text-slate-500">{w.example}</p>}
        </div>
      ))}
    </div>
  );
}

function FlashcardsTab({ language }: { language: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["flashcards", language],
    queryFn: () => getFlashcards(language),
  });
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const reviewMutation = useMutation({
    mutationFn: ({ id, result }: { id: string; result: "correct" | "incorrect" }) =>
      reviewFlashcard(id, result),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning-progress"] });
    },
  });

  if (isLoading) return <p className="text-slate-400">Loading…</p>;
  if (!data || data.length === 0)
    return <p className="text-sm text-slate-400">No flashcards yet for this language.</p>;

  const card = data[index % data.length];

  function next(result: "correct" | "incorrect") {
    reviewMutation.mutate({ id: card.id, result });
    setFlipped(false);
    setIndex((i) => (i + 1) % (data?.length ?? 1));
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <p className="mb-3 text-sm text-slate-400">
        Card {(index % data.length) + 1} of {data.length}
      </p>
      <button
        onClick={() => setFlipped((f) => !f)}
        className="flex h-48 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-2xl font-semibold shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
      >
        {flipped ? card.back : card.front}
      </button>
      <p className="mt-2 text-xs text-slate-400">Tap the card to flip</p>

      <div className="mt-4 flex justify-center gap-3">
        <button
          onClick={() => next("incorrect")}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
        >
          Didn't know it
        </button>
        <button
          onClick={() => next("correct")}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm text-white hover:bg-emerald-600"
        >
          Knew it
        </button>
      </div>
    </div>
  );
}

function QuizTab({ language }: { language: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["quizzes", language],
    queryFn: () => getQuizzes(language),
  });
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<{ isCorrect: boolean; correctAnswer: string; explanation: string | null } | null>(
    null,
  );

  const submitMutation = useMutation({
    mutationFn: ({ quizId, answer }: { quizId: string; answer: string }) =>
      submitQuizAnswer(quizId, answer),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["learning-progress"] });
    },
  });

  if (isLoading) return <p className="text-slate-400">Loading…</p>;
  if (!data || data.length === 0)
    return <p className="text-sm text-slate-400">No quiz questions yet for this language.</p>;

  const quiz = data[index % data.length];

  function selectAnswer(option: string) {
    if (result) return;
    setSelected(option);
    submitMutation.mutate({ quizId: quiz.id, answer: option });
  }

  function nextQuestion() {
    setSelected(null);
    setResult(null);
    setIndex((i) => (i + 1) % (data?.length ?? 1));
  }

  return (
    <div className="mx-auto max-w-md">
      <p className="mb-3 text-sm text-slate-400">
        Question {(index % data.length) + 1} of {data.length}
      </p>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-4 text-lg font-medium">{quiz.question}</p>
        <div className="space-y-2">
          {quiz.options.map((opt) => {
            const isSelected = selected === opt;
            const isCorrectAnswer = result && opt === result.correctAnswer;
            const isWrongSelected = result && isSelected && !result.isCorrect;
            return (
              <button
                key={opt}
                onClick={() => selectAnswer(opt)}
                disabled={!!result}
                className={`w-full rounded-lg border px-4 py-2 text-left text-sm transition ${
                  isCorrectAnswer
                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950"
                    : isWrongSelected
                      ? "border-red-400 bg-red-50 dark:bg-red-950"
                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {result && (
          <div className="mt-4 space-y-2">
            <p className={result.isCorrect ? "text-emerald-500" : "text-red-500"}>
              {result.isCorrect ? "Correct!" : `Incorrect — the answer was "${result.correctAnswer}"`}
            </p>
            {result.explanation && <p className="text-sm text-slate-500">{result.explanation}</p>}
            <button
              onClick={nextQuestion}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Next question
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TutorTab({ language }: { language: string }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");

  const explainMutation = useMutation({
    mutationFn: () => explainText(text, language),
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? "Explanation failed"),
  });

  const generateQuizMutation = useMutation({
    mutationFn: () => generateQuizQuestion(language),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes", language] });
      toast.success("New quiz question generated — check the Quiz tab");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? "Quiz generation failed"),
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 font-semibold">Ask the tutor</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Paste a sentence you want explained…"
          className="w-full resize-none rounded-lg border border-slate-300 p-3 dark:border-slate-700 dark:bg-slate-800"
        />
        <button
          onClick={() => explainMutation.mutate()}
          disabled={!text.trim() || explainMutation.isPending}
          className="mt-3 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {explainMutation.isPending ? "Thinking…" : "Explain"}
        </button>

        {explainMutation.data && (
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
            <p>{explainMutation.data.explanation}</p>
            {explainMutation.data.difficultWords.length > 0 && (
              <ul className="space-y-1">
                {explainMutation.data.difficultWords.map((w) => (
                  <li key={w.word}>
                    <strong>{w.word}</strong> — {w.meaning}
                  </li>
                ))}
              </ul>
            )}
            {explainMutation.data.culturalNotes && (
              <p className="italic text-slate-500">{explainMutation.data.culturalNotes}</p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 font-semibold">Generate a new quiz question</h2>
        <p className="mb-3 text-sm text-slate-500">
          Uses AI to write a fresh beginner-level question for this language and adds it to the
          Quiz tab.
        </p>
        <button
          onClick={() => generateQuizMutation.mutate()}
          disabled={generateQuizMutation.isPending}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {generateQuizMutation.isPending ? "Generating…" : "Generate question"}
        </button>
      </div>
    </div>
  );
}
