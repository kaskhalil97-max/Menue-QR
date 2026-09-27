import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "../../lib/api.js";
import ImageUploadField from "../../components/ImageUploadField.jsx";

const TEXT_FIELDS = ["nameAr", "nameEn", "descriptionAr", "descriptionEn", "price"];

const emptyItemForm = {
  nameAr: "",
  nameEn: "",
  descriptionAr: "",
  descriptionEn: "",
  price: "",
  image: "",
};

const emptyGroupForm = { nameAr: "", nameEn: "", type: "single", required: false };
const emptyChoiceForm = { nameAr: "", nameEn: "", priceDelta: "" };

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
      <form onSubmit={addCategory} className="flex flex-wrap items-end gap-3 rounded-2xl bg-white dark:bg-olive-900 p-4 shadow-card">
        <div>
          <label className="mb-1 block text-xs font-medium text-olive-700 dark:text-sand-200">{t("common.nameAr")}</label>
          <input
            value={newCategory.nameAr}
            onChange={(e) => setNewCategory((c) => ({ ...c, nameAr: e.target.value }))}
            className="rounded-lg border border-sand-200 dark:border-olive-700 bg-white dark:bg-olive-950/40 px-3 py-1.5 text-sm text-olive-900 dark:text-sand-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-olive-700 dark:text-sand-200">{t("common.nameEn")}</label>
          <input
            value={newCategory.nameEn}
            onChange={(e) => setNewCategory((c) => ({ ...c, nameEn: e.target.value }))}
            className="rounded-lg border border-sand-200 dark:border-olive-700 bg-white dark:bg-olive-950/40 px-3 py-1.5 text-sm text-olive-900 dark:text-sand-50"
          />
        </div>
        <button className="flex items-center gap-1.5 rounded-full bg-olive-600 px-4 py-1.5 text-sm font-medium text-white">
          <Plus className="h-4 w-4" /> {t("admin.menu.addCategory")}
        </button>
      </form>

      {categories.map((cat) => (
        <div key={cat.id} className="rounded-2xl bg-white dark:bg-olive-900 p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-olive-900 dark:text-sand-50">
              {cat.nameEn} / {cat.nameAr}
            </h3>
            <button
              onClick={() => deleteCategory(cat.id)}
              className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" /> {t("admin.menu.delete")}
            </button>
          </div>

          <div className="mb-4 space-y-2">
            {cat.menuItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-sand-100 dark:border-olive-800 p-2">
                <div className="flex items-center gap-3">
                  {item.image && <img src={item.image} alt="" className="h-12 w-12 rounded-lg object-cover" />}
                  <div>
                    <p className="font-medium text-olive-900 dark:text-sand-50">
                      {item.nameEn} / {item.nameAr}
                    </p>
                    <p className="text-sm text-olive-600 dark:text-olive-300">{item.price} MAD</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAvailable(item.id)}
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                      item.isAvailable ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                    }`}
                  >
                    {item.isAvailable ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
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
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-sand-100 dark:bg-olive-800 text-olive-700 dark:text-sand-200"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-xl bg-sand-100 dark:bg-olive-800 p-3">
            <ImageUploadField
              value={(itemForms[cat.id] || emptyItemForm).image}
              onChange={(url) => updateItemForm(cat.id, "image", url)}
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {TEXT_FIELDS.map((field) => (
                <input
                  key={field}
                  placeholder={t(`common.${field}`)}
                  value={(itemForms[cat.id] || emptyItemForm)[field]}
                  onChange={(e) => updateItemForm(cat.id, field, e.target.value)}
                  className="rounded-lg border border-sand-200 dark:border-olive-700 bg-white dark:bg-olive-950/40 px-2 py-1.5 text-sm text-olive-900 dark:text-sand-50"
                />
              ))}
              <button
                onClick={() => addItem(cat.id)}
                className="col-span-2 flex items-center justify-center gap-1.5 rounded-full bg-brick-500 px-3 py-1.5 text-sm font-medium text-white sm:col-span-1"
              >
                <Plus className="h-4 w-4" /> {t("admin.menu.addItem")}
              </button>
            </div>
          </div>
        </div>
      ))}

      {editingItem && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 animate-fade-in p-4">
          <div className="animate-slide-up w-full max-w-md space-y-2 rounded-3xl bg-white dark:bg-olive-900 p-6">
            <h3 className="mb-2 text-lg font-bold text-olive-900 dark:text-sand-50">{t("admin.menu.edit")}</h3>
            <ImageUploadField
              value={editingItem.image}
              onChange={(url) => setEditingItem((prev) => ({ ...prev, image: url }))}
            />
            {TEXT_FIELDS.map((field) => (
              <input
                key={field}
                placeholder={t(`common.${field}`)}
                value={editingItem[field]}
                onChange={(e) => setEditingItem((prev) => ({ ...prev, [field]: e.target.value }))}
                className="w-full rounded-lg border border-sand-200 dark:border-olive-700 bg-white dark:bg-olive-950/40 px-3 py-1.5 text-sm text-olive-900 dark:text-sand-50"
              />
            ))}

            <OptionGroupsEditor
              itemId={editingItem.id}
              groups={categories.flatMap((c) => c.menuItems).find((i) => i.id === editingItem.id)?.optionGroups || []}
              onChanged={load}
            />

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditingItem(null)}
                className="flex-1 rounded-full border border-sand-200 dark:border-olive-700 py-2 text-olive-700 dark:text-sand-200"
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

// Gestion des groupes d'options d'un plat (ex. "Sauce" à choix unique et
// gratuit, "Suppléments" à choix multiples et payants) — entièrement libre,
// c'est l'admin qui décide du nom, du type et du prix de chaque choix.
function OptionGroupsEditor({ itemId, groups, onChanged }) {
  const { t } = useTranslation();
  const [newGroup, setNewGroup] = useState(emptyGroupForm);
  const [choiceForms, setChoiceForms] = useState({});

  async function addGroup(e) {
    e.preventDefault();
    if (!newGroup.nameAr || !newGroup.nameEn) return;
    await api.post(`/admin/menu-items/${itemId}/option-groups`, newGroup);
    setNewGroup(emptyGroupForm);
    onChanged();
  }

  async function deleteGroup(id) {
    if (!confirm("Supprimer ce groupe et ses choix ?")) return;
    await api.delete(`/admin/option-groups/${id}`);
    onChanged();
  }

  async function toggleRequired(group) {
    await api.patch(`/admin/option-groups/${group.id}`, { required: !group.required });
    onChanged();
  }

  function updateChoiceForm(groupId, field, value) {
    setChoiceForms((prev) => ({ ...prev, [groupId]: { ...(prev[groupId] || emptyChoiceForm), [field]: value } }));
  }

  async function addChoice(groupId) {
    const form = choiceForms[groupId] || emptyChoiceForm;
    if (!form.nameAr || !form.nameEn) return;
    await api.post(`/admin/option-groups/${groupId}/choices`, {
      ...form,
      priceDelta: Number(form.priceDelta) || 0,
    });
    setChoiceForms((prev) => ({ ...prev, [groupId]: emptyChoiceForm }));
    onChanged();
  }

  async function deleteChoice(id) {
    await api.delete(`/admin/option-choices/${id}`);
    onChanged();
  }

  return (
    <div className="space-y-3 rounded-xl bg-sand-100 dark:bg-olive-800 p-3">
      <p className="text-sm font-semibold text-olive-800 dark:text-sand-100">{t("admin.options.title")}</p>

      {groups.map((group) => (
        <div key={group.id} className="rounded-lg bg-white dark:bg-olive-900 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="font-medium text-olive-900 dark:text-sand-50">
                {group.nameEn} / {group.nameAr}
              </p>
              <p className="text-xs text-olive-500 dark:text-olive-400">
                {group.type === "single" ? t("admin.options.single") : t("admin.options.multiple")}
                {group.required ? ` · ${t("client.required")}` : ""}
              </p>
            </div>
            <div className="flex flex-none items-center gap-1.5">
              <button
                onClick={() => toggleRequired(group)}
                className="whitespace-nowrap rounded-full bg-sand-100 dark:bg-olive-800 px-2 py-1 text-xs text-olive-700 dark:text-sand-200"
              >
                {group.required ? t("admin.options.makeOptional") : t("admin.options.makeRequired")}
              </button>
              <button
                onClick={() => deleteGroup(group.id)}
                className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mb-2 space-y-1">
            {group.choices.map((choice) => (
              <div
                key={choice.id}
                className="flex items-center justify-between rounded border border-sand-100 dark:border-olive-800 px-2 py-1 text-sm"
              >
                <span className="text-olive-800 dark:text-sand-100">
                  {choice.nameEn} / {choice.nameAr}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-olive-600 dark:text-olive-300">
                    {choice.priceDelta > 0 ? `+${choice.priceDelta}` : t("admin.options.free")}
                  </span>
                  <button onClick={() => deleteChoice(choice.id)} className="text-red-600 dark:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <input
              placeholder={t("common.nameAr")}
              value={(choiceForms[group.id] || emptyChoiceForm).nameAr}
              onChange={(e) => updateChoiceForm(group.id, "nameAr", e.target.value)}
              className="rounded-lg border border-sand-200 dark:border-olive-700 bg-white dark:bg-olive-950/40 px-2 py-1.5 text-sm text-olive-900 dark:text-sand-50"
            />
            <input
              placeholder={t("common.nameEn")}
              value={(choiceForms[group.id] || emptyChoiceForm).nameEn}
              onChange={(e) => updateChoiceForm(group.id, "nameEn", e.target.value)}
              className="rounded-lg border border-sand-200 dark:border-olive-700 bg-white dark:bg-olive-950/40 px-2 py-1.5 text-sm text-olive-900 dark:text-sand-50"
            />
            <input
              type="number"
              placeholder={t("admin.options.price")}
              value={(choiceForms[group.id] || emptyChoiceForm).priceDelta}
              onChange={(e) => updateChoiceForm(group.id, "priceDelta", e.target.value)}
              className="rounded-lg border border-sand-200 dark:border-olive-700 bg-white dark:bg-olive-950/40 px-2 py-1.5 text-sm text-olive-900 dark:text-sand-50"
            />
            <button
              onClick={() => addChoice(group.id)}
              className="flex items-center justify-center gap-1 rounded-full bg-olive-600 px-2 py-1.5 text-xs font-medium text-white"
            >
              <Plus className="h-3.5 w-3.5" /> {t("admin.options.addChoice")}
            </button>
          </div>
        </div>
      ))}

      <form onSubmit={addGroup} className="grid grid-cols-2 gap-1.5 sm:grid-cols-5 sm:items-end">
        <input
          placeholder={t("common.nameAr")}
          value={newGroup.nameAr}
          onChange={(e) => setNewGroup((p) => ({ ...p, nameAr: e.target.value }))}
          className="rounded-lg border border-sand-200 dark:border-olive-700 bg-white dark:bg-olive-950/40 px-2 py-1.5 text-sm text-olive-900 dark:text-sand-50"
        />
        <input
          placeholder={t("common.nameEn")}
          value={newGroup.nameEn}
          onChange={(e) => setNewGroup((p) => ({ ...p, nameEn: e.target.value }))}
          className="rounded-lg border border-sand-200 dark:border-olive-700 bg-white dark:bg-olive-950/40 px-2 py-1.5 text-sm text-olive-900 dark:text-sand-50"
        />
        <select
          value={newGroup.type}
          onChange={(e) => setNewGroup((p) => ({ ...p, type: e.target.value }))}
          className="rounded-lg border border-sand-200 dark:border-olive-700 bg-white dark:bg-olive-950/40 px-2 py-1.5 text-sm text-olive-900 dark:text-sand-50"
        >
          <option value="single">{t("admin.options.single")}</option>
          <option value="multiple">{t("admin.options.multiple")}</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-olive-700 dark:text-sand-200">
          <input
            type="checkbox"
            checked={newGroup.required}
            onChange={(e) => setNewGroup((p) => ({ ...p, required: e.target.checked }))}
          />
          {t("client.required")}
        </label>
        <button
          type="submit"
          className="flex items-center justify-center gap-1.5 rounded-full bg-brick-500 px-3 py-1.5 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" /> {t("admin.options.addGroup")}
        </button>
      </form>
    </div>
  );
}
