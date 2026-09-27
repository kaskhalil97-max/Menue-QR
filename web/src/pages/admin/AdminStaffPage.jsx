import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, UserPlus } from "lucide-react";
import { api } from "../../lib/api.js";

const emptyForm = { name: "", email: "", password: "", role: "waiter" };

const ROLE_BADGE = {
  admin: "bg-olive-100 text-olive-800",
  kitchen: "bg-amber-100 text-amber-700",
  waiter: "bg-blue-100 text-blue-700",
};

export default function AdminStaffPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  function load() {
    api.get("/admin/users").then((res) => setUsers(res.data));
  }
  useEffect(load, []);

  async function addUser(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/admin/users", form);
      setForm(emptyForm);
      load();
    } catch {
      setError("Email déjà utilisé ou champs invalides");
    }
  }

  async function deleteUser(id) {
    if (!confirm("Supprimer ce compte ?")) return;
    await api.delete(`/admin/users/${id}`);
    load();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addUser} className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-card">
        <div>
          <label className="mb-1 block text-xs font-medium text-olive-700">{t("common.name")}</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-olive-700">{t("common.email")}</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-olive-700">{t("common.password")}</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-olive-700">{t("admin.staff.role")}</label>
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            className="rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
          >
            <option value="admin">Admin</option>
            <option value="kitchen">Cuisine</option>
            <option value="waiter">Serveur</option>
          </select>
        </div>
        <button className="flex items-center gap-1.5 rounded-full bg-olive-600 px-4 py-1.5 text-sm font-medium text-white">
          <UserPlus className="h-4 w-4" /> {t("admin.staff.add")}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        <table className="w-full text-start text-sm">
          <thead className="bg-sand-100 text-olive-700">
            <tr>
              <th className="px-4 py-2 text-start">{t("common.name")}</th>
              <th className="px-4 py-2 text-start">{t("common.email")}</th>
              <th className="px-4 py-2 text-start">{t("admin.staff.role")}</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-sand-100">
                <td className="px-4 py-2 font-medium text-olive-900">{u.name}</td>
                <td className="px-4 py-2 text-olive-700">{u.email}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_BADGE[u.role]}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-2 text-end">
                  <button
                    onClick={() => deleteUser(u.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
