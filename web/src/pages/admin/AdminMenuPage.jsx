import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api.js";

const emptyItemForm = {
  nameAr: "",
  nameEn: "",
  descriptionAr: "",
  descriptionEn: "",
  price: "",
  image: "",
};

export default function AdminMenuPage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ nameAr: "", nameEn: "" });
  const [itemForms, setItemForms] = useState({}); // categoryId -> form state
  const [editingItem, setEditingItem] = useState(null); // {id, ...fields}

  function load() {
    api.get("/admin/categories").then((res) => setCategories(res.data));
  }
  useEffect(load, []);

  async function addCategory(e) {
    e.preventDefault();
    if (!newCategory.nameAr || !newCategory.nameEn) return;
    await api.post("/admin/categories", { ...newCategory, position: categories.length });
    setNewCategory({ nameAr: "", nameEn: "" });
    load();
  }

  async function deleteCategory(id) {
    if (!confirm("Supprimer cette catégorie et ses plats ?")) return;
    await api.delete(`/admin/categories/${id}`);
    load();
  }

  function updateItemForm(categoryId, field, value) {
    setItemForms((prev) => ({
      ...prev,
      [categoryId]: { ...(prev[categoryId] || emptyItemForm), [field]: value },
    }));
  }

  async function addItem(categoryId) {
    const form = itemForms[categoryId] || emptyItemForm;
    if (!form.nameAr || !form.nameEn || !form.price) return;
    await api.post("/admin/menu-items", { categoryId, ...form, price: Number(form.price) });
    setItemForms((prev) => ({ ...prev, [categoryId]: emptyItemForm }));
    load();
  }

  async function toggleAvailable(itemId) {
    await api.patch(`/admin/menu-items/${itemId}/toggle-available`);
    load();
  }

  async function deleteItem(itemId) {
    if (!confirm("Supprimer ce plat ?")) return;
    await api.delete(`/admin/menu-items/${itemId}`);
    load();
  }

  async function saveEdit() {
    const { id, ...fields } = editingItem;
    await api.patch(`/admin/menu-items/${id}`, { ...fields, price: Number(fields.price) });
    setEditingItem(null);
    load();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={addCategory} className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-olive-700">{t("common.nameAr")}</label>
          <input
            value={newCategory.nameAr}
            onChange={(e) => setNewCategory((c) => ({ ...c, nameAr: e.target.value }))}
            className="rounded-lg border border-olive-200 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-olive-700">{t("common.nameEn")}</label>
          <input
            value={newCategory.nameEn}
            onChange={(e) => setNewCategory((c) => ({ ...c, nameEn: e.target.value }))}
            className="rounded-lg border border-olive-200 px-3 py-1.5 text-sm"
          />
        </div>
        <button className="rounded-full bg-olive-600 px-4 py-1.5 text-sm font-medium text-white">
          {t("admin.menu.addCategory")}
        </button>
      </form>

      {categories.map((cat) => (
        <div key={cat.id} className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-olive-800">
              {cat.nameEn} / {cat.nameAr}
            </h3>
            <button onClick={() => deleteCategory(cat.id)} className="text-sm text-red-600">
              {t("admin.menu.delete")}
            </button>
          </div>

          <div className="mb-4 space-y-2">
            {cat.menuItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-olive-100 p-2">
                <div className="flex items-center gap-3">
                  {item.image && <img src={item.image} alt="" className="h-12 w-12 rounded object-cover" />}
                  <div>
                    <p className="font-medium text-olive-800">
                      {item.nameEn} / {item.nameAr}
                    </p>
                    <p className="text-sm text-olive-600">{item.price} MAD</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAvailable(item.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      item.isAvailable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.isAvailable ? t("admin.menu.available") : t("admin.menu.soldOut")}
                  </button>
                  <button
                    onClick={() =>
                      setEditingItem({
                        id: item.id,
                        nameAr: item.nameAr,
                        nameEn: item.nameEn,
                        descriptionAr: item.descriptionAr || "",
                        descriptionEn: item.descriptionEn || "",
                        price: item.price,
                        image: item.image || "",
                      })
                    }
                    className="text-sm text-olive-600 underline"
                  >
                    {t("admin.menu.edit")}
                  </button>
                  <button onClick={() => deleteItem(item.id)} className="text-sm text-red-600">
                    {t("admin.menu.delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-lg bg-olive-50 p-3 sm:grid-cols-3 lg:grid-cols-6">
            {["nameAr", "nameEn", "descriptionAr", "descriptionEn", "price", "image"].map((field) => (
              <input
                key={field}
                placeholder={t(`common.${field}`)}
                value={(itemForms[cat.id] || emptyItemForm)[field]}
                onChange={(e) => updateItemForm(cat.id, field, e.target.value)}
                className="rounded-lg border border-olive-200 px-2 py-1.5 text-sm"
              />
            ))}
            <button
              onClick={() => addItem(cat.id)}
              className="col-span-2 rounded-full bg-brick-500 px-3 py-1.5 text-sm font-medium text-white sm:col-span-1"
            >
              {t("admin.menu.addItem")}
            </button>
          </div>
        </div>
      ))}

      {editingItem && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-2 rounded-2xl bg-white p-6">
            <h3 className="mb-2 text-lg font-bold text-olive-800">{t("admin.menu.edit")}</h3>
            {["nameAr", "nameEn", "descriptionAr", "descriptionEn", "price", "image"].map((field) => (
              <input
                key={field}
                placeholder={t(`common.${field}`)}
                value={editingItem[field]}
                onChange={(e) => setEditingItem((prev) => ({ ...prev, [field]: e.target.value }))}
                className="w-full rounded-lg border border-olive-200 px-3 py-1.5 text-sm"
              />
            ))}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditingItem(null)}
                className="flex-1 rounded-full border border-olive-300 py-2 text-olive-700"
              >
                {t("admin.menu.cancel")}
              </button>
              <button onClick={saveEdit} className="flex-1 rounded-full bg-olive-600 py-2 font-medium text-white">
                {t("admin.menu.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
