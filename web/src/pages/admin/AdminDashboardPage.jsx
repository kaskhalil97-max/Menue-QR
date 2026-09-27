import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardList, TrendingUp } from "lucide-react";
import { api } from "../../lib/api.js";
import BarList from "../../components/BarList.jsx";

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/admin/dashboard").then((res) => setStats(res.data));
  }, []);

  if (!stats) return <p className="text-olive-500">{t("common.loading")}</p>;

  const topItemsData = stats.topItems.map((item) => ({ label: item.name, value: item.quantity }));
  const peakHoursData = stats.peakHours.map((h) => ({
    label: `${h.hour}h–${(h.hour + 1) % 24}h`,
    value: h.count,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-card">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-brick-500/10 text-brick-600">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm text-olive-600">{t("admin.dashboard.revenueToday")}</p>
            <p className="text-3xl font-bold text-brick-600">{stats.revenueToday.toFixed(2)} MAD</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-card">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-olive-600/10 text-olive-700">
            <ClipboardList className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm text-olive-600">{t("admin.dashboard.ordersToday")}</p>
            <p className="text-3xl font-bold text-olive-900">{stats.ordersCountToday}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <h3 className="mb-4 font-bold text-olive-900">{t("admin.dashboard.topItems")}</h3>
          <BarList data={topItemsData} />
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-card">
          <h3 className="mb-4 font-bold text-olive-900">{t("admin.dashboard.peakHours")}</h3>
          <BarList data={peakHoursData} />
        </div>
      </div>
    </div>
  );
}
