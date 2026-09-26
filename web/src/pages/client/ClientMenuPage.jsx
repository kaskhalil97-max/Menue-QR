import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api.js";
import { socket } from "../../lib/socket.js";
import LangSwitcher from "../../components/LangSwitcher.jsx";

const STATUS_STEPS = ["new", "preparing", "ready", "served"];
const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-700",
  preparing: "bg-amber-100 text-amber-700",
  ready: "bg-green-100 text-green-700",
  served: "bg-olive-200 text-olive-800",
  cancelled: "bg-red-100 text-red-700",
};

function localized(obj, field, lang) {
  const key = lang === "ar" ? `${field}Ar` : `${field}En`;
  return obj[key] || obj[`${field}En`] || obj[`${field}Ar`] || "";
}

export default function ClientMenuPage() {
  const { qrToken } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [tab, setTab] = useState("menu");
  const [activeItem, setActiveItem] = useState(null);
  const [requestSent, setRequestSent] = useState("");

  useEffect(() => {
    api
      .get(`/t/${qrToken}`)
      .then((res) => setData(res.data))
      .catch(() => setNotFound(true));

    api
      .get(`/t/${qrToken}/orders`)
      .then((res) => setOrders(res.data.orders || []));

    socket.emit("table:join", qrToken);

    function onOrderCreated(payload) {
      if (payload.table.qrToken !== qrToken) return;
      setOrders((prev) => [...prev, payload.order]);
    }
    function onStatusChanged(payload) {
      if (payload.table.qrToken !== qrToken) return;
      setOrders((prev) => prev.map((o) => (o.id === payload.order.id ? { ...o, ...payload.order } : o)));
    }
    function onAvailabilityChanged({ menuItemId, isAvailable }) {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          categories: prev.categories.map((cat) => ({
            ...cat,
            menuItems: cat.menuItems.map((mi) =>
              mi.id === menuItemId ? { ...mi, isAvailable } : mi
            ),
          })),
        };
      });
    }

    socket.on("order.created", onOrderCreated);
    socket.on("order.status_changed", onStatusChanged);
    socket.on("menu_item.availability_changed", onAvailabilityChanged);

    return () => {
      socket.off("order.created", onOrderCreated);
      socket.off("order.status_changed", onStatusChanged);
      socket.off("menu_item.availability_changed", onAvailabilityChanged);
    };
  }, [qrToken]);

  useEffect(() => {
    if (data?.restaurant?.slug) socket.emit("menu:join", data.restaurant.slug);
  }, [data?.restaurant?.slug]);

  const cartTotal = useMemo(
    () => cart.reduce((s, c) => s + c.price * c.quantity, 0),
    [cart]
  );
  const cartCount = useMemo(() => cart.reduce((s, c) => s + c.quantity, 0), [cart]);

  function addToCart(item, quantity, note) {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.menuItemId === item.id && c.note === note);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity };
        return next;
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: localized(item, "name", lang),
          price: item.price,
          quantity,
          note,
        },
      ];
    });
    setActiveItem(null);
    setTab("menu");
  }

  function removeFromCart(idx) {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  }

  async function sendOrder() {
    if (cart.length === 0) return;
    await api.post(`/t/${qrToken}/orders`, {
      items: cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity, note: c.note })),
    });
    setCart([]);
    setTab("orders");
  }

  async function sendServiceRequest(type) {
    await api.post(`/t/${qrToken}/service-requests`, { type });
    setRequestSent(type);
    setTimeout(() => setRequestSent(""), 3000);
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-olive-50 p-6 text-center">
        <p className="text-lg text-olive-700">{t("client.tableNotFound")}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-olive-50">
        <p className="text-olive-600">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-olive-50 pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          {data.restaurant.logo && (
            <img src={data.restaurant.logo} alt="" className="h-9 w-9 rounded-full object-cover" />
          )}
          <div>
            <p className="font-bold text-olive-800">{data.restaurant.name}</p>
            <p className="text-xs text-olive-600">
              {t("client.yourTable")}: {data.table.label}
            </p>
          </div>
        </div>
        <LangSwitcher />
      </header>

      <nav className="sticky top-[57px] z-10 flex gap-2 bg-olive-50 px-4 py-2">
        {["menu", "orders"].map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === key ? "bg-olive-600 text-white" : "bg-white text-olive-700"
            }`}
          >
            {key === "menu" ? t("client.menu") : t("client.myOrders")}
            {key === "orders" && orders.length > 0 && (
              <span className="ms-1.5 rounded-full bg-white/30 px-1.5 text-xs">{orders.length}</span>
            )}
          </button>
        ))}
      </nav>

      {tab === "menu" && (
        <main className="space-y-6 px-4 py-3">
          {data.categories.map((cat) => (
            <section key={cat.id}>
              <h2 className="mb-2 text-lg font-bold text-olive-800">{localized(cat, "name", lang)}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {cat.menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => item.isAvailable && setActiveItem(item)}
                    disabled={!item.isAvailable}
                    className={`flex gap-3 rounded-xl bg-white p-3 text-start shadow-sm transition hover:shadow-md ${
                      !item.isAvailable ? "opacity-50" : ""
                    }`}
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt=""
                        className="h-20 w-20 flex-none rounded-lg object-cover"
                      />
                    )}
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <p className="font-semibold text-olive-800">{localized(item, "name", lang)}</p>
                        <p className="line-clamp-2 text-xs text-olive-600">
                          {localized(item, "description", lang)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-brick-600">
                          {item.price} {data.restaurant.currency}
                        </span>
                        {!item.isAvailable && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                            {t("client.unavailable")}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </main>
      )}

      {tab === "orders" && (
        <main className="space-y-3 px-4 py-3">
          {orders.length === 0 && <p className="text-center text-olive-500">{t("client.emptyCart")}</p>}
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-olive-800">#{order.id}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                  {t(`client.status.${order.status}`)}
                </span>
              </div>
              <ul className="space-y-1 text-sm text-olive-700">
                {order.items.map((it) => (
                  <li key={it.id} className="flex justify-between">
                    <span>
                      {it.quantity}× {it.name}
                      {it.note && <em className="ms-1 text-olive-500">({it.note})</em>}
                    </span>
                    <span>{(it.unitPrice * it.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              {order.status !== "cancelled" && (
                <div className="mt-3 flex gap-1.5">
                  {STATUS_STEPS.map((step) => {
                    const reached =
                      STATUS_STEPS.indexOf(order.status) >= STATUS_STEPS.indexOf(step);
                    return (
                      <div
                        key={step}
                        className={`h-1.5 flex-1 rounded-full ${reached ? "bg-olive-600" : "bg-olive-100"}`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </main>
      )}

      {/* Item detail modal */}
      {activeItem && (
        <ItemModal
          item={activeItem}
          lang={lang}
          currency={data.restaurant.currency}
          onClose={() => setActiveItem(null)}
          onAdd={addToCart}
        />
      )}

      {/* Bottom bar: cart + service buttons */}
      <div className="fixed inset-x-0 bottom-0 z-20 space-y-2 bg-white/95 p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur">
        {requestSent && (
          <p className="text-center text-sm font-medium text-olive-700">{t("client.requestSent")}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => sendServiceRequest("call_waiter")}
            className="flex-1 rounded-full border border-olive-300 py-2 text-sm font-medium text-olive-700"
          >
            🔔 {t("client.callWaiter")}
          </button>
          <button
            onClick={() => sendServiceRequest("bill")}
            className="flex-1 rounded-full border border-olive-300 py-2 text-sm font-medium text-olive-700"
          >
            🧾 {t("client.requestBill")}
          </button>
        </div>
        {cart.length > 0 && (
          <button
            onClick={() => setTab("cart")}
            className="flex w-full items-center justify-between rounded-full bg-brick-500 px-4 py-2.5 font-medium text-white"
          >
            <span>
              {t("client.viewCart")} ({cartCount})
            </span>
            <span>
              {cartTotal.toFixed(2)} {data.restaurant.currency}
            </span>
          </button>
        )}
      </div>

      {tab === "cart" && (
        <CartModal
          cart={cart}
          currency={data.restaurant.currency}
          total={cartTotal}
          onRemove={removeFromCart}
          onClose={() => setTab("menu")}
          onSend={sendOrder}
        />
      )}
    </div>
  );
}

function ItemModal({ item, lang, currency, onClose, onAdd }) {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        {item.image && (
          <img src={item.image} alt="" className="mb-3 h-40 w-full rounded-xl object-cover" />
        )}
        <h3 className="text-lg font-bold text-olive-800">{localized(item, "name", lang)}</h3>
        <p className="mb-2 text-sm text-olive-600">{localized(item, "description", lang)}</p>
        <p className="mb-4 font-bold text-brick-600">
          {item.price} {currency}
        </p>

        <label className="mb-1 block text-sm font-medium text-olive-700">
          {t("client.quantity")}
        </label>
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="h-9 w-9 rounded-full bg-olive-100 text-lg font-bold text-olive-700"
          >
            −
          </button>
          <span className="w-6 text-center font-medium">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => Math.min(20, q + 1))}
            className="h-9 w-9 rounded-full bg-olive-100 text-lg font-bold text-olive-700"
          >
            +
          </button>
        </div>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("client.note.placeholder")}
          className="mb-4 w-full rounded-lg border border-olive-200 px-3 py-2 text-sm focus:border-olive-500 focus:outline-none"
        />

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-olive-300 py-2 font-medium text-olive-700"
          >
            {t("client.close")}
          </button>
          <button
            onClick={() => onAdd(item, quantity, note)}
            className="flex-1 rounded-full bg-olive-600 py-2 font-medium text-white"
          >
            {t("client.addToCart")}
          </button>
        </div>
      </div>
    </div>
  );
}

function CartModal({ cart, currency, total, onRemove, onClose, onSend }) {
  const { t } = useTranslation();
  const [sending, setSending] = useState(false);

  async function handleSend() {
    setSending(true);
    try {
      await onSend();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <h3 className="mb-4 text-lg font-bold text-olive-800">{t("client.cart")}</h3>
        {cart.length === 0 ? (
          <p className="text-center text-olive-500">{t("client.emptyCart")}</p>
        ) : (
          <ul className="mb-4 space-y-3">
            {cart.map((c, idx) => (
              <li key={idx} className="flex items-start justify-between gap-2 border-b border-olive-100 pb-2">
                <div>
                  <p className="font-medium text-olive-800">
                    {c.quantity}× {c.name}
                  </p>
                  {c.note && <p className="text-xs text-olive-500">{c.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-olive-700">
                    {(c.price * c.quantity).toFixed(2)}
                  </span>
                  <button onClick={() => onRemove(idx)} className="text-red-500">
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mb-4 flex items-center justify-between font-bold text-olive-800">
          <span>{t("client.total")}</span>
          <span>
            {total.toFixed(2)} {currency}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-olive-300 py-2 font-medium text-olive-700"
          >
            {t("client.close")}
          </button>
          <button
            onClick={handleSend}
            disabled={cart.length === 0 || sending}
            className="flex-1 rounded-full bg-brick-500 py-2 font-medium text-white disabled:opacity-50"
          >
            {t("client.sendOrder")}
          </button>
        </div>
      </div>
    </div>
  );
}
