import { Router } from "express";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { generateQrToken } from "../lib/tokens.js";
import { uploadImage } from "../lib/uploads.js";
import { emitToMenu } from "../sockets/index.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin"));

/* ---------------- Uploads ---------------- */

// POST /api/admin/uploads -> dépose une image (plat, logo...) et renvoie son URL publique
adminRouter.post("/uploads", (req, res) => {
  uploadImage.single("image")(req, res, (err) => {
    if (err) {
      const code = err.message === "unsupported_file_type" ? 415 : 400;
      return res.status(code).json({ error: err.message || "upload_failed" });
    }
    if (!req.file) return res.status(400).json({ error: "no_file" });
    const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    res.status(201).json({ url });
  });
});

/* ---------------- Categories ---------------- */

adminRouter.get("/categories", async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { restaurantId: req.user.restaurantId },
    orderBy: { position: "asc" },
    include: {
      menuItems: {
        orderBy: { position: "asc" },
        include: {
          optionGroups: {
            orderBy: { position: "asc" },
            include: { choices: { orderBy: { position: "asc" } } },
          },
        },
      },
    },
  });
  res.json(categories);
});

adminRouter.post("/categories", async (req, res) => {
  const { nameAr, nameEn, position } = req.body || {};
  if (!nameAr || !nameEn) return res.status(400).json({ error: "missing_fields" });
  const category = await prisma.category.create({
    data: { restaurantId: req.user.restaurantId, nameAr, nameEn, position: position ?? 0 },
  });
  res.status(201).json(category);
});

adminRouter.patch("/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  const category = await prisma.category.findFirst({ where: { id, restaurantId: req.user.restaurantId } });
  if (!category) return res.status(404).json({ error: "not_found" });
  const { nameAr, nameEn, position, isActive } = req.body || {};
  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...(nameAr !== undefined && { nameAr }),
      ...(nameEn !== undefined && { nameEn }),
      ...(position !== undefined && { position }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  res.json(updated);
});

adminRouter.delete("/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  const category = await prisma.category.findFirst({ where: { id, restaurantId: req.user.restaurantId } });
  if (!category) return res.status(404).json({ error: "not_found" });
  await prisma.menuItem.deleteMany({ where: { categoryId: id } });
  await prisma.category.delete({ where: { id } });
  res.status(204).end();
});

/* ---------------- Menu items ---------------- */

adminRouter.post("/menu-items", async (req, res) => {
  const { categoryId, nameAr, nameEn, descriptionAr, descriptionEn, price, image, position } = req.body || {};
  const category = await prisma.category.findFirst({
    where: { id: Number(categoryId), restaurantId: req.user.restaurantId },
  });
  if (!category) return res.status(400).json({ error: "invalid_category" });
  if (!nameAr || !nameEn || price === undefined) return res.status(400).json({ error: "missing_fields" });

  const item = await prisma.menuItem.create({
    data: {
      categoryId: category.id,
      nameAr,
      nameEn,
      descriptionAr,
      descriptionEn,
      price: Number(price),
      image,
      position: position ?? 0,
    },
  });
  res.status(201).json(item);
});

async function loadOwnedMenuItem(id, restaurantId) {
  return prisma.menuItem.findFirst({
    where: { id, category: { restaurantId } },
  });
}

adminRouter.patch("/menu-items/:id", async (req, res) => {
  const id = Number(req.params.id);
  const item = await loadOwnedMenuItem(id, req.user.restaurantId);
  if (!item) return res.status(404).json({ error: "not_found" });

  const { nameAr, nameEn, descriptionAr, descriptionEn, price, image, position, isAvailable, categoryId } =
    req.body || {};
  const updated = await prisma.menuItem.update({
    where: { id },
    data: {
      ...(nameAr !== undefined && { nameAr }),
      ...(nameEn !== undefined && { nameEn }),
      ...(descriptionAr !== undefined && { descriptionAr }),
      ...(descriptionEn !== undefined && { descriptionEn }),
      ...(price !== undefined && { price: Number(price) }),
      ...(image !== undefined && { image }),
      ...(position !== undefined && { position }),
      ...(isAvailable !== undefined && { isAvailable }),
      ...(categoryId !== undefined && { categoryId: Number(categoryId) }),
    },
  });

  if (isAvailable !== undefined) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: req.user.restaurantId } });
    emitToMenu(restaurant.slug, "menu_item.availability_changed", {
      menuItemId: updated.id,
      isAvailable: updated.isAvailable,
    });
  }

  res.json(updated);
});

