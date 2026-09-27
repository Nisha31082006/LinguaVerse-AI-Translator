import { NavLink, Link } from "react-router-dom";
import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { getNotifications } from "../services/notification.service";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/translate", label: "Translate" },
  { to: "/live", label: "Live Conversation" },
  { to: "/ocr", label: "OCR" },
  { to: "/speech", label: "Speech" },
  { to: "/documents", label: "Documents" },
  { to: "/learning", label: "Learning" },
  { to: "/glossary", label: "Glossary" },
  { to: "/favorites", label: "Favorites" },
  { to: "/notifications", label: "Notifications" },
  { to: "/billing", label: "Billing" },
  { to: "/api-keys", label: "API Keys" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  const { data } = useQuery({
    queryKey: ["notifications", "badge"],
    queryFn: () => getNotifications(),
    refetchInterval: 30_000,
  });

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 p-4 dark:border-slate-800 sm:flex">
        <Link to="/" className="mb-6 text-lg font-bold text-primary-600">
          LinguaVerse
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`
              }
            >
              {item.label}
              {item.to === "/notifications" && !!data?.unreadCount && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">
                  {data.unreadCount}
                </span>
              )}
            </NavLink>
          ))}
          {user?.role === "ADMIN" && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`
              }
            >
              Admin
            </NavLink>
          )}
        </nav>
        <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
          {user && <p className="mb-2 truncate text-xs text-slate-500">{user.email}</p>}
          <button
            onClick={() => logout()}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
