import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api.js";
import { socket } from "../../lib/socket.js";
import { useAuth } from "../../lib/auth.jsx";
import LangSwitcher from "../../components/LangSwitcher.jsx";

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
    <div className="min-h-screen bg-olive-50">
      <header className="flex items-center justify-between bg-white px-5 py-3 shadow-sm">
        <h1 className="text-xl font-bold text-olive-800">
          {t("waiter.title")} — {user?.name}
        </h1>
        <div className="flex items-center gap-3">
          <LangSwitcher />
          <button onClick={logout} className="text-sm text-olive-600 underline">
            {t("staff.logout")}
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-bold text-olive-800">{t("waiter.readyOrders")}</h2>
          <div className="space-y-3">
            {readyOrders.length === 0 && <p className="text-olive-500">{t("waiter.emptyReady")}</p>}
            {readyOrders.map((order) => (
              <div key={order.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-bold text-olive-800">{order.tableSession.diningTable.label}</span>
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs text-green-700">
                    {t("client.status.ready")}
                  </span>
                </div>
                <ul className="mb-3 text-sm text-olive-700">
                  {order.items.map((it) => (
                    <li key={it.id}>
                      {it.quantity}× {it.name}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => markServed(order.id)}
                  className="w-full rounded-full bg-olive-600 py-2 text-sm font-medium text-white"
                >
                  {t("waiter.served")}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-olive-800">{t("waiter.serviceRequests")}</h2>
          <div className="space-y-3">
            {requests.length === 0 && <p className="text-olive-500">{t("waiter.emptyRequests")}</p>}
            {requests.map((reqst) => (
              <div key={reqst.id} className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
                <div>
                  <p className="font-bold text-olive-800">{reqst.diningTable.label}</p>
                  <p className="text-sm text-olive-600">{t(`waiter.type.${reqst.type}`)}</p>
                </div>
                <div className="flex gap-2">
                  {reqst.type === "bill" && (
                    <button
                      onClick={() => setBillSession({ diningTableId: reqst.diningTableId })}
                      className="rounded-full border border-brick-500 px-3 py-1.5 text-sm text-brick-600"
                    >
                      {t("waiter.closeBill")}
                    </button>
                  )}
                  <button
                    onClick={() => markHandled(reqst.id)}
                    className="rounded-full bg-olive-600 px-3 py-1.5 text-sm text-white"
                  >
                    {t("waiter.handled")}
                  </button>
                </div>
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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6">
        {loading ? (
          <p className="text-center text-olive-500">{t("common.loading")}</p>
        ) : !session ? (
          <p className="text-center text-olive-500">—</p>
        ) : (
          <>
            <h3 className="mb-4 text-lg font-bold text-olive-800">
              {session.diningTable.label} — {t("waiter.closeBill")}
            </h3>
            <p className="mb-4 text-2xl font-bold text-brick-600">{session.total.toFixed(2)}</p>
            <label className="mb-1 block text-sm font-medium text-olive-700">
              {t("waiter.paymentMethod")}
            </label>
            <div className="mb-6 flex gap-2">
              {["cash", "card"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`flex-1 rounded-full border py-2 text-sm font-medium ${
                    method === m ? "border-olive-600 bg-olive-600 text-white" : "border-olive-300 text-olive-700"
                  }`}
                >
                  {t(`waiter.${m}`)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-full border border-olive-300 py-2 text-olive-700">
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
