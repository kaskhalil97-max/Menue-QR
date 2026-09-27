import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banknote, Bell, Check, CreditCard, Receipt, UtensilsCrossed, X } from "lucide-react";
import { api } from "../../lib/api.js";
import { socket } from "../../lib/socket.js";
import { useAuth } from "../../lib/auth.jsx";
import LangSwitcher from "../../components/LangSwitcher.jsx";
import ThemeToggle from "../../components/ThemeToggle.jsx";

const REQUEST_ICON = { call_waiter: Bell, bill: Receipt };

export default function WaiterPage() {
  const { t } = useTranslation();
  const { user, token, logout } = useAuth();
  const [readyOrders, setReadyOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [billSession, setBillSession] = useState(null);

  function loadAll() {
    api.get("/waiter/orders/ready").then((res) => setReadyOrders(res.data));
    api.get("/waiter/service-requests").then((res) => setRequests(res.data));
  }

  useEffect(() => {
    loadAll();
    if (token) socket.emit("staff:auth", token);
    socket.on("order.status_changed", loadAll);
    socket.on("service_request.created", loadAll);
    socket.on("service_request.updated", loadAll);
    return () => {
      socket.off("order.status_changed", loadAll);
      socket.off("service_request.created", loadAll);
      socket.off("service_request.updated", loadAll);
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

function BillModal({ diningTableId, onClose, onClosed }) {
  const { t } = useTranslation();
  const [session, setSession] = useState(null);
  const [method, setMethod] = useState("cash");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/waiter/tables/${diningTableId}/open-session`)
      .then((res) => setSession(res.data))
      .finally(() => setLoading(false));
  }, [diningTableId]);

  async function confirm() {
    if (!session) return;
    await api.patch(`/waiter/sessions/${session.id}/close`, { paymentMethod: method });
    onClosed();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 animate-fade-in p-4">
      <div className="animate-slide-up w-full max-w-sm rounded-3xl bg-white dark:bg-olive-900 p-6">
        {loading ? (
          <p className="text-center text-olive-500 dark:text-olive-400">{t("common.loading")}</p>
        ) : !session ? (
          <p className="text-center text-olive-500 dark:text-olive-400">—</p>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-olive-900 dark:text-sand-50">
                {session.diningTable.label} — {t("waiter.closeBill")}
              </h3>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-sand-100 dark:bg-olive-800">
                <X className="h-4 w-4 text-olive-700 dark:text-sand-200" />
              </button>
            </div>
            <p className="mb-4 text-2xl font-bold text-brick-600 dark:text-brick-400">{session.total.toFixed(2)}</p>
            <label className="mb-1 block text-sm font-medium text-olive-700 dark:text-sand-200">
              {t("waiter.paymentMethod")}
            </label>
            <div className="mb-6 flex gap-2">
              {[
                { key: "cash", icon: Banknote },
                { key: "card", icon: CreditCard },
              ].map(({ key, icon: MIcon }) => (
                <button
                  key={key}
                  onClick={() => setMethod(key)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border py-2 text-sm font-medium ${
                    method === key
                      ? "border-olive-600 bg-olive-600 text-white"
                      : "border-sand-200 dark:border-olive-700 text-olive-700 dark:text-sand-200"
                  }`}
                >
                  <MIcon className="h-4 w-4" /> {t(`waiter.${key}`)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-full border border-sand-200 dark:border-olive-700 py-2 text-olive-700 dark:text-sand-200">
                {t("client.close")}
              </button>
              <button onClick={confirm} className="flex-1 rounded-full bg-brick-500 py-2 font-medium text-white">
                {t("waiter.confirmClose")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
