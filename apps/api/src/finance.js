// Member account maths — shared by the customers list, payment flow and reports.
//
// Billing model: calendar month-end. Payments are applied oldest-sale-first
// (FIFO). Anything still uncovered that belongs to a *previous* calendar month
// is "overdue"; uncovered amounts in the current month are just "owing".

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeMemberFinance(sales, payments, now = new Date()) {
  const ordered = [...sales].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const overall = r2(ordered.reduce((s, x) => s + x.total, 0)); // lifetime spend
  const totalPaid = r2(payments.reduce((s, p) => s + p.amount, 0));
  const balance = r2(overall - totalPaid);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Spread payments across sales, oldest first.
  let remaining = totalPaid;
  let overdueAmount = 0;
  let currentDue = 0;
  let oldestUnpaid = null;

  for (const sale of ordered) {
    const covered = Math.min(remaining, sale.total);
    remaining -= covered;
    const uncovered = sale.total - covered;
    if (uncovered > 0.001) {
      if (!oldestUnpaid) oldestUnpaid = sale.createdAt;
      if (new Date(sale.createdAt) < monthStart) overdueAmount += uncovered;
      else currentDue += uncovered;
    }
  }

  overdueAmount = r2(overdueAmount);
  currentDue = r2(currentDue);

  let status = "clean";
  if (balance < -0.01) status = "credit";
  else if (overdueAmount > 0.01) status = "overdue";
  else if (balance > 0.01) status = "owing";

  return { overall, totalPaid, balance, overdueAmount, currentDue, status, oldestUnpaid };
}
