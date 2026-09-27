import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import AppLayout from "../layouts/AppLayout";
import { getDashboardStats } from "../services/dashboard.service";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  return (
    <AppLayout>
      <h1 className="mb-6 text-2xl font-bold text-primary-600">Dashboard</h1>

      {isLoading && <p className="text-slate-400">Loading stats…</p>}
      {isError && <p className="text-red-500">Couldn't load dashboard stats.</p>}

      {data && (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total translations" value={data.totalTranslations} />
            <StatCard label="Today" value={data.todayCount} />
            <StatCard label="Last 7 days" value={data.weeklyCount} />
            <StatCard label="Favorites" value={data.favoritesCount} />
          </div>

          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 font-semibold">Daily activity (last 7 days)</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" fontSize={12} tickFormatter={(d) => d.slice(5)} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#3d6bff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 font-semibold">Top languages (last 30 days)</h2>
            {data.favoriteLanguages.length === 0 && (
              <p className="text-sm text-slate-400">Not enough data yet.</p>
            )}
            <ul className="space-y-2">
              {data.favoriteLanguages.map((lang) => (
                <li key={lang.language} className="flex items-center justify-between text-sm">
                  <span className="uppercase">{lang.language}</span>
                  <span className="text-slate-500">{lang.count} translations</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </AppLayout>
  );
}
