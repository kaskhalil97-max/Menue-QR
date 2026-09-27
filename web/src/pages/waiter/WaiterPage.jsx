import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Check, Receipt, UtensilsCrossed } from "lucide-react";
import { api } from "../../lib/api.js";
import { socket } from "../../lib/socket.js";
import { useAuth } from "../../lib/auth.jsx";
import LangSwitcher from "../../components/LangSwitcher.jsx";
import ThemeToggle from "../../components/ThemeToggle.jsx";
import BillModal from "../../components/BillModal.jsx";

const REQUEST_ICON = { call_waiter: Bell, bill: Receipt };

export default function WaiterPage() {
  const { t } = useTranslation();
  const { user, token, logout } = useAuth();
  const [readyOrders, setReadyOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [openSessions, setOpenSessions] = useState([]);
  const [billSession, setBillSession] = useState(null);

  function loadAll() {
    api.get("/waiter/orders/ready").then((res) => setReadyOrders(res.data));
    api.get("/waiter/service-requests").then((res) => setRequests(res.data));
    api.get("/waiter/sessions/open").then((res) => setOpenSessions(res.data));
  }

  useEffect(() => {
    loadAll();
    if (token) socket.emit("staff:auth", token);
    socket.on("order.created", loadAll);
    socket.on("order.status_changed", loadAll);
    socket.on("service_request.created", loadAll);
    socket.on("service_request.updated", loadAll);
    socket.on("session.closed", loadAll);
    return () => {
      socket.off("order.created", loadAll);
      socket.off("order.status_changed", loadAll);
      socket.off("service_request.created", loadAll);
      socket.off("service_request.updated", loadAll);
      socket.off("session.closed", loadAll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function markServed(orderId) {
    await api.patch(`/waiter/orders/${orderId}/served`);
    loadAll();
  }
  async function markHandled(requestId) {
    await api.patch(`/waiter/service-requests/${requestId}/handled`);
    loadAll();
  }

  return (
    <div className="min-h-screen bg-sand-50 dark:bg-olive-950">
      <header className="flex items-center justify-between bg-white dark:bg-olive-900 px-5 py-3 shadow-card">
        <h1 className="text-xl font-bold text-olive-900 dark:text-sand-50">
          {t("waiter.title")} — {user?.name}
        </h1>
        <div className="flex items-center gap-3">
          <LangSwitcher />
          <ThemeToggle />
          <button onClick={logout} className="text-sm text-olive-600 dark:text-olive-300 underline">
            {t("staff.logout")}
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-bold text-olive-900 dark:text-sand-50">{t("waiter.readyOrders")}</h2>
          <div className="space-y-3">
            {readyOrders.length === 0 && (
              <p className="rounded-xl border border-dashed border-sand-200 dark:border-olive-700 py-6 text-center text-sm text-olive-400">
                {t("waiter.emptyReady")}
              </p>
            )}
            {readyOrders.map((order) => (
              <div key={order.id} className="rounded-2xl bg-white dark:bg-olive-900 p-4 shadow-card">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-bold text-olive-900 dark:text-sand-50">{order.tableSession.diningTable.label}</span>
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs text-green-700 dark:bg-green-500/15 dark:text-green-400">
                    {t("client.status.ready")}
                  </span>
                </div>
                <ul className="mb-3 text-sm text-olive-700 dark:text-sand-200">
                  {order.items.map((it) => (
                    <li key={it.id}>
                      {it.quantity}× {it.name}
                      {it.options?.length > 0 && (
                        <span className="text-olive-500 dark:text-olive-400"> ({it.options.map((o) => o.name).join(", ")})</span>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => markServed(order.id)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-full bg-olive-600 py-2 text-sm font-medium text-white"
                >
                  <UtensilsCrossed className="h-4 w-4" /> {t("waiter.served")}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-olive-900 dark:text-sand-50">{t("waiter.serviceRequests")}</h2>
          <div className="space-y-3">
            {requests.length === 0 && (
              <p className="rounded-xl border border-dashed border-sand-200 dark:border-olive-700 py-6 text-center text-sm text-olive-400">
                {t("waiter.emptyRequests")}
              </p>
            )}
            {requests.map((reqst) => {
              const Icon = REQUEST_ICON[reqst.type];
              return (
                <div key={reqst.id} className="flex items-center justify-between rounded-2xl bg-white dark:bg-olive-900 p-4 shadow-card">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sand-100 dark:bg-olive-800 text-olive-700 dark:text-sand-200">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-bold text-olive-900 dark:text-sand-50">{reqst.diningTable.label}</p>
                      <p className="text-sm text-olive-600 dark:text-olive-300">{t(`waiter.type.${reqst.type}`)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {reqst.type === "bill" && (
                      <button
                        onClick={() => setBillSession({ diningTableId: reqst.diningTableId })}
                        className="rounded-full border border-brick-500 px-3 py-1.5 text-sm text-brick-600 dark:text-brick-400"
                      >
                        {t("waiter.closeBill")}
                      </button>
                    )}
                    <button
                      onClick={() => markHandled(reqst.id)}
                      className="flex items-center gap-1 rounded-full bg-olive-600 px-3 py-1.5 text-sm text-white"
                    >
                      <Check className="h-3.5 w-3.5" /> {t("waiter.handled")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold text-olive-900 dark:text-sand-50">{t("waiter.openTables")}</h2>
          <p className="mb-3 text-sm text-olive-500 dark:text-olive-400">{t("waiter.openTablesHint")}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {openSessions.length === 0 && (
              <p className="col-span-full rounded-xl border border-dashed border-sand-200 dark:border-olive-700 py-6 text-center text-sm text-olive-400">
                {t("waiter.emptyOpenTables")}
              </p>
            )}
            {openSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-2xl bg-white dark:bg-olive-900 p-4 shadow-card"
              >
                <div>
                  <p className="font-bold text-olive-900 dark:text-sand-50">{session.diningTable.label}</p>
                  <p className="text-sm text-olive-600 dark:text-olive-300">{session.total.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => setBillSession({ diningTableId: session.diningTableId })}
                  className="rounded-full border border-brick-500 px-3 py-1.5 text-sm text-brick-600 dark:text-brick-400"
                >
                  {t("waiter.closeBill")}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      {billSession && (
        <BillModal
          diningTableId={billSession.diningTableId}
          onClose={() => setBillSession(null)}
          onClosed={() => {
            setBillSession(null);
            loadAll();
          }}
        />
      )}
    </div>
  );
}
