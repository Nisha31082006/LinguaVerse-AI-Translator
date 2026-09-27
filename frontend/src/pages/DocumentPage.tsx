import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import AppLayout from "../layouts/AppLayout";
import {
  translateDocument,
  getDocumentHistory,
  downloadDocument,
} from "../services/document.service";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "ta", name: "Tamil" },
  { code: "hi", name: "Hindi" },
  { code: "te", name: "Telugu" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
];

export default function DocumentPage() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [targetLanguage, setTargetLanguage] = useState("ta");

  const { data: history } = useQuery({
    queryKey: ["document-history"],
    queryFn: getDocumentHistory,
  });

  const mutation = useMutation({
    mutationFn: () => translateDocument(file as File, targetLanguage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-history"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Document translated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? "Translation failed"),
  });

  async function handleDownload(id: string, fileName: string) {
    try {
      await downloadDocument(id, fileName);
    } catch {
      toast.error("Download failed");
    }
  }

  return (
    <AppLayout>
      <h1 className="mb-6 text-2xl font-bold text-primary-600">Document Translation</h1>
      <p className="mb-4 text-sm text-slate-500">
        Supports <code>.txt</code> and <code>.docx</code> for now — output is a translated{" "}
        <code>.docx</code> with plain paragraph formatting (original styling isn't preserved yet).
      </p>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <input
          type="file"
          accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />

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
            disabled={!file || mutation.isPending}
            className="ml-auto rounded-lg bg-primary-600 px-6 py-2 font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Translating…" : "Translate document"}
          </button>
        </div>

        {mutation.data && (
          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
            <p className="text-sm">
              Translated <strong>{mutation.data.originalFileName}</strong> to{" "}
              {mutation.data.targetLanguage.toUpperCase()}
            </p>
            <button
              onClick={() => handleDownload(mutation.data.id, mutation.data.downloadFileName)}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Download
            </button>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Recent documents</h2>
        <div className="space-y-2">
          {history?.items.length === 0 && (
            <p className="text-sm text-slate-400">No documents translated yet.</p>
          )}
          {history?.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"
            >
              <div>
                <p className="font-medium">{item.originalFileName}</p>
                <p className="text-xs text-slate-400">→ {item.targetLanguage.toUpperCase()}</p>
              </div>
              <button
                onClick={() => handleDownload(item.id, item.downloadFileName)}
                className="text-primary-600 hover:underline"
              >
                Download
              </button>
            </div>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
