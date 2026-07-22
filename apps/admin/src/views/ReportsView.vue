<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { api, apiError } from "../api.js";
import { useToast } from "../stores/toast.js";
import BarChart from "../components/BarChart.vue";

const toast = useToast();
const router = useRouter();
const { t } = useI18n();
const range = ref("weekly");
const metric = ref("revenue");
const data = ref(null);
const loading = ref(true);
const overview = ref(null);

const money = (n) => `₺${Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`;
const dateOnly = (iso) => (iso ? new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }) : "—");
const statusPill = { owing: "pill-amber", overdue: "pill-red", clean: "pill-green", credit: "pill-steel" };
const metricLabel = computed(() => ({ revenue: t("reports.mRevenue"), profit: t("reports.mProfit"), units: t("reports.mUnits") }[metric.value]));

function viewMemberSales(d) {
  router.push({ name: "sales", query: { customerId: d.id, name: d.name } });
}

const totals = computed(() => {
  const s = data.value?.series || [];
  return {
    revenue: s.reduce((a, b) => a + b.revenue, 0),
    profit: s.reduce((a, b) => a + b.profit, 0),
    units: s.reduce((a, b) => a + b.units, 0),
    count: s.reduce((a, b) => a + b.count, 0)
  };
});

async function load() {
  loading.value = true;
  try {
    const { data: d } = await api.get("/reports/timeseries", { params: { range: range.value } });
    data.value = d;
    if (!d.profitTracked && metric.value === "profit") metric.value = "revenue";
  } catch (e) {
    toast.err(apiError(e, t("reports.loadFailed")));
  } finally {
    loading.value = false;
  }
}
async function loadOverview() {
  try {
    const { data: d } = await api.get("/reports/overview");
    overview.value = d;
  } catch (e) {
    toast.err(apiError(e, t("reports.recLoadFailed")));
  }
}

// Membership money — separate from sales revenue. Preset ranges or custom dates.
const mship = ref(null);
const mshipPreset = ref("thisMonth");
const mshipFrom = ref("");
const mshipTo = ref("");
const isoDate = (d) => d.toISOString().slice(0, 10);

function setMshipPreset(p) {
  mshipPreset.value = p;
  const now = new Date();
  if (p === "thisMonth") {
    mshipFrom.value = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
    mshipTo.value = isoDate(now);
  } else if (p === "lastMonth") {
    mshipFrom.value = isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    mshipTo.value = isoDate(new Date(now.getFullYear(), now.getMonth(), 0));
  }
  loadMship();
}

async function loadMship() {
  try {
    const { data: d } = await api.get("/reports/membership", {
      params: { from: mshipFrom.value || undefined, to: mshipTo.value || undefined }
    });
    mship.value = d;
  } catch (e) {
    toast.err(apiError(e, t("reports.mshipLoadFailed")));
  }
}
function customMship() {
  mshipPreset.value = "custom";
  loadMship();
}

onMounted(() => { load(); loadOverview(); setMshipPreset("thisMonth"); });

function setRange(r) {
  range.value = r;
  load();
}
</script>

