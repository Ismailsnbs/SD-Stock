import { Router } from "express";
import multer from "multer";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { requireAdmin } from "../auth.js";
import { customerTemplate, parseCustomers, exportCustomersWorkbook } from "../excel.js";
import { computeMemberFinance } from "../finance.js";
import { addDays, nextBoundary, PERIOD_DAYS } from "../membership.js";
import { getAllSettings } from "../settings.js";

export const customersRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Build a customerId -> finance map from all sales + payments in one pass.
async function financeMap() {
  const [sales, payments] = await Promise.all([
    prisma.sale.findMany({ select: { customerId: true, total: true, createdAt: true } }),
    prisma.payment.findMany({ select: { customerId: true, amount: true } })
  ]);
  const salesBy = new Map();
  for (const s of sales) {
    if (s.customerId == null) continue;
    (salesBy.get(s.customerId) || salesBy.set(s.customerId, []).get(s.customerId)).push(s);
  }
  const payBy = new Map();
  for (const p of payments) {
    (payBy.get(p.customerId) || payBy.set(p.customerId, []).get(p.customerId)).push(p);
  }
  return (id) => computeMemberFinance(salesBy.get(id) || [], payBy.get(id) || []);
}

// The membership wallet, summarized per member: debt = unpaid packages,
// lastPaidAt = most recent collected fee (what the members table shows on top).
function summarizeMembership(rows) {
  let debt = 0;
  let unpaidCount = 0;
  let lastPaidAt = null;
  for (const r of rows) {
    if (r.paidAt) {
      if (!lastPaidAt || r.paidAt > lastPaidAt) lastPaidAt = r.paidAt;
    } else {
      debt += r.amount;
      unpaidCount++;
    }
  }
  return { debt: Math.round(debt * 100) / 100, unpaidCount, lastPaidAt };
}

async function membershipMap() {
  const rows = await prisma.membershipPayment.findMany({
    select: { customerId: true, amount: true, paidAt: true }
  });
  const by = new Map();
  for (const r of rows) {
    (by.get(r.customerId) || by.set(r.customerId, []).get(r.customerId)).push(r);
  }
  return (id) => summarizeMembership(by.get(id) || []);
}

// The fee to charge on Renew: per-member override, else the global setting.
async function effectiveFee(customer) {
  if (customer.membershipFee != null) return customer.membershipFee;
  const settings = await getAllSettings();
  return settings.membershipFee;
}

// Public: minimal member list for the storefront combobox (guest checkout).
// Declared before "/:id" so the literal path wins over the param route.
customersRouter.get("/public", async (req, res) => {
  const customers = await prisma.customer.findMany({
    where: { active: true },
    orderBy: [{ name: "asc" }, { surname: "asc" }],
    select: { id: true, name: true, surname: true }
  });
  res.json(customers.map((c) => ({ id: c.id, name: `${c.name} ${c.surname}` })));
});

// Download the import template (Excel).
customersRouter.get("/template", requireAdmin, (req, res) => {
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="customer-template.xlsx"');
  res.send(customerTemplate());
});

// List members with their financials (overall spend, balance, status).
customersRouter.get("/", requireAdmin, async (req, res) => {
  const q = String(req.query.q || "").trim();
  const where = q
    ? {
        OR: [
          { loginId: { contains: q } },
          { name: { contains: q } },
          { surname: { contains: q } },
          { telephone: { contains: q } }
        ]
      }
    : {};
  const [customers, finOf, mshipOf, settings] = await Promise.all([
    prisma.customer.findMany({ where, orderBy: { createdAt: "desc" } }),
    financeMap(),
    membershipMap(),
    getAllSettings()
  ]);
  res.json(
    customers.map(({ password, ...c }) => ({
      ...c,
      finance: finOf(c.id),
      membership: { ...mshipOf(c.id), fee: c.membershipFee ?? settings.membershipFee }
    }))
  );
});

// Export members + balances (receivables), sortable/filterable.
customersRouter.get("/export", requireAdmin, async (req, res) => {
  const [customers, finOf] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    financeMap()
  ]);
  const rows = customers.map((c) => {
    const f = finOf(c.id);
    return {
      id: c.loginId,
      name: `${c.name} ${c.surname}`,
      telephone: c.telephone || "",
      memberSince: c.membershipStart.toISOString().slice(0, 10),
      memberUntil: c.membershipEnd ? c.membershipEnd.toISOString().slice(0, 10) : "",
      overall: f.overall,
      paid: f.totalPaid,
      balance: f.balance,
      status: f.status
    };
  });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="members.xlsx"');
  res.send(exportCustomersWorkbook(rows));
});

