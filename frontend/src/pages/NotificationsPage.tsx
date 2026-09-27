import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../layouts/AppLayout";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../services/notification.service";

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "badge"],
    queryFn: () => getNotifications(),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  const readMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: invalidate,
  });

  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: invalidate,
  });

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-600">Notifications</h1>
        {!!data?.unreadCount && (
          <button
            onClick={() => readAllMutation.mutate()}
            className="text-sm text-primary-600 hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {isLoading && <p className="text-slate-400">Loading…</p>}
      {data?.items.length === 0 && (
        <p className="text-sm text-slate-400">You're all caught up.</p>
      )}

      <div className="space-y-2">
        {data?.items.map((n) => (
          <div
            key={n.id}
            className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${
              n.isRead
                ? "border-slate-200 dark:border-slate-800"
                : "border-primary-300 bg-primary-50 dark:border-primary-800 dark:bg-primary-950"
            }`}
          >
            <div>
              <p className="font-medium">{n.title}</p>
              <p className="text-sm text-slate-500">{n.message}</p>
              <p className="mt-1 text-xs text-slate-400">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex shrink-0 gap-3 text-sm">
              {!n.isRead && (
                <button
                  onClick={() => readMutation.mutate(n.id)}
                  className="text-primary-600 hover:underline"
                >
                  Mark read
                </button>
              )}
              <button
                onClick={() => deleteMutation.mutate(n.id)}
                className="text-red-500 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
