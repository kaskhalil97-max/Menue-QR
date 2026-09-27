import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Plus, QrCode, Receipt, RefreshCw } from "lucide-react";
import { api } from "../../lib/api.js";
import BillModal from "../../components/BillModal.jsx";

export default function AdminTablesPage() {
  const { t } = useTranslation();
  const [tables, setTables] = useState([]);
  const [openSessions, setOpenSessions] = useState([]);
  const [label, setLabel] = useState("");
  const [billSession, setBillSession] = useState(null);

  function load() {
    api.get("/admin/tables").then((res) => setTables(res.data));
    api.get("/waiter/sessions/open").then((res) => setOpenSessions(res.data));
  }
  useEffect(load, []);

  async function addTable(e) {
    e.preventDefault();
    if (!label) return;
    await api.post("/admin/tables", { label });
    setLabel("");
    load();
  }

  async function toggleActive(table) {
    await api.patch(`/admin/tables/${table.id}`, { isActive: !table.isActive });
    load();
  }

  async function regenerate(id) {
    if (!confirm("Régénérer le QR ? L'ancien lien ne fonctionnera plus.")) return;
    await api.patch(`/admin/tables/${id}/regenerate-qr`);
    load();
  }

  async function downloadPdf() {
    const res = await api.get("/admin/tables/qr-codes.pdf", { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "qr-codes.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-white dark:bg-olive-900 p-4 shadow-card">
        <form onSubmit={addTable} className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-olive-700 dark:text-sand-200">{t("common.name")}</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Table 9"
              className="rounded-lg border border-sand-200 dark:border-olive-700 bg-white dark:bg-olive-950/40 px-3 py-1.5 text-sm text-olive-900 dark:text-sand-50"
            />
          </div>
          <button className="flex items-center gap-1.5 rounded-full bg-olive-600 px-4 py-1.5 text-sm font-medium text-white">
            <Plus className="h-4 w-4" /> {t("admin.tables.add")}
          </button>
        </form>
        <button
          onClick={downloadPdf}
          className="ms-auto flex items-center gap-1.5 rounded-full bg-brick-500 px-4 py-1.5 text-sm font-medium text-white"
        >
          <Download className="h-4 w-4" /> {t("admin.tables.downloadPdf")}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((table) => {
          const session = openSessions.find((s) => s.diningTableId === table.id);
          return (
            <div key={table.id} className="rounded-2xl bg-white dark:bg-olive-900 p-4 shadow-card">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-lg font-bold text-olive-900 dark:text-sand-50">{table.label}</span>
                <button
                  onClick={() => toggleActive(table)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    table.isActive ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                  }`}
                >
                  {table.isActive ? t("admin.tables.active") : t("admin.tables.inactive")}
                </button>
              </div>
              <p className="mb-3 flex items-center gap-1.5 break-all text-xs text-olive-500 dark:text-olive-400">
                <QrCode className="h-3.5 w-3.5 flex-none" />
                {t("admin.tables.demoLink")}: /t/{table.qrToken}
              </p>

              {session && (
                <div className="mb-3 flex items-center justify-between rounded-xl bg-sand-100 dark:bg-olive-800 px-3 py-2">
                  <div>
                    <p className="text-xs text-olive-600 dark:text-olive-300">{t("admin.tables.occupied")}</p>
                    <p className="font-bold text-brick-600 dark:text-brick-400">{session.total.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => setBillSession({ diningTableId: table.id })}
                    className="flex items-center gap-1.5 rounded-full border border-brick-500 px-3 py-1.5 text-sm text-brick-600 dark:text-brick-400"
                  >
                    <Receipt className="h-3.5 w-3.5" /> {t("waiter.closeBill")}
                  </button>
                </div>
              )}

              <button
                onClick={() => regenerate(table.id)}
                className="flex items-center gap-1.5 text-sm text-olive-600 dark:text-olive-300 underline"
              >
                <RefreshCw className="h-3.5 w-3.5" /> {t("admin.tables.regenerate")}
              </button>
            </div>
          );
        })}
      </div>

      {billSession && (
        <BillModal
          diningTableId={billSession.diningTableId}
          onClose={() => setBillSession(null)}
          onClosed={() => {
            setBillSession(null);
            load();
          }}
        />
      )}
    </div>
  );
}
