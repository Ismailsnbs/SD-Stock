import { prisma } from "./db.js";

// Memberships run in 30-day packages anchored at membershipStart. membershipEnd
// is the paid-until date; renewing adds 30 days onto it (never onto "today", so
// paying early or late doesn't shift the member's cycle).
export const DAY_MS = 86400000;
export const PERIOD_DAYS = 30;

export function addDays(date, n) {
  return new Date(new Date(date).getTime() + n * DAY_MS);
}

// Smallest start + k*30d strictly after `now` (k >= 1). Future start → start + 30d.
export function nextBoundary(start, now = new Date()) {
  const s = new Date(start);
  if (s >= now) return addDays(s, PERIOD_DAYS);
  const k = Math.floor((now - s) / (PERIOD_DAYS * DAY_MS)) + 1;
  return addDays(s, k * PERIOD_DAYS);
}

// >0 = days remaining, <=0 = expired. Single convention for API + both UIs.
export function daysLeft(end, now = new Date()) {
  return Math.ceil((new Date(end) - now) / DAY_MS);
}

// Idempotent boot backfill: members created before this feature get the end of
// their current cycle (not start+30, which would flood the panel with "expired").
export async function backfillMembershipEnds() {
  const missing = await prisma.customer.findMany({
    where: { membershipEnd: null },
    select: { id: true, membershipStart: true }
  });
  for (const c of missing) {
    await prisma.customer.update({
      where: { id: c.id },
      data: { membershipEnd: nextBoundary(c.membershipStart) }
    });
  }
  if (missing.length) console.log(`Backfilled membershipEnd for ${missing.length} member(s).`);
}