// Suggest the next numeric login ID (max existing number + 1) for the add form.
customersRouter.get("/next-id", requireAdmin, async (req, res) => {
  const customers = await prisma.customer.findMany({ select: { loginId: true } });
  let max = 0;
  for (const c of customers) {
    const n = Number(c.loginId);
    if (Number.isInteger(n) && n > max) max = n;
  }
  res.json({ nextId: String(max + 1) });
});

// One member: profile + finance + recent sales + payment history.
customersRouter.get("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return res.status(404).json({ error: "Member not found." });
  const [sales, payments, membershipPayments, settings] = await Promise.all([
    prisma.sale.findMany({ where: { customerId: id }, orderBy: { createdAt: "desc" }, include: { items: true } }),
    prisma.payment.findMany({ where: { customerId: id }, orderBy: { createdAt: "desc" } }),
    prisma.membershipPayment.findMany({ where: { customerId: id }, orderBy: { periodStart: "desc" } }),
    getAllSettings()
  ]);
  const { password, ...safe } = customer;
  res.json({
    ...safe,
    finance: computeMemberFinance(sales, payments),
    membership: { ...summarizeMembership(membershipPayments), fee: customer.membershipFee ?? settings.membershipFee },
    sales,
    payments,
    membershipPayments
  });
});

// Record a payment (partial allowed). Default amount is the current balance.
customersRouter.post("/:id/payments", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "Enter a payment amount greater than 0." });
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return res.status(404).json({ error: "Member not found." });

  // An identical payment seconds apart is a duplicated submit (double-click,
  // browser retry), not a second payment — return the existing row instead.
  const duplicate = await prisma.payment.findFirst({
    where: { customerId: id, amount, createdAt: { gte: new Date(Date.now() - 5000) } },
    orderBy: { createdAt: "desc" }
  });
  if (duplicate) return res.status(200).json(duplicate);

  const payment = await prisma.payment.create({
    data: { customerId: id, amount, note: req.body?.note ? String(req.body.note).trim() : null }
  });
  res.status(201).json(payment);
});

customersRouter.delete("/:id/payments/:paymentId", requireAdmin, async (req, res) => {
  await prisma.payment.delete({ where: { id: Number(req.params.paymentId) } });
  res.json({ ok: true });
});

// Renew the membership: one more 30-day package on top of the current period
// end (not "today", so the member's cycle never shifts). The fee is charged to
// the membership wallet as a MembershipPayment row — paid immediately when the
// admin collected the money, or left unpaid (debt) otherwise. Never charged
// automatically on expiry; only this explicit admin action creates debt.
customersRouter.post("/:id/renew", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return res.status(404).json({ error: "Member not found." });

  const bodyAmount = req.body?.amount;
  const amount = bodyAmount != null ? Number(bodyAmount) : await effectiveFee(customer);
  if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ error: "Enter a valid membership fee." });
  const paid = req.body?.paid !== false; // default: money collected at the desk

  const base = customer.membershipEnd ?? nextBoundary(customer.membershipStart);
  const periodEnd = addDays(base, PERIOD_DAYS);
  const [updated, charge] = await prisma.$transaction([
    prisma.customer.update({ where: { id }, data: { membershipEnd: periodEnd } }),
    prisma.membershipPayment.create({
      data: { customerId: id, amount, periodStart: base, periodEnd, paidAt: paid ? new Date() : null }
    })
  ]);
  const { password: _pw, ...safe } = updated;
  res.json({ ...safe, charge });
});

// Undo a renewal: take one 30-day package back off the period end and delete
// its wallet charge (latest package first) so no phantom debt is left behind.
customersRouter.post("/:id/renew-revert", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return res.status(404).json({ error: "Member not found." });
  if (!customer.membershipEnd) return res.status(400).json({ error: "Member has no membership end date." });

  const latest = await prisma.membershipPayment.findFirst({
    where: { customerId: id },
    orderBy: { periodEnd: "desc" }
  });
  const ops = [
    prisma.customer.update({
      where: { id },
      data: { membershipEnd: addDays(customer.membershipEnd, -PERIOD_DAYS) }
    })
  ];
  // Rows only exist for renewals made after the wallet feature; older
  // extensions have nothing to delete and just get the date pulled back.
  if (latest) ops.push(prisma.membershipPayment.delete({ where: { id: latest.id } }));
  const [updated] = await prisma.$transaction(ops);
  const { password: _pw, ...safe } = updated;
  res.json(safe);
});

// Settle an unpaid membership charge (member paid their fee later).
customersRouter.post("/:id/membership-payments/:mpId/pay", requireAdmin, async (req, res) => {
  const mpId = Number(req.params.mpId);
  const row = await prisma.membershipPayment.findUnique({ where: { id: mpId } });
  if (!row || row.customerId !== Number(req.params.id)) return res.status(404).json({ error: "Charge not found." });
  if (row.paidAt) return res.status(400).json({ error: "Already paid." });
  const updated = await prisma.membershipPayment.update({ where: { id: mpId }, data: { paidAt: new Date() } });
  res.json(updated);
});

