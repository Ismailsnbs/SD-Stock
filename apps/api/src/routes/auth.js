import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { signAdminToken, signCustomerToken, requireAdmin, requireCustomer } from "../auth.js";
import { computeMemberFinance } from "../finance.js";
import { getPublicSettings } from "../settings.js";

export const authRouter = Router();

// --- Admin ---------------------------------------------------------------
authRouter.post("/admin/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Enter your username and password." });

  const admin = await prisma.admin.findUnique({ where: { username: String(username).trim() } });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    return res.status(401).json({ error: "Username or password is incorrect." });
  }
  res.json({ token: signAdminToken(admin), admin: { id: admin.id, username: admin.username } });
});

// Current admin's profile (used to refresh the displayed name).
authRouter.get("/admin/me", requireAdmin, async (req, res) => {
  const admin = await prisma.admin.findUnique({ where: { id: req.admin.sub } });
  if (!admin) return res.status(401).json({ error: "Account not found." });
  res.json({ admin: { id: admin.id, username: admin.username } });
});

// Admin updates their own username and/or password.
// Changing the password requires the current password. A fresh token is returned
// so the username embedded in the token (and the active session) stays correct.
authRouter.put("/admin/me", requireAdmin, async (req, res) => {
  const admin = await prisma.admin.findUnique({ where: { id: req.admin.sub } });
  if (!admin) return res.status(401).json({ error: "Account not found." });

  const { username, currentPassword, newPassword } = req.body || {};
  const data = {};

  if (username !== undefined) {
    const u = String(username).trim();
    if (!u) return res.status(400).json({ error: "Username can't be empty." });
    if (u !== admin.username) {
      const exists = await prisma.admin.findUnique({ where: { username: u } });
      if (exists) return res.status(409).json({ error: "That username is already taken." });
      data.username = u;
    }
  }

  if (newPassword) {
    if (!currentPassword || !(await bcrypt.compare(String(currentPassword), admin.passwordHash))) {
      return res.status(403).json({ error: "Your current password is incorrect." });
    }
    if (String(newPassword).length < 4) {
      return res.status(400).json({ error: "New password must be at least 4 characters." });
    }
    data.passwordHash = await bcrypt.hash(String(newPassword), 10);
  }

  if (!Object.keys(data).length) return res.status(400).json({ error: "Nothing to update." });

  const updated = await prisma.admin.update({ where: { id: admin.id }, data });
  res.json({ token: signAdminToken(updated), admin: { id: updated.id, username: updated.username } });
});

// --- Customer ------------------------------------------------------------
authRouter.post("/customer/login", async (req, res) => {
  const { loginId, password } = req.body || {};
  if (!loginId || !password) return res.status(400).json({ error: "Enter your ID and password." });

  const customer = await prisma.customer.findUnique({ where: { loginId: String(loginId).trim() } });
  if (!customer || !customer.active || !(await bcrypt.compare(password, customer.password))) {
    return res.status(401).json({ error: "ID or password is incorrect." });
  }

  res.json({
    token: signCustomerToken(customer),
    customer: { id: customer.id, loginId: customer.loginId, name: customer.name, surname: customer.surname }
  });
});

// Resolve "who am I" for a persisted (infinite) token, plus the member's account
// balance and the storefront flags (so the shop knows whether to show the balance).
authRouter.get("/customer/me", requireCustomer, async (req, res) => {
  const customer = await prisma.customer.findUnique({ where: { id: req.customer.sub } });
  if (!customer || !customer.active) return res.status(401).json({ error: "Account is no longer active." });
  const [sales, payments, settings] = await Promise.all([
    prisma.sale.findMany({ where: { customerId: customer.id }, select: { total: true, createdAt: true } }),
    prisma.payment.findMany({ where: { customerId: customer.id }, select: { amount: true } }),
    getPublicSettings()
  ]);
  res.json({
    customer: { id: customer.id, loginId: customer.loginId, name: customer.name, surname: customer.surname },
    finance: computeMemberFinance(sales, payments),
    settings
  });
});
