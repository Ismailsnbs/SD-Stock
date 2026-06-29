import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { signAdminToken, signCustomerToken, requireCustomer } from "../auth.js";

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

// Resolve "who am I" for a persisted (infinite) token.
authRouter.get("/customer/me", requireCustomer, async (req, res) => {
  const customer = await prisma.customer.findUnique({ where: { id: req.customer.sub } });
  if (!customer || !customer.active) return res.status(401).json({ error: "Account is no longer active." });
  res.json({
    customer: { id: customer.id, loginId: customer.loginId, name: customer.name, surname: customer.surname }
  });
});
