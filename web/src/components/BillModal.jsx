import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banknote, CreditCard, X } from "lucide-react";
import { api } from "../lib/api.js";

// Clôture manuelle d'une addition pour une table, indépendamment du fait que
// le client ait ou non demandé l'addition depuis l'app (utilisé par le
// serveur et par le gérant).
export default function BillModal({ diningTableId, onClose, onClosed }) {
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
