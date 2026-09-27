import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import AppLayout from "../layouts/AppLayout";
import { getFavorites, removeFavorite } from "../services/favorite.service";

export default function FavoritesPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: getFavorites,
  });

  const removeMutation = useMutation({
    mutationFn: (translationId: string) => removeFavorite(translationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success("Removed from favorites");
    },
  });

  return (
    <AppLayout>
      <h1 className="mb-6 text-2xl font-bold text-primary-600">Favorites</h1>

      {isLoading && <p className="text-slate-400">Loading…</p>}
      {data?.length === 0 && (
        <p className="text-sm text-slate-400">
          No favorites yet — star a translation from the workspace to save it here.
        </p>
      )}

      <div className="space-y-3">
        {data?.map((fav) => (
          <div
            key={fav.id}
            className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">{fav.translation.sourceText}</p>
                <p className="font-medium">{fav.translation.translatedText}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {fav.translation.sourceLanguage.toUpperCase()} →{" "}
                  {fav.translation.targetLanguage.toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => removeMutation.mutate(fav.translationId)}
                className="shrink-0 text-sm text-red-500 hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
