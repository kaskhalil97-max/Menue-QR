import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bell,
  CheckCircle2,
  ChefHat,
  Clock,
  Loader2,
  Minus,
  Plus,
  Receipt,
  ShoppingBag,
  UtensilsCrossed,
  X,
  XCircle,
} from "lucide-react";
import { api } from "../../lib/api.js";
import { socket } from "../../lib/socket.js";
import LangSwitcher from "../../components/LangSwitcher.jsx";
import ThemeToggle from "../../components/ThemeToggle.jsx";

const STATUS_STEPS = ["new", "preparing", "ready", "served"];
const STATUS_ICON = {
  new: Clock,
  preparing: ChefHat,
  ready: CheckCircle2,
  served: UtensilsCrossed,
  cancelled: XCircle,
};
const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  preparing: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  ready: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  served: "bg-olive-200 text-olive-800 dark:bg-olive-500/15 dark:text-olive-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
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
  const [activeCategory, setActiveCategory] = useState(null);
  const [requestSent, setRequestSent] = useState("");
  const sectionRefs = useRef({});
  const chipRefs = useRef({});

  useEffect(() => {
    api
      .get(`/t/${qrToken}`)
      .then((res) => {
        setData(res.data);
        setActiveCategory(res.data.categories[0]?.id ?? null);
      })
      .catch(() => setNotFound(true));

    api.get(`/t/${qrToken}/orders`).then((res) => setOrders(res.data.orders || []));

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
            menuItems: cat.menuItems.map((mi) => (mi.id === menuItemId ? { ...mi, isAvailable } : mi)),
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

  // Suit la catégorie visible pendant le défilement pour surligner le bon onglet.
  useEffect(() => {
    if (!data || tab !== "menu") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const id = Number(visible[0].target.dataset.catId);
          setActiveCategory(id);
          chipRefs.current[id]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
      },
      { rootMargin: "-140px 0px -65% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [data, tab]);

  const cartTotal = useMemo(() => cart.reduce((s, c) => s + c.price * c.quantity, 0), [cart]);
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
        { menuItemId: item.id, name: localized(item, "name", lang), price: item.price, quantity, note },
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

  function scrollToCategory(id) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand-50 dark:bg-olive-950 p-6 text-center">
        <p className="text-lg text-olive-700 dark:text-sand-200">{t("client.tableNotFound")}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-sand-50 dark:bg-olive-950">
        <Loader2 className="h-8 w-8 animate-spin text-olive-500 dark:text-olive-400" />
        <p className="text-olive-500 dark:text-olive-400">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50 dark:bg-olive-950 pb-28">
      <header className="sticky top-0 z-20 bg-gradient-to-b from-olive-900 to-olive-800 px-4 pb-4 pt-4 text-white shadow-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            {data.restaurant.logo && (
              <img
                src={data.restaurant.logo}
                alt=""
                className="h-11 w-11 rounded-full border-2 border-white/30 object-cover"
              />
            )}
            <div>
              <p className="font-logo text-xl leading-tight">{data.restaurant.name}</p>
              <p className="text-xs text-olive-200">
                {t("client.yourTable")} · {data.table.label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle variant="onDark" />
            <LangSwitcher variant="onDark" />
          </div>
        </div>

        <div className="mx-auto mt-4 flex max-w-6xl gap-2">
          {["menu", "orders"].map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                tab === key ? "bg-white dark:bg-olive-900 text-olive-800 dark:text-sand-100" : "bg-white/10 text-white"
              }`}
            >
              {key === "menu" ? t("client.menu") : t("client.myOrders")}
              {key === "orders" && orders.length > 0 && (
                <span className="ms-1.5 rounded-full bg-white/25 px-1.5 text-xs">{orders.length}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      {tab === "menu" && (
        <>
          <nav className="no-scrollbar sticky top-[104px] z-10 mx-auto flex max-w-6xl gap-2 overflow-x-auto bg-sand-50/95 dark:bg-olive-950/95 px-4 py-2.5 backdrop-blur">
            {data.categories.map((cat) => (
              <button
                key={cat.id}
                ref={(el) => (chipRefs.current[cat.id] = el)}
                onClick={() => scrollToCategory(cat.id)}
                className={`flex-none whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  activeCategory === cat.id
                    ? "bg-olive-600 text-white shadow-card"
                    : "bg-white dark:bg-olive-800 text-olive-700 dark:text-sand-200"
                }`}
              >
                {localized(cat, "name", lang)}
              </button>
            ))}
          </nav>

          <main className="mx-auto max-w-6xl space-y-7 px-4 py-4">
            {data.categories.map((cat) => (
              <section
                key={cat.id}
                data-cat-id={cat.id}
                ref={(el) => (sectionRefs.current[cat.id] = el)}
                className="scroll-mt-[160px]"
              >
                <h2 className="mb-3 text-lg font-bold text-olive-900 dark:text-sand-50">{localized(cat, "name", lang)}</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {cat.menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => item.isAvailable && setActiveItem(item)}
                      disabled={!item.isAvailable}
                      className="group overflow-hidden rounded-2xl bg-white dark:bg-olive-900 text-start shadow-card transition hover:-translate-y-0.5 hover:shadow-floating disabled:hover:translate-y-0"
                    >
                      {item.image && (
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-sand-100 dark:bg-olive-800">
                          <img
                            src={item.image}
                            alt=""
                            className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${
                              !item.isAvailable ? "grayscale" : ""
                            }`}
                          />
                          <span className="absolute bottom-2 start-2 rounded-full bg-white/90 px-2.5 py-1 text-sm font-bold text-brick-600 shadow-sm">
                            {item.price} {data.restaurant.currency}
                          </span>
                          {!item.isAvailable && (
                            <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-700">
                                {t("client.unavailable")}
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                      <div className="p-3">
                        <p className="font-semibold text-olive-900 dark:text-sand-50">{localized(item, "name", lang)}</p>
                        <p className="line-clamp-2 text-xs text-olive-600 dark:text-olive-300">
                          {localized(item, "description", lang)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </main>
        </>
      )}

      {tab === "orders" && (
        <main className="mx-auto max-w-6xl px-4 py-4">
          {orders.length === 0 && <p className="text-center text-olive-500 dark:text-olive-400">{t("client.emptyCart")}</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => {
              const StatusIcon = STATUS_ICON[order.status];
              return (
                <div key={order.id} className="rounded-2xl bg-white dark:bg-olive-900 p-4 shadow-card">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold text-olive-800 dark:text-sand-100">#{order.id}</span>
                    <span
                      className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status]}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {t(`client.status.${order.status}`)}
                    </span>
                  </div>
                  <ul className="space-y-1 text-sm text-olive-700 dark:text-sand-200">
                    {order.items.map((it) => (
                      <li key={it.id} className="flex justify-between">
                        <span>
                          {it.quantity}× {it.name}
                          {it.note && <em className="ms-1 text-olive-500 dark:text-olive-400">({it.note})</em>}
                        </span>
                        <span>{(it.unitPrice * it.quantity).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  {order.status !== "cancelled" && (
                    <div className="mt-3 flex gap-1.5">
                      {STATUS_STEPS.map((step) => {
                        const reached = STATUS_STEPS.indexOf(order.status) >= STATUS_STEPS.indexOf(step);
                        return (
                          <div
                            key={step}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                              reached ? "bg-olive-600 dark:bg-olive-400" : "bg-olive-100 dark:bg-olive-800"
                            }`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      )}

      {activeItem && (
        <ItemModal
          item={activeItem}
          lang={lang}
          currency={data.restaurant.currency}
          onClose={() => setActiveItem(null)}
          onAdd={addToCart}
        />
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-sand-200 dark:border-olive-700 bg-white/95 dark:bg-olive-900/95 p-3 shadow-[0_-4px_16px_rgba(38,51,15,0.08)] backdrop-blur">
        <div className="mx-auto max-w-6xl space-y-2">
          {requestSent && (
            <p className="text-center text-sm font-medium text-olive-700 dark:text-sand-200">{t("client.requestSent")}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => sendServiceRequest("call_waiter")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-sand-100 dark:bg-olive-800 py-2 text-sm font-medium text-olive-800 dark:text-sand-100"
            >
              <Bell className="h-4 w-4" /> {t("client.callWaiter")}
            </button>
            <button
              onClick={() => sendServiceRequest("bill")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-sand-100 dark:bg-olive-800 py-2 text-sm font-medium text-olive-800 dark:text-sand-100"
            >
              <Receipt className="h-4 w-4" /> {t("client.requestBill")}
            </button>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setTab("cart")}
              className="flex w-full items-center justify-between rounded-full bg-brick-500 px-4 py-2.5 font-medium text-white shadow-floating"
            >
              <span className="flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4" />
                {t("client.viewCart")} ({cartCount})
              </span>
              <span>
                {cartTotal.toFixed(2)} {data.restaurant.currency}
              </span>
            </button>
          )}
        </div>
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
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 animate-fade-in sm:items-center">
      <div className="animate-slide-up w-full max-w-md rounded-t-3xl bg-white dark:bg-olive-900 sm:rounded-3xl">
        <div className="relative">
          {item.image && (
            <img src={item.image} alt="" className="h-48 w-full rounded-t-3xl object-cover sm:rounded-t-3xl" />
          )}
          <button
            onClick={onClose}
            className="absolute end-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-olive-800 shadow-sm"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          <h3 className="text-lg font-bold text-olive-900 dark:text-sand-50">{localized(item, "name", lang)}</h3>
          <p className="mb-2 text-sm text-olive-600 dark:text-olive-300">{localized(item, "description", lang)}</p>
          <p className="mb-4 text-lg font-bold text-brick-600 dark:text-brick-400">
            {item.price} {currency}
          </p>

          <label className="mb-1 block text-sm font-medium text-olive-700 dark:text-sand-200">{t("client.quantity")}</label>
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-sand-100 dark:bg-olive-800 text-olive-700 dark:text-sand-200"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center font-medium">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(20, q + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-sand-100 dark:bg-olive-800 text-olive-700 dark:text-sand-200"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("client.note.placeholder")}
            className="mb-4 w-full rounded-lg border border-sand-200 dark:border-olive-700 bg-white dark:bg-olive-950/40 px-3 py-2 text-sm text-olive-900 dark:text-sand-50 focus:border-olive-500 focus:outline-none"
          />

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-full border border-sand-200 dark:border-olive-700 py-2 font-medium text-olive-700 dark:text-sand-200"
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
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 animate-fade-in sm:items-center">
      <div className="animate-slide-up max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white dark:bg-olive-900 p-5 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-olive-900 dark:text-sand-50">{t("client.cart")}</h3>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-sand-100 dark:bg-olive-800">
            <X className="h-4 w-4 text-olive-700 dark:text-sand-200" />
          </button>
        </div>
        {cart.length === 0 ? (
          <p className="text-center text-olive-500 dark:text-olive-400">{t("client.emptyCart")}</p>
        ) : (
          <ul className="mb-4 space-y-3">
            {cart.map((c, idx) => (
              <li key={idx} className="flex items-start justify-between gap-2 border-b border-sand-100 dark:border-olive-800 pb-2">
                <div>
                  <p className="font-medium text-olive-800 dark:text-sand-100">
                    {c.quantity}× {c.name}
                  </p>
                  {c.note && <p className="text-xs text-olive-500 dark:text-olive-400">{c.note}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-olive-700 dark:text-sand-200">
                    {(c.price * c.quantity).toFixed(2)}
                  </span>
                  <button onClick={() => onRemove(idx)} className="text-red-500 dark:text-red-400">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mb-4 flex items-center justify-between font-bold text-olive-900 dark:text-sand-50">
          <span>{t("client.total")}</span>
          <span>
            {total.toFixed(2)} {currency}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-sand-200 dark:border-olive-700 py-2 font-medium text-olive-700 dark:text-sand-200"
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