<template>
  <div>
    <header class="page-head">
      <div>
        <div class="eyebrow">{{ t('reports.eyebrow') }}</div>
        <h1>{{ t('reports.title') }}</h1>
      </div>
      <div class="seg">
        <button :class="{ on: range === 'weekly' }" @click="setRange('weekly')">{{ t('reports.weekly') }}</button>
        <button :class="{ on: range === 'monthly' }" @click="setRange('monthly')">{{ t('reports.monthly') }}</button>
      </div>
    </header>

    <p v-if="data && !data.profitTracked" class="hint-bar card">{{ t('reports.profitHint') }}</p>

    <section class="totals">
      <div class="tot card">
        <div class="eyebrow">{{ t('reports.revenue') }}</div>
        <div class="tot-val num">{{ money(totals.revenue) }}</div>
        <div class="tot-sub">{{ range === 'weekly' ? t('reports.last12w') : t('reports.last12m') }}</div>
      </div>
      <div v-if="data?.profitTracked" class="tot card">
        <div class="eyebrow">{{ t('reports.profit') }}</div>
        <div class="tot-val num pos">{{ money(totals.profit) }}</div>
        <div class="tot-sub">{{ t('reports.afterCogs') }}</div>
      </div>
      <div class="tot card">
        <div class="eyebrow">{{ t('reports.units') }}</div>
        <div class="tot-val num">{{ totals.units }}</div>
        <div class="tot-sub">{{ t('reports.ordersN', { n: totals.count }) }}</div>
      </div>
    </section>

    <section class="card chart-card">
      <div class="chart-head">
        <h3>{{ metricLabel }} · {{ range === 'weekly' ? t('reports.weekly') : t('reports.monthly') }}</h3>
        <div class="metric-tabs">
          <button :class="{ on: metric === 'revenue' }" @click="metric = 'revenue'">{{ t('reports.mRevenue') }}</button>
          <button v-if="data?.profitTracked" :class="{ on: metric === 'profit' }" @click="metric = 'profit'">{{ t('reports.mProfit') }}</button>
          <button :class="{ on: metric === 'units' }" @click="metric = 'units'">{{ t('reports.mUnits') }}</button>
        </div>
      </div>

      <div v-if="loading" class="muted pad">{{ t('common.loading') }}</div>
      <BarChart
        v-else
        :series="data?.series || []"
        :metric="metric"
        :show-profit="metric === 'revenue' && data?.profitTracked"
      />
      <div v-if="metric === 'revenue' && data?.profitTracked" class="legend">
        <span><i class="sw ink"></i> {{ t('reports.legendRevenue') }}</span>
        <span><i class="sw orange"></i> {{ t('reports.legendProfit') }}</span>
      </div>
    </section>

    <!-- Receivables: sold but not yet paid -->
    <section v-if="overview" class="receivables">
      <div class="rec-totals">
        <div class="rec card">
          <div class="eyebrow">{{ t('reports.soldNotPaid') }}</div>
          <div class="rec-val num owe">{{ money(overview.outstandingTotal) }}</div>
          <div class="rec-sub">{{ t('reports.totalOutstanding') }}</div>
        </div>
        <div class="rec card">
          <div class="eyebrow">{{ t('reports.overdue') }}</div>
          <div class="rec-val num danger">{{ money(overview.overdueTotal) }}</div>
          <div class="rec-sub">{{ t('reports.unpaidPrev') }}</div>
        </div>
      </div>

      <div class="card debtors">
        <div class="chart-head">
          <h3>{{ t('reports.membersToChase') }}</h3>
          <span class="muted small">{{ t('reports.overdueFirst') }}</span>
        </div>
        <div v-if="!overview.debtors.length" class="pad muted">{{ t('reports.allPaid') }}</div>
        <table v-else class="data">
          <thead>
            <tr><th>{{ t('reports.colMember') }}</th><th>{{ t('reports.colStatus') }}</th><th class="right">{{ t('reports.colOverdue') }}</th><th class="right">{{ t('reports.colBalance') }}</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="d in overview.debtors" :key="d.id" :class="{ rowdanger: d.status === 'overdue' }">
              <td class="strong">{{ d.name }}<div class="sub num">{{ t('reports.oldestUnpaid', { date: dateOnly(d.oldestUnpaid) }) }}</div></td>
              <td><span class="pill" :class="statusPill[d.status] || 'pill-gray'">{{ t(`status.${d.status}`) }}</span></td>
              <td class="right num danger">{{ d.overdueAmount > 0 ? money(d.overdueAmount) : "—" }}</td>
              <td class="right num owe">{{ money(d.balance) }}</td>
              <td class="right"><button class="btn btn-ghost btn-sm" @click="viewMemberSales(d)">{{ t('reports.salesArrow') }}</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Membership payments: fees collected on renewals, separate from sales -->
    <section v-if="mship" class="mship-report">
      <div class="chart-head mship-head">
        <h3>{{ t('reports.mshipTitle') }}</h3>
        <div class="mship-filters">
          <div class="seg">
            <button :class="{ on: mshipPreset === 'thisMonth' }" @click="setMshipPreset('thisMonth')">{{ t('reports.thisMonth') }}</button>
            <button :class="{ on: mshipPreset === 'lastMonth' }" @click="setMshipPreset('lastMonth')">{{ t('reports.lastMonth') }}</button>
          </div>
          <input v-model="mshipFrom" type="date" @change="customMship" />
          <span class="muted">→</span>
          <input v-model="mshipTo" type="date" @change="customMship" />
        </div>
      </div>

      <div class="mship-totals">
        <div class="tot card mship-card">
          <div class="eyebrow">{{ t('reports.mshipCollected') }}</div>
          <div class="tot-val num pos">{{ money(mship.totalCollected) }}</div>
          <div class="tot-sub">{{ t('reports.mshipPaymentsN', { n: mship.paymentCount }) }}</div>
        </div>
        <div class="tot card mship-card debt">
          <div class="eyebrow">{{ t('reports.mshipOutstanding') }}</div>
          <div class="tot-val num danger">{{ money(mship.outstandingDebt) }}</div>
          <div class="tot-sub">{{ t('reports.mshipDebtorsN', { n: mship.debtorCount }) }}</div>
        </div>
      </div>

      <div class="card debtors">
        <div class="chart-head">
          <h3>{{ t('reports.mshipPayments') }}</h3>
        </div>
        <div v-if="!mship.payments.length" class="pad muted">{{ t('reports.mshipEmpty') }}</div>
        <table v-else class="data">
          <thead>
            <tr><th>{{ t('reports.colDate') }}</th><th>{{ t('reports.colMember') }}</th><th>{{ t('reports.colPeriod') }}</th><th class="right">{{ t('reports.colAmount') }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in mship.payments" :key="p.id">
              <td class="num">{{ dateOnly(p.paidAt) }}</td>
              <td class="strong">{{ p.name }}<div class="sub num">{{ p.loginId }}</div></td>
              <td class="num">{{ dateOnly(p.periodStart) }} → {{ dateOnly(p.periodEnd) }}</td>
              <td class="right num">{{ money(p.amount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="mship.unpaid.length" class="card debtors mt">
        <div class="chart-head">
          <h3>{{ t('reports.mshipUnpaidTitle') }}</h3>
          <span class="muted small">{{ t('reports.mshipUnpaidHint') }}</span>
        </div>
        <table class="data">
          <thead>
            <tr><th>{{ t('reports.colMember') }}</th><th>{{ t('reports.colPeriod') }}</th><th class="right">{{ t('reports.colAmount') }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in mship.unpaid" :key="p.id" class="rowdanger">
              <td class="strong">{{ p.name }}<div class="sub num">{{ p.loginId }}</div></td>
              <td class="num">{{ dateOnly(p.periodStart) }} → {{ dateOnly(p.periodEnd) }}</td>
              <td class="right num danger">{{ money(p.amount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; gap: 12px; flex-wrap: wrap; }
.page-head h1 { font-size: 32px; font-weight: 900; }
.seg { display: inline-flex; background: var(--paper); border: 1.5px solid var(--line); border-radius: 10px; padding: 3px; }
.seg button { border: none; background: none; padding: 8px 18px; font-weight: 700; font-size: 14px; border-radius: 7px; color: var(--txt-soft); }
.seg button.on { background: var(--ink); color: #fff; }
.hint-bar { padding: 13px 18px; font-size: 13.5px; color: var(--txt-soft); margin-bottom: 16px; border-left: 4px solid var(--orange); }

.totals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px; }
.tot { padding: 18px 20px; }
.tot-val { font-size: 30px; font-weight: 700; margin: 8px 0 4px; }
.tot-val.pos { color: var(--green); }
.tot-sub { font-size: 12px; color: var(--txt-faint); }

.chart-card { padding: 22px; }
.chart-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; gap: 12px; flex-wrap: wrap; }
.chart-head h3 { font-size: 18px; font-weight: 800; text-transform: capitalize; }
.metric-tabs { display: inline-flex; gap: 4px; }
.metric-tabs button { border: 1.5px solid var(--line); background: var(--paper); padding: 6px 12px; font-size: 12.5px; font-weight: 700; border-radius: 7px; color: var(--txt-soft); }
.metric-tabs button.on { border-color: var(--ink); background: var(--ink); color: #fff; }
.legend { display: flex; gap: 18px; margin-top: 14px; font-size: 12.5px; color: var(--txt-soft); font-weight: 600; }
.sw { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
.sw.ink { background: var(--ink); }
.sw.orange { background: var(--orange); }
.pad { padding: 40px 0; text-align: center; }
.muted { color: var(--txt-faint); }
.small { font-size: 12px; }

.receivables { margin-top: 16px; }
.rec-totals { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.rec { padding: 18px 20px; border-left: 4px solid var(--red); }
.rec-val { font-size: 30px; font-weight: 700; margin: 8px 0 4px; }
.rec-val.owe { color: var(--red); }
.rec-val.danger { color: var(--red); }
.rec-sub { font-size: 12px; color: var(--txt-faint); }
.debtors { padding: 20px; overflow: auto; }
.debtors .sub { font-size: 11px; color: var(--txt-faint); margin-top: 3px; }
.debtors .strong { font-weight: 700; }
.owe { color: var(--red); font-weight: 700; }
.danger { color: var(--red); font-weight: 700; }
.rowdanger td { background: #fdf6f6; }

.mship-report { margin-top: 24px; }
.mship-head { margin-bottom: 14px; }
.mship-head h3 { font-size: 18px; font-weight: 800; }
.mship-filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.mship-filters input[type="date"] { padding: 6px 10px; font-size: 13px; }
.mship-totals { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.mship-card { border-left: 4px solid var(--green); }
.mship-card.debt { border-left-color: var(--red); }
.mt { margin-top: 16px; }

@media (max-width: 720px) { .totals { grid-template-columns: 1fr; } .rec-totals { grid-template-columns: 1fr; } .mship-totals { grid-template-columns: 1fr; } }
</style>
