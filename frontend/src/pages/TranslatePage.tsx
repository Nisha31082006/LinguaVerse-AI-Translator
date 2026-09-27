import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { translateText, getHistory, compareProviders } from "../services/translate.service";
import { addFavorite, removeFavorite, getFavorites } from "../services/favorite.service";
import AppLayout from "../layouts/AppLayout";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "ta", name: "Tamil" },
  { code: "hi", name: "Hindi" },
  { code: "te", name: "Telugu" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
];

export default function TranslatePage() {
  const queryClient = useQueryClient();

  const [sourceText, setSourceText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("ta");
  const [tone, setTone] = useState<string>("");

  const { data: history } = useQuery({
    queryKey: ["translation-history"],
    queryFn: () => getHistory(1),
  });

  const { data: favorites } = useQuery({
    queryKey: ["favorites"],
    queryFn: getFavorites,
  });
  const favoriteIds = new Set((favorites ?? []).map((f) => f.translationId));

  const mutation = useMutation({
    mutationFn: () =>
      translateText({
        sourceText,
        targetLanguage,
        tone: tone || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["translation-history"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message ?? "Translation failed");
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: (translationId: string) =>
      favoriteIds.has(translationId)
        ? removeFavorite(translationId)
        : addFavorite(translationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  const compareMutation = useMutation({
    mutationFn: () => compareProviders({ sourceText, targetLanguage }),
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? "Comparison failed"),
  });

  return (
    <AppLayout>
      <h1 className="mb-6 text-2xl font-bold text-primary-600">Translation Workspace</h1>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          rows={5}
          maxLength={5000}
          placeholder="Type or paste text to translate…"
          className="w-full resize-none rounded-lg border border-slate-300 p-3 dark:border-slate-700 dark:bg-slate-800"
        />
        <div className="text-right text-xs text-slate-400">{sourceText.length}/5000</div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>

          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="">Default tone</option>
            <option value="formal">Formal</option>
            <option value="informal">Informal</option>
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="academic">Academic</option>
          </select>

          <button
            onClick={() => mutation.mutate()}
            disabled={!sourceText.trim() || mutation.isPending}
            className="ml-auto rounded-lg bg-primary-600 px-6 py-2 font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Translating…" : "Translate"}
          </button>
          <button
            onClick={() => compareMutation.mutate()}
            disabled={!sourceText.trim() || compareMutation.isPending}
            className="rounded-lg border border-primary-300 px-4 py-2 text-sm font-medium text-primary-600 transition hover:bg-primary-50 disabled:opacity-50 dark:border-primary-800 dark:hover:bg-primary-950"
          >
            {compareMutation.isPending ? "Comparing…" : "Compare providers"}
          </button>
        </div>

        {compareMutation.data && (
          <div className="grid gap-3 sm:grid-cols-2">
            {compareMutation.data.map((entry) => (
              <div
                key={entry.provider}
                className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"
              >
                <p className="mb-1 font-medium capitalize">{entry.provider}</p>
                {entry.success && entry.result ? (
                  <>
                    <p className="whitespace-pre-wrap">{entry.result.translatedText}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {entry.result.processingTimeMs}ms
                      {entry.result.confidenceScore != null &&
                        ` · confidence ${(entry.result.confidenceScore * 100).toFixed(0)}%`}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-red-500">{entry.error}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {mutation.data && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
            <div className="flex items-start justify-between gap-4">
              <p className="whitespace-pre-wrap">{mutation.data.translatedText}</p>
              <button
                onClick={() => toggleFavorite.mutate(mutation.data.id)}
                className="shrink-0 text-lg"
                title={favoriteIds.has(mutation.data.id) ? "Remove favorite" : "Add favorite"}
              >
                {favoriteIds.has(mutation.data.id) ? "★" : "☆"}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              via {mutation.data.aiProvider}
              {mutation.data.confidenceScore != null &&
                ` · confidence ${(mutation.data.confidenceScore * 100).toFixed(0)}%`}
              {mutation.data.processingTimeMs != null && ` · ${mutation.data.processingTimeMs}ms`}
            </p>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Recent translations</h2>
        <div className="space-y-2">
          {history?.items.length === 0 && (
            <p className="text-sm text-slate-400">No translations yet.</p>
          )}
          {history?.items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"
            >
              <div>
                <p className="text-slate-500">{item.sourceText}</p>
                <p className="font-medium">{item.translatedText}</p>
              </div>
              <button
                onClick={() => toggleFavorite.mutate(item.id)}
                className="shrink-0 text-lg"
                title={favoriteIds.has(item.id) ? "Remove favorite" : "Add favorite"}
              >
                {favoriteIds.has(item.id) ? "★" : "☆"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
