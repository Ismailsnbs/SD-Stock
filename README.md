# Spotter — Gym Stock & Sales

A pnpm monorepo for running a gym's shop: an **admin panel** (stock, members, sales, reports) and a **mobile-first customer storefront** (guest buy or member login), backed by an **Express + Prisma + SQLite** API.

```
apps/
  api/        Express + Prisma + SQLite — JWT auth, Excel import/export, reports
  admin/      Vue 3 + Vite — responsive web + mobile panel
  customer/   Vue 3 + Vite — mobile-first storefront (infinite login session)
packages/
  shared/     shared Excel column specs + constants
```

## Quick start

```bash
pnpm install                 # installs all workspaces
pnpm --filter @gym/api exec prisma generate
pnpm --filter @gym/api exec prisma db push
node apps/api/src/seed-mock.js   # load demo data (or: pnpm --filter @gym/api seed for admin only)
pnpm dev                     # runs api + admin + customer together
```

| App      | URL                     |
| -------- | ----------------------- |
| API      | http://localhost:4000   |
| Admin    | http://localhost:5173   |
| Customer | http://localhost:5174   |

### Demo logins
- **Admin:** `admin` / `admin123`
- **Members:** `alperen` / `1234` (also `deniz`, `elif`, `mert`, `zeynep` — all `1234`)

## How it works

**Admin panel**
- Upload customers via Excel — template has `id, password, name, surname` (required) + `telephone` (optional). Download it from the Members page.
- Upload stock via Excel — `product, count, sellingPrice` (required) + `buyingPrice` (optional). When buying price is present, profit + margin unlock in the reports.
- Sales feed with Excel export; weekly / monthly report charts (revenue, profit, units).

**Customer storefront (mobile-first)**
- **Quick buy:** no login — add to cart, enter your name (must match the member list), done.
- **Member login:** sign in with ID + password. The token never expires, so the member stays logged in until they tap *Log out*.

## Notes
- SQLite DB lives at `apps/api/prisma/dev.db`. Delete it + re-run `prisma db push` to reset.
- Switch to PostgreSQL later by changing the `datasource` in `apps/api/prisma/schema.prisma` and `DATABASE_URL`.
- Move `JWT_SECRET` in `apps/api/.env` to a strong random value before any real deployment.
