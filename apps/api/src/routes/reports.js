import { Router } from "express";
import { prisma } from "../db.js";
import { requireAdmin } from "../auth.js";
import { computeMemberFinance } from "../finance.js";
import { addDays, daysLeft } from "../membership.js";

export const reportsRouter = Router();

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function mondayOf(d) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - day);
  return x;
}
function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}
function fmtMonth(d) {
  return d.toISOString().slice(0, 7);
}

// Build empty ordered buckets, newest last (good for left-to-right charts).
function buildBuckets(range) {
  const now = new Date();
  const buckets = [];
  if (range === "monthly") {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: fmtMonth(d), label: d.toLocaleDateString("en", { month: "short", year: "2-digit" }), start: d, revenue: 0, cost: 0, units: 0, count: 0 });
    }
  } else {
    // weekly → last 12 ISO weeks
    const thisMonday = mondayOf(now);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(thisMonday);
      d.setDate(d.getDate() - i * 7);
      buckets.push({ key: fmtDate(d), label: d.toLocaleDateString("en", { day: "2-digit", month: "short" }), start: d, revenue: 0, cost: 0, units: 0, count: 0 });
    }
  }
  return buckets;
}

function bucketKeyFor(date, range) {
  return range === "monthly" ? fmtMonth(date) : fmtDate(mondayOf(date));
}

// Weekly / monthly time series for the report charts.
reportsRouter.get("/timeseries", requireAdmin, async (req, res) => {
  const range = req.query.range === "monthly" ? "monthly" : "weekly";
  const buckets = buildBuckets(range);
  const index = new Map(buckets.map((b) => [b.key, b]));

  const earliest = buckets[0].start;
  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: earliest } },
    include: { items: true }
  });

  for (const s of sales) {
    const b = index.get(bucketKeyFor(s.createdAt, range));
    if (!b) continue;
    b.revenue += s.total;
    b.cost += s.cost;
    b.count += 1;
    b.units += s.items.reduce((n, i) => n + i.quantity, 0);
  }

  const hasCost = await prisma.product.count({ where: { buyingPrice: { not: null } } });
  const series = buckets.map((b) => ({
    key: b.key,
    label: b.label,
    revenue: Number(b.revenue.toFixed(2)),
    cost: Number(b.cost.toFixed(2)),
    profit: Number((b.revenue - b.cost).toFixed(2)),
    units: b.units,
    count: b.count
  }));

  res.json({ range, profitTracked: hasCost > 0, series });
});

// Top-line overview cards + lists.
reportsRouter.get("/overview", requireAdmin, async (req, res) => {
  const [productCount, customerCount, products, sales, customers, payments] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.customer.count({ where: { active: true } }),
    prisma.product.findMany({ where: { active: true } }),
    prisma.sale.findMany({ include: { items: true } }),
    prisma.customer.findMany(),
    prisma.payment.findMany({ select: { customerId: true, amount: true } })
  ]);

  const profitTracked = products.some((p) => p.buyingPrice != null);

  // Receivables: who has spent but not paid (calendar-month overdue logic).
  const salesByCustomer = new Map();
  for (const s of sales) {
    if (s.customerId == null) continue;
    if (!salesByCustomer.has(s.customerId)) salesByCustomer.set(s.customerId, []);
    salesByCustomer.get(s.customerId).push(s);
  }
  const payByCustomer = new Map();
  for (const p of payments) {
    if (!payByCustomer.has(p.customerId)) payByCustomer.set(p.customerId, []);
    payByCustomer.get(p.customerId).push(p);
  }

  let outstandingTotal = 0;
  let overdueTotal = 0;
  const debtors = [];
  for (const c of customers) {
    const f = computeMemberFinance(salesByCustomer.get(c.id) || [], payByCustomer.get(c.id) || []);
    if (f.balance > 0.01) outstandingTotal += f.balance;
    if (f.overdueAmount > 0.01) overdueTotal += f.overdueAmount;
    if (f.balance > 0.01) {
      debtors.push({
        id: c.id,
        name: `${c.name} ${c.surname}`,
        loginId: c.loginId,
        balance: f.balance,
        overdueAmount: f.overdueAmount,
        status: f.status,
        oldestUnpaid: f.oldestUnpaid
      });
    }
  }
  // Overdue first, then by balance — biggest unpaid risks float to the top.
  debtors.sort((a, b) => b.overdueAmount - a.overdueAmount || b.balance - a.balance);
  outstandingTotal = Math.round(outstandingTotal * 100) / 100;
  overdueTotal = Math.round(overdueTotal * 100) / 100;

  const now = new Date();
  const weekStart = mondayOf(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const agg = (from) => {
    let revenue = 0, cost = 0, units = 0, count = 0;
    for (const s of sales) {
      if (from && s.createdAt < from) continue;
      revenue += s.total;
      cost += s.cost;
      count += 1;
      units += s.items.reduce((n, i) => n + i.quantity, 0);
    }
    return {
      revenue: Number(revenue.toFixed(2)),
      cost: Number(cost.toFixed(2)),
      profit: Number((revenue - cost).toFixed(2)),
      units,
      count
    };
  };

  // Best sellers by units (all time).
  const unitsByProduct = new Map();
  for (const s of sales) {
    for (const i of s.items) {
      const cur = unitsByProduct.get(i.productName) || { units: 0, revenue: 0 };
      cur.units += i.quantity;
      cur.revenue += i.lineTotal;
      unitsByProduct.set(i.productName, cur);
    }
  }
  const topProducts = [...unitsByProduct.entries()]
    .map(([name, v]) => ({ name, units: v.units, revenue: Number(v.revenue.toFixed(2)) }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);

  const lowStock = products
    .filter((p) => p.count <= 5)
    .sort((a, b) => a.count - b.count)
    .slice(0, 8)
    .map((p) => ({ id: p.id, name: p.name, count: p.count }));

  // Memberships ending within 5 days (or already ended) — soonest first.
  const soon = addDays(now, 5);
  const expiring = customers
    .filter((c) => c.active && c.membershipEnd && c.membershipEnd <= soon)
    .sort((a, b) => a.membershipEnd - b.membershipEnd);
  const expiringMemberships = expiring.slice(0, 8).map((c) => ({
    id: c.id,
    loginId: c.loginId,
    name: `${c.name} ${c.surname}`,
    membershipEnd: c.membershipEnd,
    daysLeft: daysLeft(c.membershipEnd, now)
  }));

  const inventoryValue = Number(
    products.reduce((s, p) => s + (p.buyingPrice ?? 0) * p.count, 0).toFixed(2)
  );

  res.json({
    profitTracked,
    productCount,
    customerCount,
    inventoryValue,
    outstandingTotal,
    overdueTotal,
    debtors: debtors.slice(0, 12),
    allTime: agg(null),
    thisWeek: agg(weekStart),
    thisMonth: agg(monthStart),
    topProducts,
    lowStock,
    expiringMemberships,
    expiringCount: expiring.length
  });
});
