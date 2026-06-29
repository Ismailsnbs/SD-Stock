import { Router } from "express";
import multer from "multer";
import { prisma } from "../db.js";
import { requireAdmin } from "../auth.js";
import { stockTemplate, parseStock } from "../excel.js";

export const productsRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Public storefront list — only active products with stock info the customer needs.
productsRouter.get("/storefront", async (req, res) => {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { name: "asc" }
  });
  res.json(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      count: p.count,
      sellingPrice: p.sellingPrice,
      inStock: p.count > 0
    }))
  );
});

// Download stock import template.
productsRouter.get("/template", requireAdmin, (req, res) => {
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="stock-template.xlsx"');
  res.send(stockTemplate());
});

// Admin full list.
productsRouter.get("/", requireAdmin, async (req, res) => {
  const q = String(req.query.q || "").trim();
  const where = q ? { name: { contains: q } } : {};
  const products = await prisma.product.findMany({ where, orderBy: { name: "asc" } });
  res.json(products);
});

productsRouter.post("/import", requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Attach an Excel file to import." });
  const { rows, errors } = parseStock(req.file.buffer);
  if (!rows.length) return res.status(400).json({ error: "No valid rows found.", errors });

  if (req.query.mode === "replace") {
    // Keep products that already have sales (FK); just zero them out instead of deleting.
    await prisma.product.updateMany({ data: { active: false } });
  }

  let created = 0;
  let updated = 0;
  for (const r of rows) {
    const existing = await prisma.product.findUnique({ where: { name: r.name } });
    if (existing) {
      await prisma.product.update({
        where: { name: r.name },
        data: { count: r.count, buyingPrice: r.buyingPrice, sellingPrice: r.sellingPrice, active: true }
      });
      updated++;
    } else {
      await prisma.product.create({ data: r });
      created++;
    }
  }
  res.json({ created, updated, skipped: errors.length, errors });
});

productsRouter.post("/", requireAdmin, async (req, res) => {
  const { name, count, buyingPrice, sellingPrice } = req.body || {};
  if (!name || count === undefined || sellingPrice === undefined) {
    return res.status(400).json({ error: "Product, count and selling price are required." });
  }
  const exists = await prisma.product.findUnique({ where: { name: String(name).trim() } });
  if (exists) return res.status(409).json({ error: "A product with this name already exists." });

  const product = await prisma.product.create({
    data: {
      name: String(name).trim(),
      count: Math.max(0, Math.trunc(Number(count))),
      buyingPrice: buyingPrice === "" || buyingPrice === null || buyingPrice === undefined ? null : Number(buyingPrice),
      sellingPrice: Number(sellingPrice)
    }
  });
  res.status(201).json(product);
});

productsRouter.put("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { name, count, buyingPrice, sellingPrice, active } = req.body || {};
  const data = {};
  if (name !== undefined) data.name = String(name).trim();
  if (count !== undefined) data.count = Math.max(0, Math.trunc(Number(count)));
  if (buyingPrice !== undefined)
    data.buyingPrice = buyingPrice === "" || buyingPrice === null ? null : Number(buyingPrice);
  if (sellingPrice !== undefined) data.sellingPrice = Number(sellingPrice);
  if (active !== undefined) data.active = Boolean(active);

  const product = await prisma.product.update({ where: { id }, data });
  res.json(product);
});

productsRouter.delete("/:id", requireAdmin, async (req, res) => {
  // Soft-delete so historical sales keep their product reference.
  await prisma.product.update({ where: { id: Number(req.params.id) }, data: { active: false } });
  res.json({ ok: true });
});
