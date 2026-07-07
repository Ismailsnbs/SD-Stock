import XLSX from "xlsx";
import {
  CUSTOMER_COLUMNS,
  STOCK_COLUMNS,
  CUSTOMER_SAMPLE,
  STOCK_SAMPLE
} from "@gym/shared";

// ---- Template generation -------------------------------------------------

// Make every header row sortable + filterable in Excel, and freeze it on scroll.
function makeFilterable(ws) {
  const range = ws["!ref"];
  if (range) ws["!autofilter"] = { ref: range };
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
}

// How many data rows get pre-formatted as Text in the template. Typing into
// these cells keeps leading zeros ("0001" stays "0001" instead of becoming 1).
const TEMPLATE_TEXT_ROWS = 500;

function buildTemplate(columns, sample, sheetName) {
  const headers = columns.map((c) => c.header);
  const rows = sample.map((row) => columns.map((c) => row[c.key] ?? ""));

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Pre-format text-sensitive columns (ids, passwords, phones) as Text so
  // Excel doesn't coerce entries like 0001 into the number 1.
  if (columns.some((c) => c.text)) {
    columns.forEach((c, ci) => {
      if (!c.text) return;
      for (let r = 1; r <= TEMPLATE_TEXT_ROWS; r++) {
        const addr = XLSX.utils.encode_cell({ c: ci, r });
        if (ws[addr]) ws[addr].z = "@";
        else ws[addr] = { t: "s", v: "", z: "@" };
      }
    });
    ws["!ref"] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: columns.length - 1, r: TEMPLATE_TEXT_ROWS } });
  }
  makeFilterable(ws);

  // A second tiny "Guide" sheet documenting required vs optional columns.
  const guide = [
    ["Column", "Required?", "Notes"],
    ...columns.map((c) => [c.header, c.required ? "REQUIRED" : "optional", c.hint])
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guide);

  ws["!cols"] = headers.map(() => ({ wch: 18 }));
  wsGuide["!cols"] = [{ wch: 16 }, { wch: 12 }, { wch: 40 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.utils.book_append_sheet(wb, wsGuide, "Guide");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export function customerTemplate() {
  return buildTemplate(CUSTOMER_COLUMNS, CUSTOMER_SAMPLE, "Customers");
}

export function stockTemplate() {
  return buildTemplate(STOCK_COLUMNS, STOCK_SAMPLE, "Stock");
}

// ---- Parsing uploaded files ---------------------------------------------

function sheetToRows(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const first = wb.SheetNames[0];
  const ws = wb.Sheets[first];
  return XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });
}

// Accepts an Excel serial number (date-formatted cells arrive as e.g. 46204,
// which Date.parse would turn into year 46204) or a date string. Serials are
// converted via UTC math; out-of-range years are rejected as garbage.
function toDateValue(value) {
  let d = null;
  if (typeof value === "number" && Number.isFinite(value)) {
    d = new Date(Math.round((value - 25569) * 86400000)); // days since 1899-12-30 → UTC ms
  } else {
    const s = String(value ?? "").trim();
    if (s && /^\d+([.,]\d+)?$/.test(s)) d = new Date(Math.round((Number(s.replace(",", ".")) - 25569) * 86400000));
    else if (s && !Number.isNaN(Date.parse(s))) d = new Date(s);
  }
  if (!d || Number.isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  return year >= 1990 && year <= 2100 ? d : null;
}

// Header matching is case/space insensitive so "Telephone " still maps to telephone.
function normalize(key) {
  return String(key).trim().toLowerCase().replace(/\s+/g, "");
}

function pick(row, columnKey) {
  const target = normalize(columnKey);
  for (const k of Object.keys(row)) {
    if (normalize(k) === target) return row[k];
  }
  return "";
}

export function parseCustomers(buffer) {
  const raw = sheetToRows(buffer);
  const rows = [];
  const errors = [];

  raw.forEach((r, i) => {
    const line = i + 2; // +1 header, +1 to 1-index
    const membershipStart = toDateValue(pick(r, "membershipStart"));
    const record = {
      loginId: String(pick(r, "id")).trim(),
      password: String(pick(r, "password")).trim(),
      name: String(pick(r, "name")).trim(),
      surname: String(pick(r, "surname")).trim(),
      telephone: String(pick(r, "telephone")).trim() || null,
      membershipStart // null → DB default (today)
    };

    // Fully blank row (e.g. the template's pre-formatted empty cells) — skip silently.
    if (!record.loginId && !record.password && !record.name && !record.surname && !record.telephone && !membershipStart) return;

    const missing = [];
    if (!record.loginId) missing.push("id");
    if (!record.password) missing.push("password");
    if (!record.name) missing.push("name");
    if (!record.surname) missing.push("surname");

    if (missing.length) {
      errors.push(`Row ${line}: missing ${missing.join(", ")}`);
      return;
    }
    rows.push(record);
  });

  return { rows, errors };
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export function parseStock(buffer) {
  const raw = sheetToRows(buffer);
  const rows = [];
  const errors = [];

  raw.forEach((r, i) => {
    const line = i + 2;
    const name = String(pick(r, "product")).trim();
    const count = toNumber(pick(r, "count"));
    const buyingPrice = toNumber(pick(r, "buyingPrice"));
    const sellingPrice = toNumber(pick(r, "sellingPrice"));

    // Fully blank row — skip silently.
    if (!name && count === null && buyingPrice === null && sellingPrice === null) return;

    const problems = [];
    if (!name) problems.push("product is required");
    if (count === null || Number.isNaN(count)) problems.push("count must be a number");
    if (sellingPrice === null || Number.isNaN(sellingPrice)) problems.push("sellingPrice must be a number");
    if (buyingPrice !== null && Number.isNaN(buyingPrice)) problems.push("buyingPrice must be a number");

    if (problems.length) {
      errors.push(`Row ${line}: ${problems.join("; ")}`);
      return;
    }

    rows.push({
      name,
      count: Math.max(0, Math.trunc(count)),
      buyingPrice: buyingPrice, // may be null
      sellingPrice
    });
  });

  return { rows, errors };
}

// ---- Export current data -------------------------------------------------

// `financeById` maps customerId -> { overall, balance } so each row can show
// the member's lifetime spend ("overall") and current outstanding balance.
export function exportSalesWorkbook(sales, financeById = new Map()) {
  const flat = sales.map((s) => {
    const fin = financeById.get(s.customerId) || {};
    return {
      date: s.createdAt.toISOString().slice(0, 10),
      time: s.createdAt.toISOString().slice(11, 16),
      customer: s.customerName,
      mode: s.mode,
      items: s.items.map((i) => `${i.productName} x${i.quantity}`).join(", "),
      total: s.total,
      cost: s.cost,
      profit: Number((s.total - s.cost).toFixed(2)),
      overall: fin.overall ?? "", // member lifetime spend
      balance: fin.balance ?? "" // member outstanding balance
    };
  });
  const ws = XLSX.utils.json_to_sheet(flat);
  ws["!cols"] = [
    { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 8 }, { wch: 40 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }
  ];
  makeFilterable(ws);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sales");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

// Receivables-style member export: who owes what, sortable/filterable.
export function exportCustomersWorkbook(rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
  ];
  makeFilterable(ws);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Members");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