// PATCH /api/admin/menu-items/:id/toggle-available -> bouton "Épuisé"
adminRouter.patch("/menu-items/:id/toggle-available", async (req, res) => {
  const id = Number(req.params.id);
  const item = await loadOwnedMenuItem(id, req.user.restaurantId);
  if (!item) return res.status(404).json({ error: "not_found" });

  const updated = await prisma.menuItem.update({
    where: { id },
    data: { isAvailable: !item.isAvailable },
  });

  const restaurant = await prisma.restaurant.findUnique({ where: { id: req.user.restaurantId } });
  emitToMenu(restaurant.slug, "menu_item.availability_changed", {
    menuItemId: updated.id,
    isAvailable: updated.isAvailable,
  });

  res.json(updated);
});

adminRouter.delete("/menu-items/:id", async (req, res) => {
  const id = Number(req.params.id);
  const item = await loadOwnedMenuItem(id, req.user.restaurantId);
  if (!item) return res.status(404).json({ error: "not_found" });
  const groupIds = (await prisma.optionGroup.findMany({ where: { menuItemId: id }, select: { id: true } })).map(
    (g) => g.id
  );
  await prisma.optionChoice.deleteMany({ where: { optionGroupId: { in: groupIds } } });
  await prisma.optionGroup.deleteMany({ where: { menuItemId: id } });
  await prisma.menuItem.delete({ where: { id } });
  res.status(204).end();
});

/* ---------------- Option groups & choices ---------------- */

async function loadOwnedOptionGroup(id, restaurantId) {
  return prisma.optionGroup.findFirst({
    where: { id, menuItem: { category: { restaurantId } } },
  });
}

async function loadOwnedOptionChoice(id, restaurantId) {
  return prisma.optionChoice.findFirst({
    where: { id, optionGroup: { menuItem: { category: { restaurantId } } } },
  });
}

// POST /api/admin/menu-items/:itemId/option-groups -> ex. "Sauce" (unique) ou "Suppléments" (multiple)
adminRouter.post("/menu-items/:itemId/option-groups", async (req, res) => {
  const itemId = Number(req.params.itemId);
  const item = await loadOwnedMenuItem(itemId, req.user.restaurantId);
  if (!item) return res.status(404).json({ error: "not_found" });

  const { nameAr, nameEn, type, required, position } = req.body || {};
  if (!nameAr || !nameEn || !["single", "multiple"].includes(type)) {
    return res.status(400).json({ error: "missing_or_invalid_fields" });
  }

  const group = await prisma.optionGroup.create({
    data: { menuItemId: itemId, nameAr, nameEn, type, required: !!required, position: position ?? 0 },
    include: { choices: true },
  });
  res.status(201).json(group);
});

adminRouter.patch("/option-groups/:id", async (req, res) => {
  const id = Number(req.params.id);
  const group = await loadOwnedOptionGroup(id, req.user.restaurantId);
  if (!group) return res.status(404).json({ error: "not_found" });

  const { nameAr, nameEn, type, required, position } = req.body || {};
  const updated = await prisma.optionGroup.update({
    where: { id },
    data: {
      ...(nameAr !== undefined && { nameAr }),
      ...(nameEn !== undefined && { nameEn }),
      ...(type !== undefined && { type }),
      ...(required !== undefined && { required: !!required }),
      ...(position !== undefined && { position }),
    },
  });
  res.json(updated);
});

adminRouter.delete("/option-groups/:id", async (req, res) => {
  const id = Number(req.params.id);
  const group = await loadOwnedOptionGroup(id, req.user.restaurantId);
  if (!group) return res.status(404).json({ error: "not_found" });
  await prisma.optionChoice.deleteMany({ where: { optionGroupId: id } });
  await prisma.optionGroup.delete({ where: { id } });
  res.status(204).end();
});

