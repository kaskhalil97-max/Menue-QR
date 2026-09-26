import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { emitToRestaurant, emitToTable } from "../sockets/index.js";
import { recalcSessionTotal } from "../lib/sessionTotals.js";

export const waiterRouter = Router();
waiterRouter.use(requireAuth, requireRole("admin", "waiter"));

// GET /api/waiter/orders/ready -> commandes prêtes à servir
waiterRouter.get("/orders/ready", async (req, res) => {
  const orders = await prisma.order.findMany({
    where: {
      status: "ready",
      tableSession: { diningTable: { restaurantId: req.user.restaurantId } },
    },
    include: { items: true, tableSession: { include: { diningTable: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(orders);
});

// PATCH /api/waiter/orders/:id/served
waiterRouter.patch("/orders/:id/served", async (req, res) => {
  const orderId = Number(req.params.id);
  const order = await prisma.order.findFirst({
    where: { id: orderId, tableSession: { diningTable: { restaurantId: req.user.restaurantId } } },
    include: { tableSession: { include: { diningTable: true } } },
  });
  if (!order) return res.status(404).json({ error: "not_found" });
  if (order.status !== "ready") return res.status(400).json({ error: "not_ready" });

  const updated = await prisma.order.update({ where: { id: orderId }, data: { status: "served" } });
  const table = order.tableSession.diningTable;
  const payload = { order: updated, table: { id: table.id, label: table.label, qrToken: table.qrToken } };
  emitToRestaurant(table.restaurantId, "order.status_changed", payload);
  emitToTable(table.qrToken, "order.status_changed", payload);

  res.json(updated);
});

// GET /api/waiter/service-requests -> appels serveur et demandes d'addition en attente
waiterRouter.get("/service-requests", async (req, res) => {
  const requests = await prisma.serviceRequest.findMany({
    where: {
      status: "pending",
      diningTable: { restaurantId: req.user.restaurantId },
    },
    include: { diningTable: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(requests);
});

// PATCH /api/waiter/service-requests/:id/handled
waiterRouter.patch("/service-requests/:id/handled", async (req, res) => {
  const id = Number(req.params.id);
  const request = await prisma.serviceRequest.findFirst({
    where: { id, diningTable: { restaurantId: req.user.restaurantId } },
  });
  if (!request) return res.status(404).json({ error: "not_found" });

  const updated = await prisma.serviceRequest.update({
    where: { id },
    data: { status: "done", handledBy: req.user.sub },
  });
  emitToRestaurant(req.user.restaurantId, "service_request.updated", updated);
  res.json(updated);
});

// GET /api/waiter/tables/:id/open-session -> session ouverte/en cours pour une table
waiterRouter.get("/tables/:id/open-session", async (req, res) => {
  const diningTableId = Number(req.params.id);
  const session = await prisma.tableSession.findFirst({
    where: {
      diningTableId,
      status: { not: "paid" },
      diningTable: { restaurantId: req.user.restaurantId },
    },
    orderBy: { openedAt: "desc" },
    include: { diningTable: true },
  });
  if (!session) return res.status(404).json({ error: "not_found" });
  await recalcSessionTotal(session.id);
  const refreshed = await prisma.tableSession.findUnique({
    where: { id: session.id },
    include: { diningTable: true },
  });
  res.json(refreshed);
});

// GET /api/waiter/sessions/:id -> détail addition (table_session + commandes)
waiterRouter.get("/sessions/:id", async (req, res) => {
  const id = Number(req.params.id);
  const session = await prisma.tableSession.findFirst({
    where: { id, diningTable: { restaurantId: req.user.restaurantId } },
    include: {
      diningTable: true,
      orders: { include: { items: true }, where: { status: { not: "cancelled" } } },
    },
  });
  if (!session) return res.status(404).json({ error: "not_found" });
  res.json(session);
});

// PATCH /api/waiter/sessions/:id/close -> clôture de l'addition
waiterRouter.patch("/sessions/:id/close", async (req, res) => {
  const id = Number(req.params.id);
  const { paymentMethod } = req.body || {};
  if (!["cash", "card"].includes(paymentMethod)) {
    return res.status(400).json({ error: "invalid_payment_method" });
  }

  const session = await prisma.tableSession.findFirst({
    where: { id, diningTable: { restaurantId: req.user.restaurantId } },
  });
  if (!session) return res.status(404).json({ error: "not_found" });

  await recalcSessionTotal(id);
  const updated = await prisma.tableSession.update({
    where: { id },
    data: { status: "paid", paymentMethod, closedAt: new Date() },
  });

  emitToRestaurant(req.user.restaurantId, "session.closed", updated);
  res.json(updated);
});
