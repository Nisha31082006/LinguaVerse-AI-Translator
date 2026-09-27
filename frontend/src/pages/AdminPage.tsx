import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import AppLayout from "../layouts/AppLayout";
import { getPlatformStats, listUsers, setUserStatus, setUserRole } from "../services/admin.service";
import { useAuth } from "../context/AuthContext";

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: getPlatformStats,
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => listUsers(search || undefined),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "SUSPENDED" }) =>
      setUserStatus(id, status),
    onSuccess: invalidate,
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? "Update failed"),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "USER" | "ADMIN" }) => setUserRole(id, role),
    onSuccess: invalidate,
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? "Update failed"),
  });

  return (
    <AppLayout>
      <h1 className="mb-6 text-2xl font-bold text-primary-600">Admin Panel</h1>

      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            ["Total users", stats.totalUsers],
            ["Active users", stats.activeUsers],
            ["Total translations", stats.totalTranslations],
            ["Translations today", stats.translationsToday],
            ["OCR extractions", stats.totalOcr],
          ].map(([label, value]) => (
            <div
              key={label as string}
              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 text-xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, username, or email…"
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left dark:bg-slate-900">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="p-3 text-slate-400" colSpan={5}>
                  Loading…
                </td>
              </tr>
            )}
            {users?.items.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-3">{u.fullName}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">
                  <span
                    className={
                      u.status === "ACTIVE"
                        ? "text-emerald-500"
                        : u.status === "SUSPENDED"
                          ? "text-red-500"
                          : "text-slate-400"
                    }
                  >
                    {u.status}
                  </span>
                </td>
                <td className="space-x-3 p-3">
                  {u.status === "ACTIVE" ? (
                    <button
                      className="text-red-500 hover:underline disabled:opacity-40"
                      disabled={u.id === currentUser?.id}
                      onClick={() => statusMutation.mutate({ id: u.id, status: "SUSPENDED" })}
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      className="text-emerald-500 hover:underline"
                      onClick={() => statusMutation.mutate({ id: u.id, status: "ACTIVE" })}
                    >
                      Activate
                    </button>
                  )}
                  <button
                    className="text-primary-600 hover:underline disabled:opacity-40"
                    disabled={u.id === currentUser?.id}
                    onClick={() =>
                      roleMutation.mutate({
                        id: u.id,
                        role: u.role === "ADMIN" ? "USER" : "ADMIN",
                      })
                    }
                  >
                    {u.role === "ADMIN" ? "Revoke admin" : "Make admin"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