// POST /api/admin/option-groups/:groupId/choices -> ex. "Algérienne" +0, "Fromage" +5
adminRouter.post("/option-groups/:groupId/choices", async (req, res) => {
  const groupId = Number(req.params.groupId);
  const group = await loadOwnedOptionGroup(groupId, req.user.restaurantId);
  if (!group) return res.status(404).json({ error: "not_found" });

  const { nameAr, nameEn, priceDelta, position } = req.body || {};
  if (!nameAr || !nameEn) return res.status(400).json({ error: "missing_fields" });

  const choice = await prisma.optionChoice.create({
    data: { optionGroupId: groupId, nameAr, nameEn, priceDelta: Number(priceDelta) || 0, position: position ?? 0 },
  });
  res.status(201).json(choice);
});

adminRouter.patch("/option-choices/:id", async (req, res) => {
  const id = Number(req.params.id);
  const choice = await loadOwnedOptionChoice(id, req.user.restaurantId);
  if (!choice) return res.status(404).json({ error: "not_found" });

  const { nameAr, nameEn, priceDelta, position, isAvailable } = req.body || {};
  const updated = await prisma.optionChoice.update({
    where: { id },
    data: {
      ...(nameAr !== undefined && { nameAr }),
      ...(nameEn !== undefined && { nameEn }),
      ...(priceDelta !== undefined && { priceDelta: Number(priceDelta) }),
      ...(position !== undefined && { position }),
      ...(isAvailable !== undefined && { isAvailable }),
    },
  });
  res.json(updated);
});

adminRouter.delete("/option-choices/:id", async (req, res) => {
  const id = Number(req.params.id);
  const choice = await loadOwnedOptionChoice(id, req.user.restaurantId);
  if (!choice) return res.status(404).json({ error: "not_found" });
  await prisma.optionChoice.delete({ where: { id } });
  res.status(204).end();
});

/* ---------------- Tables ---------------- */

adminRouter.get("/tables", async (req, res) => {
  const tables = await prisma.diningTable.findMany({
    where: { restaurantId: req.user.restaurantId },
    orderBy: { label: "asc" },
  });
  res.json(tables);
});

adminRouter.post("/tables", async (req, res) => {
  const { label } = req.body || {};
  if (!label) return res.status(400).json({ error: "missing_label" });
  const table = await prisma.diningTable.create({
    data: { restaurantId: req.user.restaurantId, label, qrToken: generateQrToken() },
  });
  res.status(201).json(table);
});

adminRouter.patch("/tables/:id", async (req, res) => {
  const id = Number(req.params.id);
  const table = await prisma.diningTable.findFirst({ where: { id, restaurantId: req.user.restaurantId } });
  if (!table) return res.status(404).json({ error: "not_found" });
  const { label, isActive } = req.body || {};
  const updated = await prisma.diningTable.update({
    where: { id },
    data: {
      ...(label !== undefined && { label }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  res.json(updated);
});

// PATCH /api/admin/tables/:id/regenerate-qr
adminRouter.patch("/tables/:id/regenerate-qr", async (req, res) => {
  const id = Number(req.params.id);
  const table = await prisma.diningTable.findFirst({ where: { id, restaurantId: req.user.restaurantId } });
  if (!table) return res.status(404).json({ error: "not_found" });
  const updated = await prisma.diningTable.update({
    where: { id },
    data: { qrToken: generateQrToken() },
  });
  res.json(updated);
});

// GET /api/admin/tables/qr-codes.pdf -> PDF de tous les QR codes actifs
adminRouter.get("/tables/qr-codes.pdf", async (req, res) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: req.user.restaurantId } });
  const tables = await prisma.diningTable.findMany({
    where: { restaurantId: req.user.restaurantId, isActive: true },
    orderBy: { label: "asc" },
  });

  const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="qr-codes.pdf"');

  const doc = new PDFDocument({ size: "A4", margin: 36 });
  doc.pipe(res);

  const perRow = 3;
  const cellWidth = (doc.page.width - 72) / perRow;
  const cellHeight = 220;
  let col = 0;
  let row = 0;

  for (const table of tables) {
    const url = `${clientOrigin}/t/${table.qrToken}`;
    const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 300 });
    const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");

    const x = 36 + col * cellWidth;
    const y = 36 + row * cellHeight;

    if (y + cellHeight > doc.page.height - 36) {
      doc.addPage();
      row = 0;
      col = 0;
    }
    const finalY = 36 + row * cellHeight;

    doc.rect(x + 8, finalY, cellWidth - 16, cellHeight - 16).stroke("#dddddd");
    doc.fontSize(9).fillColor("#666").text(restaurant.name, x + 8, finalY + 8, {
      width: cellWidth - 16,
      align: "center",
    });
    doc.image(qrBuffer, x + cellWidth / 2 - 70, finalY + 24, { width: 140, height: 140 });
    doc.fontSize(14).fillColor("#111").text(table.label, x + 8, finalY + 172, {
      width: cellWidth - 16,
      align: "center",
    });

    col += 1;
    if (col >= perRow) {
      col = 0;
      row += 1;
    }
  }

  doc.end();
});

