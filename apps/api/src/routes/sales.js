import { Router } from "express";
import { prisma } from "../db.js";
import { requireAdmin, requireCustomer } from "../auth.js";
import { exportSalesWorkbook } from "../excel.js";
import { computeMemberFinance } from "../finance.js";

export const salesRouter = Router();

// Translate ?customerId=&from=&to= query into a Prisma `where` for sales.
function salesWhere(query) {
  const where = {};
  if (query.customerId) where.customerId = Number(query.customerId);
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = new Date(query.from);
    if (query.to) {
      const to = new Date(query.to);
      to.setHours(23, 59, 59, 999); // inclusive end-of-day
      where.createdAt.lte = to;
    }
  }
  return where;
}

// customerId -> { overall, balance } across ALL history (for export columns).
async function financeById() {
  const [sales, payments] = await Promise.all([
    prisma.sale.findMany({ select: { customerId: true, total: true, createdAt: true } }),
    prisma.payment.findMany({ select: { customerId: true, amount: true } })
  ]);
  const salesBy = new Map();
  const payBy = new Map();
  for (const s of sales) {
    if (s.customerId == null) continue;
    if (!salesBy.has(s.customerId)) salesBy.set(s.customerId, []);
    salesBy.get(s.customerId).push(s);
  }
  for (const p of payments) {
    if (!payBy.has(p.customerId)) payBy.set(p.customerId, []);
    payBy.get(p.customerId).push(p);
  }
  const map = new Map();
  for (const id of salesBy.keys()) {
    map.set(id, computeMemberFinance(salesBy.get(id) || [], payBy.get(id) || []));
  }
  return map;
}

// Shared checkout: validates stock, decrements it and records the sale atomically.
async function checkout({ items, customerId, customerName, mode }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw { status: 400, message: "Add at least one product to your order." };
  }

  const ids = items.map((i) => Number(i.productId));
  const products = await prisma.product.findMany({ where: { id: { in: ids }, active: true } });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = [];
  for (const item of items) {
    const product = byId.get(Number(item.productId));
    const qty = Math.trunc(Number(item.quantity));
    if (!product) throw { status: 400, message: "One of the products is no longer available." };
    if (!Number.isFinite(qty) || qty <= 0) throw { status: 400, message: `Enter a valid quantity for ${product.name}.` };
    if (qty > product.count) {
      throw { status: 409, message: `Only ${product.count} left of ${product.name}.` };
    }
    lines.push({
      productId: product.id,
      productName: product.name,
      quantity: qty,
      unitPrice: product.sellingPrice,
      unitCost: product.buyingPrice ?? null,
      lineTotal: Number((product.sellingPrice * qty).toFixed(2))
    });
  }

  const total = Number(lines.reduce((s, l) => s + l.lineTotal, 0).toFixed(2));
  const cost = Number(
    lines.reduce((s, l) => s + (l.unitCost != null ? l.unitCost * l.quantity : 0), 0).toFixed(2)
  );

  return prisma.$transaction(async (tx) => {
    for (const l of lines) {
      await tx.product.update({ where: { id: l.productId }, data: { count: { decrement: l.quantity } } });
    }
    return tx.sale.create({
      data: {
        customerId: customerId ?? null,
        customerName,
        mode,
        total,
        cost,
        items: { create: lines }
      },
      include: { items: true }
    });
  });
}

// Guest checkout — name must match a member in the admin's customer list.
salesRouter.post("/guest", async (req, res) => {
  try {
    const { customerName, customerId, items } = req.body || {};

    // Preferred path: storefront combobox sends the exact member id (100% match).
    let match = null;
    if (customerId != null) {
      match = await prisma.customer.findFirst({ where: { id: Number(customerId), active: true } });
    } else {
      // Fallback: match a typed full name or login id against the member list.
      const typed = String(customerName || "").trim();
      if (!typed) return res.status(400).json({ error: "Select your name from the member list." });
      const candidates = await prisma.customer.findMany({ where: { active: true } });
      match = candidates.find((c) => {
        const full = `${c.name} ${c.surname}`.toLowerCase();
        return full === typed.toLowerCase() || c.loginId.toLowerCase() === typed.toLowerCase();
      });
    }

    if (!match) {
      return res.status(404).json({ error: "We couldn't find that name in the member list. Ask the front desk." });
    }

    const sale = await checkout({
      items,
      customerId: match.id,
      customerName: `${match.name} ${match.surname}`,
      mode: "guest"
    });
    res.status(201).json(sale);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Checkout failed." });
  }
});

