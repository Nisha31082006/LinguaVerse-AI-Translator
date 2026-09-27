import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import AppLayout from "../layouts/AppLayout";
import { processOcrImage, getOcrHistory } from "../services/ocr.service";

const LANGUAGES = [
  { code: "", name: "Extract only (no translation)" },
  { code: "en", name: "English" },
  { code: "ta", name: "Tamil" },
  { code: "hi", name: "Hindi" },
  { code: "te", name: "Telugu" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
];

export default function OcrPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState("");

  const { data: history } = useQuery({
    queryKey: ["ocr-history"],
    queryFn: getOcrHistory,
  });

  const mutation = useMutation({
    mutationFn: () => processOcrImage(selectedFile as File, targetLanguage || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocr-history"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message ?? "OCR processing failed");
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  return (
    <AppLayout>
      <h1 className="mb-6 text-2xl font-bold text-primary-600">OCR Translation</h1>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="text-sm"
        />

        {previewUrl && (
          <img
            src={previewUrl}
            alt="Selected upload preview"
            className="max-h-64 rounded-lg border border-slate-200 object-contain dark:border-slate-800"
          />
        )}

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

          <button
            onClick={() => mutation.mutate()}
            disabled={!selectedFile || mutation.isPending}
            className="ml-auto rounded-lg bg-primary-600 px-6 py-2 font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Processing…" : "Extract text"}
          </button>
        </div>

        {mutation.data && (
          <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Extracted text</p>
              <p className="whitespace-pre-wrap">{mutation.data.extractedText}</p>
            </div>
            {mutation.data.translatedText && (
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Translated</p>
                <p className="whitespace-pre-wrap">{mutation.data.translatedText}</p>
              </div>
            )}
            <p className="text-xs text-slate-500">
              {mutation.data.confidenceScore != null &&
                `confidence ${(mutation.data.confidenceScore * 100).toFixed(0)}%`}
              {mutation.data.processingTimeMs != null && ` · ${mutation.data.processingTimeMs}ms`}
            </p>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Recent extractions</h2>
        <div className="space-y-2">
          {history?.items.length === 0 && (
            <p className="text-sm text-slate-400">No OCR extractions yet.</p>
          )}
          {history?.items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"
            >
              <p className="text-xs text-slate-400">{item.originalFileName}</p>
              <p className="font-medium">{item.extractedText}</p>
              {item.translatedText && <p className="text-slate-500">{item.translatedText}</p>}
            </div>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