/* ---------------- Staff ---------------- */

adminRouter.get("/users", async (req, res) => {
  const users = await prisma.user.findMany({
    where: { restaurantId: req.user.restaurantId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  res.json(users);
});

adminRouter.post("/users", async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password || !["admin", "kitchen", "waiter"].includes(role)) {
    return res.status(400).json({ error: "missing_or_invalid_fields" });
  }
  const hashed = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: { restaurantId: req.user.restaurantId, name, email, password: hashed, role },
    });
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch {
    res.status(409).json({ error: "email_taken" });
  }
});

adminRouter.patch("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const user = await prisma.user.findFirst({ where: { id, restaurantId: req.user.restaurantId } });
  if (!user) return res.status(404).json({ error: "not_found" });
  const { name, role, password } = req.body || {};
  const data = {};
  if (name !== undefined) data.name = name;
  if (role !== undefined) data.role = role;
  if (password) data.password = await bcrypt.hash(password, 10);
  const updated = await prisma.user.update({ where: { id }, data });
  res.json({ id: updated.id, name: updated.name, email: updated.email, role: updated.role });
});

adminRouter.delete("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const user = await prisma.user.findFirst({ where: { id, restaurantId: req.user.restaurantId } });
  if (!user) return res.status(404).json({ error: "not_found" });
  if (user.id === req.user.sub) return res.status(400).json({ error: "cannot_delete_self" });
  await prisma.user.delete({ where: { id } });
  res.status(204).end();
});

/* ---------------- Dashboard ---------------- */

adminRouter.get("/dashboard", async (req, res) => {
  const restaurantId = req.user.restaurantId;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const paidSessionsToday = await prisma.tableSession.findMany({
    where: {
      diningTable: { restaurantId },
      status: "paid",
      closedAt: { gte: startOfDay },
    },
  });
  const revenueToday = paidSessionsToday.reduce((s, sess) => s + sess.total, 0);

  const orderItemsToday = await prisma.orderItem.findMany({
    where: {
      order: {
        status: { not: "cancelled" },
        createdAt: { gte: startOfDay },
        tableSession: { diningTable: { restaurantId } },
      },
    },
  });
  const soldByName = new Map();
  for (const item of orderItemsToday) {
    soldByName.set(item.name, (soldByName.get(item.name) || 0) + item.quantity);
  }
  const topItems = [...soldByName.entries()]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const ordersToday = await prisma.order.findMany({
    where: { createdAt: { gte: startOfDay }, tableSession: { diningTable: { restaurantId } } },
    select: { createdAt: true },
  });
  const hourCounts = new Array(24).fill(0);
  for (const order of ordersToday) {
    hourCounts[order.createdAt.getHours()] += 1;
  }
  const peakHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.json({
    revenueToday,
    ordersCountToday: ordersToday.length,
    topItems,
    peakHours,
  });
});

/* ---------------- History ---------------- */

// GET /api/admin/history/sessions -> additions clôturées (historique), plus récentes d'abord
adminRouter.get("/history/sessions", async (req, res) => {
  const restaurantId = req.user.restaurantId;
  const { from, to, limit } = req.query;

  const closedAtFilter = {};
  if (from) closedAtFilter.gte = new Date(from);
  if (to) closedAtFilter.lte = new Date(to);

  const sessions = await prisma.tableSession.findMany({
    where: {
      diningTable: { restaurantId },
      status: "paid",
      ...(from || to ? { closedAt: closedAtFilter } : {}),
    },
    orderBy: { closedAt: "desc" },
    take: Math.min(Number(limit) || 50, 200),
    include: {
      diningTable: true,
      orders: {
        where: { status: { not: "cancelled" } },
        include: { items: { include: { options: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  res.json(sessions);
});
