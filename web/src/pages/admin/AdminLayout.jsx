import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/auth.jsx";
import LangSwitcher from "../../components/LangSwitcher.jsx";
import ThemeToggle from "../../components/ThemeToggle.jsx";

const TABS = [
  { to: "/admin/menu", key: "admin.nav.menu" },
  { to: "/admin/tables", key: "admin.nav.tables" },
  { to: "/admin/staff", key: "admin.nav.staff" },
  { to: "/admin/dashboard", key: "admin.nav.dashboard" },
  { to: "/admin/history", key: "admin.nav.history" },
];

export default function AdminLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-sand-50 dark:bg-olive-950">
      <header className="flex items-center justify-between bg-white dark:bg-olive-900 px-5 py-3 shadow-card">
        <h1 className="text-xl font-bold text-olive-800 dark:text-sand-100">
          {t("admin.title")} — {user?.name}
        </h1>
        <div className="flex items-center gap-3">
          <LangSwitcher />
          <ThemeToggle />
          <button onClick={logout} className="text-sm text-olive-600 dark:text-olive-300 underline">
            {t("staff.logout")}
          </button>
        </div>
      </header>

      <nav className="flex gap-2 overflow-x-auto bg-white dark:bg-olive-900 px-5 py-2 shadow-card">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${
                isActive ? "bg-olive-600 text-white" : "bg-sand-100 dark:bg-olive-800 text-olive-700 dark:text-sand-200"
              }`
            }
          >
            {t(tab.key)}
          </NavLink>
        ))}
      </nav>

      <main className="p-5">
        <Outlet />
      </main>
    </div>
  );
}