// Logged-in member checkout.
salesRouter.post("/checkout", requireCustomer, async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: req.customer.sub } });
    if (!customer) return res.status(401).json({ error: "Account not found." });
    const sale = await checkout({
      items: req.body?.items,
      customerId: customer.id,
      customerName: `${customer.name} ${customer.surname}`,
      mode: "login"
    });
    res.status(201).json(sale);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Checkout failed." });
  }
});

// A member's own purchase history, with optional date-range filter.
salesRouter.get("/mine", requireCustomer, async (req, res) => {
  const where = { ...salesWhere(req.query), customerId: req.customer.sub };
  const sales = await prisma.sale.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { items: true },
    take: 200
  });
  res.json(sales);
});

// Admin: combined transactions feed — sales + payments together.
// Same filters as sales (customerId / from / to) plus ?type=all|sale|payment.
salesRouter.get("/feed", requireAdmin, async (req, res) => {
  const type = ["sale", "payment"].includes(req.query.type) ? req.query.type : "all";
  const where = salesWhere(req.query); // { customerId?, createdAt? } — valid for both models
  const items = [];

  if (type !== "payment") {
    const sales = await prisma.sale.findMany({ where, orderBy: { createdAt: "desc" }, include: { items: true } });
    for (const s of sales) {
      items.push({
        kind: "sale", id: `s${s.id}`, saleId: s.id, createdAt: s.createdAt,
        customerName: s.customerName, mode: s.mode, total: s.total, items: s.items
      });
    }
  }

  if (type !== "sale") {
    const payments = await prisma.payment.findMany({ where, orderBy: { createdAt: "desc" }, include: { customer: true } });
    for (const p of payments) {
      items.push({
        kind: "payment", id: `p${p.id}`, createdAt: p.createdAt,
        customerName: p.customer ? `${p.customer.name} ${p.customer.surname}` : "—",
        amount: p.amount, note: p.note
      });
    }
  }

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(items);
});

// Admin: sales-only feed with optional member + date-range filters.
salesRouter.get("/", requireAdmin, async (req, res) => {
  const sales = await prisma.sale.findMany({
    where: salesWhere(req.query),
    orderBy: { createdAt: "desc" },
    include: { items: true },
    take: Number(req.query.limit) || 500
  });
  res.json(sales);
});

// Admin: revert a mistaken order — puts the items back into stock and removes the
// sale (SaleItem rows cascade). Member balance self-corrects since it is derived
// from sales at read time.
salesRouter.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid sale id." });

  const sale = await prisma.sale.findUnique({ where: { id }, include: { items: true } });
  if (!sale) return res.status(404).json({ error: "Sale not found." });

  await prisma.$transaction(async (tx) => {
    for (const item of sale.items) {
      await tx.product.update({ where: { id: item.productId }, data: { count: { increment: item.quantity } } });
    }
    await tx.sale.delete({ where: { id } });
  });
  res.json({ ok: true });
});

// Admin: export sales (respects the same filters) with overall + balance columns.
salesRouter.get("/export", requireAdmin, async (req, res) => {
  const [sales, fin] = await Promise.all([
    prisma.sale.findMany({ where: salesWhere(req.query), orderBy: { createdAt: "desc" }, include: { items: true } }),
    financeById()
  ]);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="sales.xlsx"');
  res.send(exportSalesWorkbook(sales, fin));
});
