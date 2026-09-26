import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma.js";
import { recalcSessionTotal } from "../lib/sessionTotals.js";
import { emitToRestaurant, emitToTable } from "../sockets/index.js";

export const clientRouter = Router();

const ORDERS_PER_MINUTE = Number(process.env.RATE_LIMIT_ORDERS_PER_MINUTE || 5);

// Anti-abus : quelques commandes par minute et par table.
const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: ORDERS_PER_MINUTE,
  keyGenerator: (req) => req.params.qrToken,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limited" },
});

async function loadTableByToken(qrToken) {
  const table = await prisma.diningTable.findUnique({
    where: { qrToken },
    include: { restaurant: true },
  });
  return table;
}

async function getOrOpenSession(diningTableId) {
  let session = await prisma.tableSession.findFirst({
    where: { diningTableId, status: { not: "paid" } },
    orderBy: { openedAt: "desc" },
  });
  if (!session) {
    session = await prisma.tableSession.create({ data: { diningTableId, status: "open" } });
  }
  return session;
}

// GET /api/t/:qrToken -> table + restaurant + menu + session actuelle
clientRouter.get("/:qrToken", async (req, res) => {
  const table = await loadTableByToken(req.params.qrToken);
  if (!table || !table.isActive) return res.status(404).json({ error: "table_not_found" });

  const categories = await prisma.category.findMany({
    where: { restaurantId: table.restaurantId, isActive: true },
    orderBy: { position: "asc" },
    include: {
      menuItems: { orderBy: { position: "asc" } },
    },
  });

  const session = await prisma.tableSession.findFirst({
    where: { diningTableId: table.id, status: { not: "paid" } },
    orderBy: { openedAt: "desc" },
  });

  res.json({
    restaurant: {
      id: table.restaurant.id,
      name: table.restaurant.name,
      slug: table.restaurant.slug,
      logo: table.restaurant.logo,
      currency: table.restaurant.currency,
    },
    table: { id: table.id, label: table.label, qrToken: table.qrToken },
    categories,
    session,
  });
});

// GET /api/t/:qrToken/orders -> commandes de la session en cours
clientRouter.get("/:qrToken/orders", async (req, res) => {
  const table = await loadTableByToken(req.params.qrToken);
  if (!table) return res.status(404).json({ error: "table_not_found" });

  const session = await prisma.tableSession.findFirst({
    where: { diningTableId: table.id, status: { not: "paid" } },
    orderBy: { openedAt: "desc" },
  });
  if (!session) return res.json({ session: null, orders: [] });

  const orders = await prisma.order.findMany({
    where: { tableSessionId: session.id },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });

  res.json({ session, orders });
});

// POST /api/t/:qrToken/orders -> envoi d'une commande (prix recalculés côté serveur)
clientRouter.post("/:qrToken/orders", orderLimiter, async (req, res) => {
  const table = await loadTableByToken(req.params.qrToken);
  if (!table || !table.isActive) return res.status(404).json({ error: "table_not_found" });

  const { items, note } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "empty_order" });
  }

  const menuItemIds = items.map((i) => Number(i.menuItemId)).filter(Boolean);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
  });
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  const session = await getOrOpenSession(table.id);

  const preparedItems = [];
  for (const raw of items) {
    const menuItem = byId.get(Number(raw.menuItemId));
    if (!menuItem || !menuItem.isAvailable) continue;
    // Le prix envoyé par le navigateur est ignoré : on reprend le prix en base.
    const quantity = Math.max(1, Math.min(20, Number(raw.quantity) || 1));
    preparedItems.push({
      menuItemId: menuItem.id,
      name: menuItem.nameEn,
      unitPrice: menuItem.price,
      quantity,
      note: (raw.note || "").slice(0, 300),
    });
  }

  if (preparedItems.length === 0) {
    return res.status(400).json({ error: "no_valid_items" });
  }

  const total = preparedItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const order = await prisma.order.create({
    data: {
      tableSessionId: session.id,
      status: "new",
      total,
      note: (note || "").slice(0, 300),
      items: { create: preparedItems },
    },
    include: { items: true },
  });

  await recalcSessionTotal(session.id);

  const payload = { order, table: { id: table.id, label: table.label, qrToken: table.qrToken } };
  emitToRestaurant(table.restaurantId, "order.created", payload);
  emitToTable(table.qrToken, "order.created", payload);

  res.status(201).json(order);
});

// POST /api/t/:qrToken/service-requests -> appeler le serveur / demander l'addition
clientRouter.post("/:qrToken/service-requests", async (req, res) => {
  const table = await loadTableByToken(req.params.qrToken);
  if (!table || !table.isActive) return res.status(404).json({ error: "table_not_found" });

  const { type } = req.body || {};
  if (!["call_waiter", "bill"].includes(type)) {
    return res.status(400).json({ error: "invalid_type" });
  }

  const existing = await prisma.serviceRequest.findFirst({
    where: { diningTableId: table.id, type, status: "pending" },
  });
  if (existing) return res.status(200).json(existing);

  const request = await prisma.serviceRequest.create({
    data: { diningTableId: table.id, type, status: "pending" },
  });

  if (type === "bill") {
    const session = await prisma.tableSession.findFirst({
      where: { diningTableId: table.id, status: { not: "paid" } },
      orderBy: { openedAt: "desc" },
    });
    if (session) {
      await prisma.tableSession.update({ where: { id: session.id }, data: { status: "bill_requested" } });
    }
  }

  emitToRestaurant(table.restaurantId, "service_request.created", {
    request,
    table: { id: table.id, label: table.label, qrToken: table.qrToken },
  });

  res.status(201).json(request);
});
