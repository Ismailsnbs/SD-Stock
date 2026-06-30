// App-wide settings, persisted as key/value rows and toggled from the admin panel.
// Add a key here (with its default) to make it readable/writable; PUBLIC_KEYS are the
// subset the customer storefront is allowed to read.
import { prisma } from "./db.js";

const DEFAULTS = { showCustomerBalance: true };
const PUBLIC_KEYS = ["showCustomerBalance"];
const BOOL_KEYS = new Set(["showCustomerBalance"]);

const fromStored = (key, raw) => (BOOL_KEYS.has(key) ? raw === "true" : raw);
const toStored = (key, val) => (BOOL_KEYS.has(key) ? (val ? "true" : "false") : String(val));

// Every known setting, falling back to its default when no row exists yet.
export async function getAllSettings() {
  const rows = await prisma.setting.findMany();
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const out = {};
  for (const key of Object.keys(DEFAULTS)) {
    out[key] = key in stored ? fromStored(key, stored[key]) : DEFAULTS[key];
  }
  return out;
}

// Only the storefront-facing flags.
export async function getPublicSettings() {
  const all = await getAllSettings();
  return Object.fromEntries(PUBLIC_KEYS.map((k) => [k, all[k]]));
}

// Upsert any known keys present in `patch`; unknown keys are ignored.
export async function setSettings(patch = {}) {
  for (const [key, val] of Object.entries(patch)) {
    if (!(key in DEFAULTS)) continue;
    const value = toStored(key, val);
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  return getAllSettings();
}
