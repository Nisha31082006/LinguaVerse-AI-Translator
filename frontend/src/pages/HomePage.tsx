import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface HealthResponse {
  status: string;
  uptime: number;
  version: string;
}

async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await axios.get<HealthResponse>("/health");
  return data;
}

export default function HomePage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold text-primary-600">LinguaVerse AI</h1>
      <p className="max-w-md text-slate-500">
        Intelligent local language translator platform — project skeleton is
        wired up and talking to the backend.
      </p>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-4 text-sm dark:border-slate-800 dark:bg-slate-900">
        {isLoading && <span>Checking backend connection…</span>}
        {isError && (
          <span className="text-red-500">
            Backend not reachable yet — start it with{" "}
            <code>npm run dev:backend</code>.
          </span>
        )}
        {data && (
          <span className="text-emerald-500">
            Backend status: {data.status} (v{data.version})
          </span>
        )}
      </div>

      <Link
        to={user ? "/dashboard" : "/login"}
        className="mt-2 rounded-lg bg-primary-600 px-6 py-2 font-medium text-white transition hover:bg-primary-700"
      >
        {user ? "Go to dashboard" : "Sign in to translate"}
      </Link>
    </main>
  );
}
