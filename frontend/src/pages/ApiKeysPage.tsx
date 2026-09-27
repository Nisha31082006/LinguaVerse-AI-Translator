import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import AppLayout from "../layouts/AppLayout";
import { listApiKeys, createApiKey, revokeApiKey } from "../services/apikey.service";

export default function ApiKeysPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["api-keys"], queryFn: listApiKeys });

  const createMutation = useMutation({
    mutationFn: () => createApiKey(name || "Untitled key"),
    onSuccess: (result) => {
      setRevealedKey(result.key);
      setName("");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? "Couldn't create key"),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("Key revoked");
    },
  });

  return (
    <AppLayout>
      <h1 className="mb-2 text-2xl font-bold text-primary-600">API Keys</h1>
      <p className="mb-6 text-sm text-slate-500">
        Use a key with <code>X-API-Key</code> against{" "}
        <code>POST /api/v1/translate</code> to call translation from your own
        apps (60 requests/minute per key).
      </p>

      {revealedKey && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
          <p className="mb-2 font-medium">
            Copy this key now — it won't be shown again.
          </p>
          <code className="block break-all rounded bg-white p-2 dark:bg-slate-900">
            {revealedKey}
          </code>
          <button
            onClick={() => setRevealedKey(null)}
            className="mt-2 text-xs text-slate-500 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-8 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name (e.g. My Script)"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
        />
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="rounded-lg bg-primary-600 px-6 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          Create key
        </button>
      </div>

      {isLoading && <p className="text-slate-400">Loading…</p>}
      {data?.length === 0 && <p className="text-sm text-slate-400">No API keys yet.</p>}

      <div className="space-y-2">
        {data?.map((k) => (
          <div
            key={k.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"
          >
            <div>
              <p className="font-medium">
                {k.name}{" "}
                {k.revoked && (
                  <span className="text-xs text-red-500">(revoked)</span>
                )}
              </p>
              <p className="font-mono text-xs text-slate-400">{k.maskedKey}</p>
              <p className="text-xs text-slate-400">
                {k.lastUsedAt
                  ? `Last used ${new Date(k.lastUsedAt).toLocaleString()}`
                  : "Never used"}
              </p>
            </div>
            {!k.revoked && (
              <button
                onClick={() => revokeMutation.mutate(k.id)}
                className="text-red-500 hover:underline"
              >
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
