import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { emitToRestaurant, emitToTable } from "../sockets/index.js";

export const kitchenRouter = Router();
kitchenRouter.use(requireAuth, requireRole("admin", "kitchen"));

const NEXT_STATUS = { new: "preparing", preparing: "ready" };

// GET /api/kitchen/orders -> commandes actives (non servies/annulées)
kitchenRouter.get("/orders", async (req, res) => {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["new", "preparing", "ready"] },
      tableSession: { diningTable: { restaurantId: req.user.restaurantId } },
    },
    include: {
      items: { include: { menuItem: true } },
      tableSession: { include: { diningTable: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  res.json(orders);
});

async function loadOrderForRestaurant(orderId, restaurantId) {
  return prisma.order.findFirst({
    where: { id: orderId, tableSession: { diningTable: { restaurantId } } },
    include: { tableSession: { include: { diningTable: true } }, items: true },
  });
}

// PATCH /api/kitchen/orders/:id/advance -> new -> preparing -> ready
kitchenRouter.patch("/orders/:id/advance", async (req, res) => {
  const orderId = Number(req.params.id);
  const order = await loadOrderForRestaurant(orderId, req.user.restaurantId);
  if (!order) return res.status(404).json({ error: "not_found" });

  const nextStatus = NEXT_STATUS[order.status];
  if (!nextStatus) return res.status(400).json({ error: "cannot_advance" });

  const updated = await prisma.order.update({ where: { id: orderId }, data: { status: nextStatus } });

  const table = order.tableSession.diningTable;
  const payload = { order: updated, table: { id: table.id, label: table.label, qrToken: table.qrToken } };
  emitToRestaurant(table.restaurantId, "order.status_changed", payload);
  emitToTable(table.qrToken, "order.status_changed", payload);

  res.json(updated);
});

// PATCH /api/kitchen/orders/:id/cancel -> annulation tant que la commande n'est pas prête
kitchenRouter.patch("/orders/:id/cancel", async (req, res) => {
  const orderId = Number(req.params.id);
  const order = await loadOrderForRestaurant(orderId, req.user.restaurantId);
  if (!order) return res.status(404).json({ error: "not_found" });
  if (order.status === "ready" || order.status === "served") {
    return res.status(400).json({ error: "cannot_cancel" });
  }

  const updated = await prisma.order.update({ where: { id: orderId }, data: { status: "cancelled" } });

  const table = order.tableSession.diningTable;
  const payload = { order: updated, table: { id: table.id, label: table.label, qrToken: table.qrToken } };
  emitToRestaurant(table.restaurantId, "order.status_changed", payload);
  emitToTable(table.qrToken, "order.status_changed", payload);

  res.json(updated);
});
