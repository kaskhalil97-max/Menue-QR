import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const publicMenuRouter = Router();

// GET /api/menu/:slug -> permet à un client de recharger la disponibilité du menu public
publicMenuRouter.get("/:slug", async (req, res) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { slug: req.params.slug } });
  if (!restaurant) return res.status(404).json({ error: "not_found" });

  const categories = await prisma.category.findMany({
    where: { restaurantId: restaurant.id, isActive: true },
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

  res.json({ restaurant, categories });
});
