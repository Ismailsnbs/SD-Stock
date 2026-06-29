import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "./db.js";

// Populates the DB with realistic mock data for a live test run.
// Safe to re-run: it wipes sales + upserts customers/products.

const customers = [
  { loginId: "alperen", password: "1234", name: "Alperen", surname: "Yilmaz", telephone: "5551112233", membershipStart: "2026-01-15" },
  { loginId: "deniz", password: "1234", name: "Deniz", surname: "Kaya", telephone: "5559876543", membershipStart: "2026-03-01" },
  { loginId: "elif", password: "1234", name: "Elif", surname: "Demir", telephone: null, membershipStart: "2025-11-20" },
  { loginId: "mert", password: "1234", name: "Mert", surname: "Sahin", telephone: "5443322110", membershipStart: "2026-02-10" },
  { loginId: "zeynep", password: "1234", name: "Zeynep", surname: "Arslan", telephone: "5321009988", membershipStart: "2026-05-05" }
];

// Desired payment behaviour per member, to show every account state on the live test.
// full = pays everything (clean) · currentOnly = clears prior months, current month owing
// none = pays nothing (overdue) · partial = pays a fraction (overdue)
const paymentPlan = {
  alperen: "full",
  zeynep: "full",
  mert: "currentOnly",
  deniz: "none",
  elif: "partial"
};

const products = [
  { name: "Whey Protein 1kg", count: 24, buyingPrice: 380, sellingPrice: 520 },
  { name: "Whey Protein 2kg", count: 12, buyingPrice: 700, sellingPrice: 950 },
  { name: "Creatine 300g", count: 40, buyingPrice: 120, sellingPrice: 199 },
  { name: "BCAA 250g", count: 18, buyingPrice: 150, sellingPrice: 230 },
  { name: "Pre-Workout 300g", count: 9, buyingPrice: 210, sellingPrice: 320 },
  { name: "Protein Bar", count: 80, buyingPrice: 18, sellingPrice: 35 },
  { name: "Shaker Bottle", count: 60, buyingPrice: null, sellingPrice: 75 },
  { name: "Lifting Straps", count: 25, buyingPrice: 40, sellingPrice: 90 },
  { name: "Resistance Band", count: 4, buyingPrice: 55, sellingPrice: 120 },
  { name: "Gym Towel", count: 30, buyingPrice: null, sellingPrice: 60 }
];

async function main() {
  // Admin (in case the plain seed wasn't run).
  const username = process.env.ADMIN_USERNAME || "admin";
  if (!(await prisma.admin.findUnique({ where: { username } }))) {
    await prisma.admin.create({
      data: { username, passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 10) }
    });
  }

  // Customers (upsert by loginId, password hashed).
  for (const c of customers) {
    const data = {
      password: await bcrypt.hash(c.password, 10),
      name: c.name,
      surname: c.surname,
      telephone: c.telephone,
      membershipStart: new Date(c.membershipStart),
      active: true
    };
    await prisma.customer.upsert({
      where: { loginId: c.loginId },
      update: data,
      create: { loginId: c.loginId, ...data }
    });
  }

  // Products (upsert by name).
  for (const p of products) {
    await prisma.product.upsert({ where: { name: p.name }, update: p, create: p });
  }

  // Reset and generate mock sales spread across the last ~70 days.
  await prisma.payment.deleteMany({});
  await prisma.saleItem.deleteMany({});
  await prisma.sale.deleteMany({});

  const allCustomers = await prisma.customer.findMany();
  const allProducts = await prisma.product.findMany();
  const pick = (arr) => arr[Math.floor(((Date.now() % 9973) * Math.random() * arr.length)) % arr.length];

  // Deterministic-ish pseudo-random without Math.random reliance issues.
  let seed = 42;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const now = Date.now();
  let total = 0;
  for (let d = 70; d >= 0; d--) {
    const salesToday = Math.floor(rnd() * 4); // 0–3 sales/day
    for (let s = 0; s < salesToday; s++) {
      const customer = allCustomers[Math.floor(rnd() * allCustomers.length)];
      const lineCount = 1 + Math.floor(rnd() * 3);
      const chosen = [];
      for (let l = 0; l < lineCount; l++) {
        const product = allProducts[Math.floor(rnd() * allProducts.length)];
        if (chosen.find((c) => c.id === product.id)) continue;
        chosen.push(product);
      }
      const items = chosen.map((p) => {
        const quantity = 1 + Math.floor(rnd() * 2);
        return {
          productId: p.id,
          productName: p.name,
          quantity,
          unitPrice: p.sellingPrice,
          unitCost: p.buyingPrice ?? null,
          lineTotal: Number((p.sellingPrice * quantity).toFixed(2))
        };
      });
      const saleTotal = Number(items.reduce((a, i) => a + i.lineTotal, 0).toFixed(2));
      const saleCost = Number(
        items.reduce((a, i) => a + (i.unitCost != null ? i.unitCost * i.quantity : 0), 0).toFixed(2)
      );
      const createdAt = new Date(now - d * 86400000 - Math.floor(rnd() * 36000000));

      await prisma.sale.create({
        data: {
          customerId: customer.id,
          customerName: `${customer.name} ${customer.surname}`,
          mode: rnd() > 0.5 ? "login" : "guest",
          total: saleTotal,
          cost: saleCost,
          createdAt,
          items: { create: items }
        }
      });
      total++;
    }
  }

  // Record payments per the plan so the live test shows clean/owing/overdue.
  const monthStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1);
  let paymentCount = 0;
  for (const c of allCustomers) {
    const theirSales = await prisma.sale.findMany({ where: { customerId: c.id }, select: { total: true, createdAt: true } });
    const grand = theirSales.reduce((a, s) => a + s.total, 0);
    const currentMonth = theirSales.filter((s) => s.createdAt >= monthStart).reduce((a, s) => a + s.total, 0);
    if (grand <= 0) continue;

    const plan = paymentPlan[c.loginId] || "none";
    let amount = 0;
    if (plan === "full") amount = grand;
    else if (plan === "currentOnly") amount = grand - currentMonth; // clears prior months only
    else if (plan === "partial") amount = Math.round(grand * 0.3 * 100) / 100;
    else amount = 0;

    if (amount > 0.01) {
      await prisma.payment.create({
        data: {
          customerId: c.id,
          amount: Math.round(amount * 100) / 100,
          note: "Membership renewal payment",
          createdAt: new Date(now - Math.floor(rnd() * 10) * 86400000)
        }
      });
      paymentCount++;
    }
  }

  console.log(`Mock data ready: ${allCustomers.length} members, ${allProducts.length} products, ${total} sales, ${paymentCount} payments.`);
  console.log("Admin login:    admin / admin123");
  console.log("Member logins:  alperen / 1234   (also deniz, elif, mert, zeynep — all 1234)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