// Import an uploaded Excel. `mode=replace` clears the list first; default upserts.
customersRouter.post("/import", requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Attach an Excel file to import." });
  const { rows, errors } = parseCustomers(req.file.buffer);
  if (!rows.length) return res.status(400).json({ error: "No valid rows found.", errors });

  // Preflight: if the file contains IDs that already exist, ask the admin to
  // confirm before overwriting those members (skipped in replace mode, which
  // wipes the list anyway). The client retries with ?confirm=1.
  if (req.query.mode !== "replace" && req.query.confirm !== "1") {
    const existing = await prisma.customer.findMany({
      where: { loginId: { in: rows.map((r) => r.loginId) } },
      select: { loginId: true }
    });
    if (existing.length) {
      const ids = existing
        .map((e) => e.loginId)
        .sort((a, b) => (Number(a) || Infinity) - (Number(b) || Infinity) || a.localeCompare(b));
      return res.status(409).json({
        requiresConfirmation: true,
        existing: ids,
        error: "Some IDs in the file already exist."
      });
    }
  }

  if (req.query.mode === "replace") await prisma.customer.deleteMany({});

  let created = 0;
  let updated = 0;
  for (const r of rows) {
    const data = {
      password: await bcrypt.hash(r.password, 10),
      name: r.name,
      surname: r.surname,
      telephone: r.telephone,
      active: true,
      // A new start re-anchors the 30-day cycle; without one, an existing
      // member's renewals must not be clobbered by a re-import.
      ...(r.membershipStart ? { membershipStart: r.membershipStart, membershipEnd: nextBoundary(r.membershipStart) } : {})
    };
    const existing = await prisma.customer.findUnique({ where: { loginId: r.loginId } });
    if (existing) {
      await prisma.customer.update({ where: { loginId: r.loginId }, data });
      updated++;
    } else {
      await prisma.customer.create({
        data: { loginId: r.loginId, ...data, membershipEnd: data.membershipEnd ?? nextBoundary(new Date()) }
      });
      created++;
    }
  }
  res.json({ created, updated, skipped: errors.length, errors });
});

// Manual add / edit / remove.
customersRouter.post("/", requireAdmin, async (req, res) => {
  const { loginId, password, name, surname, telephone, membershipStart, membershipFee } = req.body || {};
  if (!loginId || !password || !name || !surname) {
    return res.status(400).json({ error: "ID, password, name and surname are required." });
  }
  const fee = membershipFee === undefined || membershipFee === null || membershipFee === "" ? null : Number(membershipFee);
  if (fee !== null && (!Number.isFinite(fee) || fee < 0)) return res.status(400).json({ error: "Enter a valid membership fee." });
  const exists = await prisma.customer.findUnique({ where: { loginId: String(loginId).trim() } });
  if (exists) return res.status(409).json({ error: "A member with this ID already exists." });

  const start = membershipStart && !Number.isNaN(Date.parse(membershipStart)) ? new Date(membershipStart) : new Date();
  const customer = await prisma.customer.create({
    data: {
      loginId: String(loginId).trim(),
      password: await bcrypt.hash(String(password), 10),
      name: name.trim(),
      surname: surname.trim(),
      telephone: telephone ? String(telephone).trim() : null,
      membershipFee: fee,
      membershipStart: start,
      membershipEnd: nextBoundary(start)
    }
  });
  const { password: _pw, ...safe } = customer;
  res.status(201).json(safe);
});

customersRouter.put("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { name, surname, telephone, password, active, membershipStart, membershipFee } = req.body || {};
  const data = {};
  if (name !== undefined) data.name = String(name).trim();
  if (surname !== undefined) data.surname = String(surname).trim();
  if (telephone !== undefined) data.telephone = telephone ? String(telephone).trim() : null;
  if (active !== undefined) data.active = Boolean(active);
  if (membershipFee !== undefined) {
    // Empty/null clears the override (falls back to the global fee).
    const fee = membershipFee === null || membershipFee === "" ? null : Number(membershipFee);
    if (fee !== null && (!Number.isFinite(fee) || fee < 0)) return res.status(400).json({ error: "Enter a valid membership fee." });
    data.membershipFee = fee;
  }
  if (password) data.password = await bcrypt.hash(String(password), 10);
  if (membershipStart && !Number.isNaN(Date.parse(membershipStart))) {
    data.membershipStart = new Date(membershipStart);
    data.membershipEnd = nextBoundary(data.membershipStart); // new start re-anchors the cycle
  }

  const customer = await prisma.customer.update({ where: { id }, data });
  const { password: _pw, ...safe } = customer;
  res.json(safe);
});

customersRouter.delete("/:id", requireAdmin, async (req, res) => {
  await prisma.customer.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});
