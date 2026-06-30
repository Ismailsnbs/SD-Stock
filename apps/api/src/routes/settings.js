import { Router } from "express";
import { requireAdmin } from "../auth.js";
import { getAllSettings, getPublicSettings, setSettings } from "../settings.js";

export const settingsRouter = Router();

// Storefront-readable flags (no auth) — e.g. whether to show the member's balance.
settingsRouter.get("/public", async (req, res) => {
  res.json(await getPublicSettings());
});

// Admin: read + update all settings.
settingsRouter.get("/", requireAdmin, async (req, res) => {
  res.json(await getAllSettings());
});

settingsRouter.put("/", requireAdmin, async (req, res) => {
  res.json(await setSettings(req.body || {}));
});
