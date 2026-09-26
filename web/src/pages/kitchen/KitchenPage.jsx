import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api.js";
import { socket } from "../../lib/socket.js";
import { useAuth } from "../../lib/auth.jsx";
import LangSwitcher from "../../components/LangSwitcher.jsx";

const WARN_MIN = Number(import.meta.env.VITE_KITCHEN_TIMER_WARN_MIN || 10);
const DANGER_MIN = Number(import.meta.env.VITE_KITCHEN_TIMER_DANGER_MIN || 20);

function useElapsedMinutes(createdAt) {
  const [minutes, setMinutes] = useState(() => (Date.now() - new Date(createdAt)) / 60000);
  useEffect(() => {
    const id = setInterval(() => {
      setMinutes((Date.now() - new Date(createdAt)) / 60000);
    }, 5000);
    return () => clearInterval(id);
  }, [createdAt]);
  return minutes;
}

function timerColor(minutes) {
  if (minutes < WARN_MIN) return { bar: "bg-green-500", chip: "bg-green-100 text-green-700" };
  if (minutes < DANGER_MIN) return { bar: "bg-amber-500", chip: "bg-amber-100 text-amber-700" };
  return { bar: "bg-red-500", chip: "bg-red-100 text-red-700" };
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.6);
  } catch {
    // audio not available in this browser context
  }
}

export default function KitchenPage() {
  const { t } = useTranslation();
  const { user, token, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [serviceStarted, setServiceStarted] = useState(false);

  function loadOrders() {
    api.get("/kitchen/orders").then((res) => setOrders(res.data));
  }

  useEffect(() => {
    loadOrders();
    if (token) socket.emit("staff:auth", token);

    function onCreated() {
      loadOrders();
      if (serviceStarted) playBeep();
    }
    function onStatusChanged() {
      loadOrders();
    }
    socket.on("order.created", onCreated);
    socket.on("order.status_changed", onStatusChanged);
    return () => {
      socket.off("order.created", onCreated);
      socket.off("order.status_changed", onStatusChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceStarted, token]);

  async function advance(orderId) {
    await api.patch(`/kitchen/orders/${orderId}/advance`);
    loadOrders();
  }
  async function cancel(orderId) {
    await api.patch(`/kitchen/orders/${orderId}/cancel`);
    loadOrders();
  }

  return (
    <div className="min-h-screen bg-olive-50">
      <header className="flex items-center justify-between bg-white px-5 py-3 shadow-sm">
        <h1 className="text-xl font-bold text-olive-800">
          {t("kitchen.title")} — {user?.name}
        </h1>
        <div className="flex items-center gap-3">
          <LangSwitcher />
          {!serviceStarted ? (
            <button
              onClick={() => setServiceStarted(true)}
              className="rounded-full bg-brick-500 px-4 py-1.5 text-sm font-medium text-white"
            >
              {t("kitchen.startService")}
            </button>
          ) : (
            <span className="rounded-full bg-green-100 px-3 py-1.5 text-sm text-green-700">
              🔊 {t("kitchen.serviceStarted")}
            </span>
          )}
          <button onClick={logout} className="text-sm text-olive-600 underline">
            {t("staff.logout")}
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {orders.length === 0 && (
          <p className="col-span-full text-center text-olive-500">{t("kitchen.empty")}</p>
        )}
        {orders.map((order) => (
          <KitchenCard key={order.id} order={order} onAdvance={advance} onCancel={cancel} />
        ))}
      </main>
    </div>
  );
}

function KitchenCard({ order, onAdvance, onCancel }) {
  const { t } = useTranslation();
  const minutes = useElapsedMinutes(order.createdAt);
  const colors = timerColor(minutes);
  const table = order.tableSession.diningTable;

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <div className={`h-1.5 ${colors.bar}`} />
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-lg font-bold text-olive-800">{table.label}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors.chip}`}>
            {Math.floor(minutes)} min
          </span>
        </div>
        <span className="mb-2 inline-block rounded-full bg-olive-100 px-2 py-0.5 text-xs font-medium text-olive-700">
          {order.status === "new" ? t("kitchen.new") : t(`client.status.${order.status}`)}
        </span>
        <ul className="mb-3 space-y-1 text-sm text-olive-700">
          {order.items.map((it) => (
            <li key={it.id}>
              <span className="font-semibold">{it.quantity}×</span> {it.menuItem?.nameAr} / {it.name}
              {it.note && (
                <div className="text-xs italic text-brick-600">
                  {t("kitchen.note")}: {it.note}
                </div>
              )}
            </li>
          ))}
        </ul>
        {order.note && <p className="mb-3 text-xs italic text-brick-600">{order.note}</p>}
        <div className="flex gap-2">
          {order.status !== "ready" && (
            <button
              onClick={() => onAdvance(order.id)}
              className="flex-1 rounded-full bg-olive-600 py-2 text-sm font-medium text-white"
            >
              {order.status === "new" ? t("kitchen.advance.new") : t("kitchen.advance.preparing")}
            </button>
          )}
          {order.status !== "ready" && (
            <button
              onClick={() => onCancel(order.id)}
              className="rounded-full border border-red-300 px-3 py-2 text-sm text-red-600"
            >
              {t("kitchen.cancel")}
            </button>
          )}
          {order.status === "ready" && (
            <span className="flex-1 rounded-full bg-green-100 py-2 text-center text-sm font-medium text-green-700">
              {t("client.status.ready")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
