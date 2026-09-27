import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import AppLayout from "../layouts/AppLayout";
import { getGlossaryTerms, addGlossaryTerm, deleteGlossaryTerm } from "../services/glossary.service";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "ta", name: "Tamil" },
  { code: "hi", name: "Hindi" },
  { code: "te", name: "Telugu" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
];

interface FormValues {
  sourceTerm: string;
  preferredTerm: string;
  targetLanguage: string;
  notes?: string;
}

export default function GlossaryPage() {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { targetLanguage: "ta" },
  });

  const { data, isLoading } = useQuery({ queryKey: ["glossary"], queryFn: getGlossaryTerms });

  const addMutation = useMutation({
    mutationFn: addGlossaryTerm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["glossary"] });
      reset({ sourceTerm: "", preferredTerm: "", targetLanguage: "ta", notes: "" });
      toast.success("Glossary term added");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? "Couldn't add term"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGlossaryTerm,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["glossary"] }),
  });

  return (
    <AppLayout>
      <h1 className="mb-2 text-2xl font-bold text-primary-600">Glossary</h1>
      <p className="mb-6 text-sm text-slate-500">
        Terms here are enforced automatically the next time you translate to that language —
        e.g. always render "CPU" as your preferred term instead of a literal translation.
      </p>

      <form
        onSubmit={handleSubmit((values) => addMutation.mutate(values))}
        className="mb-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900"
      >
        <input
          {...register("sourceTerm", { required: true })}
          placeholder="Source term (e.g. CPU)"
          className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
        />
        <input
          {...register("preferredTerm", { required: true })}
          placeholder="Preferred translation"
          className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
        />
        <select
          {...register("targetLanguage", { required: true })}
          className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
        <input
          {...register("notes")}
          placeholder="Notes (optional)"
          className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
        />
        <button
          type="submit"
          disabled={addMutation.isPending}
          className="rounded-lg bg-primary-600 py-2 font-medium text-white transition hover:bg-primary-700 disabled:opacity-50 sm:col-span-2"
        >
          Add term
        </button>
      </form>

      {isLoading && <p className="text-slate-400">Loading…</p>}
      {data?.length === 0 && <p className="text-sm text-slate-400">No glossary terms yet.</p>}

      <div className="space-y-2">
        {data?.map((term) => (
          <div
            key={term.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"
          >
            <div>
              <p>
                <strong>{term.sourceTerm}</strong> → {term.preferredTerm}{" "}
                <span className="text-xs uppercase text-slate-400">({term.targetLanguage})</span>
              </p>
              {term.notes && <p className="text-xs text-slate-500">{term.notes}</p>}
            </div>
            <button
              onClick={() => deleteMutation.mutate(term.id)}
              className="text-red-500 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
