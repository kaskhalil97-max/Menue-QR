import { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api.js";

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function AdminHistoryPage() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState(null);

  function load() {
    const params = {};
    if (from) params.from = new Date(from).toISOString();
    if (to) params.to = new Date(to).toISOString();
    api.get("/admin/history/sessions", { params }).then((res) => setSessions(res.data));
  }

  useEffect(load, []);

  function toggle(id) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-olive-700">{t("admin.history.from")}</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-olive-200 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-olive-700">{t("admin.history.to")}</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-olive-200 px-3 py-1.5 text-sm"
          />
        </div>
        <button onClick={load} className="rounded-full bg-olive-600 px-4 py-1.5 text-sm font-medium text-white">
          {t("admin.history.filter")}
        </button>
      </div>

      {!sessions ? (
        <p className="text-olive-500">{t("common.loading")}</p>
      ) : sessions.length === 0 ? (
        <p className="text-center text-olive-500">{t("admin.history.empty")}</p>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <table className="w-full text-start text-sm">
            <thead className="bg-olive-100 text-olive-700">
              <tr>
                <th className="px-4 py-2 text-start">{t("admin.history.table")}</th>
                <th className="px-4 py-2 text-start">{t("admin.history.closedAt")}</th>
                <th className="px-4 py-2 text-start">{t("waiter.paymentMethod")}</th>
                <th className="px-4 py-2 text-start">{t("client.total")}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <Fragment key={session.id}>
                  <tr className="border-t border-olive-50">
                    <td className="px-4 py-2 font-medium text-olive-800">{session.diningTable.label}</td>
                    <td className="px-4 py-2 text-olive-600">{formatDateTime(session.closedAt)}</td>
                    <td className="px-4 py-2 capitalize text-olive-600">
                      {session.paymentMethod ? t(`waiter.${session.paymentMethod}`) : "—"}
                    </td>
                    <td className="px-4 py-2 font-semibold text-brick-600">{session.total.toFixed(2)}</td>
                    <td className="px-4 py-2 text-end">
                      <button onClick={() => toggle(session.id)} className="text-sm text-olive-600 underline">
                        {expanded === session.id ? t("admin.history.hide") : t("admin.history.details")}
                      </button>
                    </td>
                  </tr>
                  {expanded === session.id && (
                    <tr className="border-t border-olive-50 bg-olive-50">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="space-y-3">
                          {session.orders.map((order) => (
                            <div key={order.id}>
                              <p className="mb-1 text-xs font-semibold text-olive-500">
                                #{order.id} — {formatDateTime(order.createdAt)}
                              </p>
                              <ul className="space-y-0.5 text-olive-700">
                                {order.items.map((item) => (
                                  <li key={item.id} className="flex justify-between">
                                    <span>
                                      {item.quantity}× {item.name}
                                      {item.note && <em className="ms-1 text-olive-500">({item.note})</em>}
                                    </span>
                                    <span>{(item.unitPrice * item.quantity).toFixed(2)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                          {session.orders.length === 0 && (
                            <p className="text-olive-500">{t("admin.history.empty")}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
