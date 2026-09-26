import { prisma } from "./prisma.js";

export async function recalcSessionTotal(tableSessionId) {
  const orders = await prisma.order.findMany({
    where: { tableSessionId, status: { not: "cancelled" } },
    include: { items: true },
  });
  const total = orders.reduce(
    (sum, order) => sum + order.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    0
  );
  await prisma.tableSession.update({ where: { id: tableSessionId }, data: { total } });
  return total;
}
