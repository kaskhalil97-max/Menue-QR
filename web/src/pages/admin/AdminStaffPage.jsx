import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api.js";

const emptyForm = { name: "", email: "", password: "", role: "waiter" };

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
      <form onSubmit={addUser} className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-olive-700">{t("common.name")}</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded-lg border border-olive-200 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-olive-700">{t("common.email")}</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="rounded-lg border border-olive-200 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-olive-700">{t("common.password")}</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="rounded-lg border border-olive-200 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-olive-700">{t("admin.staff.role")}</label>
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            className="rounded-lg border border-olive-200 px-3 py-1.5 text-sm"
          >
            <option value="admin">Admin</option>
            <option value="kitchen">Cuisine</option>
            <option value="waiter">Serveur</option>
          </select>
        </div>
        <button className="rounded-full bg-olive-600 px-4 py-1.5 text-sm font-medium text-white">
          {t("admin.staff.add")}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-start text-sm">
          <thead className="bg-olive-100 text-olive-700">
            <tr>
              <th className="px-4 py-2 text-start">{t("common.name")}</th>
              <th className="px-4 py-2 text-start">{t("common.email")}</th>
              <th className="px-4 py-2 text-start">{t("admin.staff.role")}</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-olive-50">
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2 capitalize">{u.role}</td>
                <td className="px-4 py-2 text-end">
                  <button onClick={() => deleteUser(u.id)} className="text-sm text-red-600">
                    {t("admin.menu.delete")}
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
