// Shared contracts between API, admin panel and customer app.
// Single source of truth for the Excel import/export column specs so the
// template the admin downloads always matches what the importer expects.

/**
 * Customer import columns.
 * `id` is the login id the customer types on the storefront.
 */
export const CUSTOMER_COLUMNS = [
  { key: "id", header: "id", required: true, hint: "Login ID (unique)" },
  { key: "password", header: "password", required: true, hint: "Login password" },
  { key: "name", header: "name", required: true, hint: "First name" },
  { key: "surname", header: "surname", required: true, hint: "Last name" },
  { key: "telephone", header: "telephone", required: false, hint: "Optional phone" },
  { key: "membershipStart", header: "membershipStart", required: false, hint: "Optional join date (YYYY-MM-DD) — defaults to today" }
];

/**
 * Stock import columns.
 * `buyingPrice` is optional — when present the sales overview can show profit
 * and the weekly / monthly reports unlock margin figures.
 */
export const STOCK_COLUMNS = [
  { key: "product", header: "product", required: true, hint: "Product name (unique)" },
  { key: "count", header: "count", required: true, hint: "Stock quantity" },
  { key: "buyingPrice", header: "buyingPrice", required: false, hint: "Optional — unlocks profit reports" },
  { key: "sellingPrice", header: "sellingPrice", required: true, hint: "Price charged to customers" }
];

// Example rows shipped inside the downloadable templates so the format is obvious.
export const CUSTOMER_SAMPLE = [
  { id: "alperen", password: "1234", name: "Alperen", surname: "Yilmaz", telephone: "5551112233", membershipStart: "2026-01-15" },
  { id: "deniz", password: "gym2026", name: "Deniz", surname: "Kaya", telephone: "", membershipStart: "" }
];

export const STOCK_SAMPLE = [
  { product: "Whey Protein 1kg", count: 24, buyingPrice: 380, sellingPrice: 520 },
  { product: "Creatine 300g", count: 40, buyingPrice: 120, sellingPrice: 199 },
  { product: "Shaker Bottle", count: 60, buyingPrice: "", sellingPrice: 75 }
];

export const REPORT_RANGES = ["weekly", "monthly"];
export const SALE_MODES = { GUEST: "guest", LOGIN: "login" };
