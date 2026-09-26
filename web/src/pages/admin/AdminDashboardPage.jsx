import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api.js";

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/admin/dashboard").then((res) => setStats(res.data));
  }, []);

  if (!stats) return <p className="text-olive-500">{t("common.loading")}</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-olive-600">{t("admin.dashboard.revenueToday")}</p>
          <p className="text-3xl font-bold text-brick-600">{stats.revenueToday.toFixed(2)} MAD</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-olive-600">{t("admin.dashboard.ordersToday")}</p>
          <p className="text-3xl font-bold text-olive-800">{stats.ordersCountToday}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-bold text-olive-800">{t("admin.dashboard.topItems")}</h3>
          {stats.topItems.length === 0 && <p className="text-olive-500">—</p>}
          <ul className="space-y-2">
            {stats.topItems.map((item, idx) => (
              <li key={item.name} className="flex items-center justify-between">
                <span className="text-olive-700">
                  {idx + 1}. {item.name}
                </span>
                <span className="font-semibold text-olive-800">{item.quantity}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-bold text-olive-800">{t("admin.dashboard.peakHours")}</h3>
          {stats.peakHours.length === 0 && <p className="text-olive-500">—</p>}
          <ul className="space-y-2">
            {stats.peakHours.map((h) => (
              <li key={h.hour} className="flex items-center justify-between">
                <span className="text-olive-700">{h.hour}h — {(h.hour + 1) % 24}h</span>
                <span className="font-semibold text-olive-800">{h.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
