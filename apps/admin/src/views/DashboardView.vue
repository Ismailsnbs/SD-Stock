<script setup>
import { ref, onMounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import { api, apiError } from "../api.js";
import { useToast } from "../stores/toast.js";
import StatCard from "../components/StatCard.vue";

const toast = useToast();
const { t } = useI18n();
const overview = ref(null);
const loading = ref(true);

const money = (n) => `₺${Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`;

onMounted(async () => {
  try {
    const { data } = await api.get("/reports/overview");
    overview.value = data;
  } catch (e) {
    toast.err(apiError(e, t("dash.loadFailed")));
  } finally {
    loading.value = false;
  }
});

const o = computed(() => overview.value);
</script>

<template>
  <div>
    <header class="page-head">
      <div>
        <div class="eyebrow">{{ t('dash.eyebrow') }}</div>
        <h1>{{ t('dash.title') }}</h1>
      </div>
    </header>

    <div v-if="loading" class="muted">{{ t('common.loading') }}</div>

    <template v-else-if="o">
      <section class="stats">
        <StatCard :label="t('dash.revenueMonth')" :value="money(o.thisMonth.revenue)" accent="orange" :sub="t('dash.salesN', { n: o.thisMonth.count })" />
        <StatCard
          v-if="o.profitTracked"
          :label="t('dash.profitMonth')"
          :value="money(o.thisMonth.profit)"
          accent="green"
          :sub="t('dash.thisWeek', { v: money(o.thisWeek.profit || 0) })"
        />
        <StatCard :label="t('dash.unitsMonth')" :value="o.thisMonth.units" accent="steel" :unit="t('dash.pcs')" />
        <StatCard :label="t('dash.activeProducts')" :value="o.productCount" :sub="t('dash.membersN', { n: o.customerCount })" />
      </section>

      <div class="grid-2">
        <section class="card block">
          <h3 class="block-title">{{ t('dash.topSellers') }}</h3>
          <div v-if="!o.topProducts.length" class="empty">{{ t('dash.noSales') }}</div>
          <ol v-else class="rank">
            <li v-for="(p, i) in o.topProducts" :key="p.name">
              <span class="rank-no num">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="rank-name">{{ p.name }}</span>
              <span class="rank-val num">{{ p.units }}<span class="rank-unit">{{ t('dash.pcs') }}</span></span>
            </li>
          </ol>
        </section>

        <section class="card block">
          <h3 class="block-title">{{ t('dash.lowStock') }}</h3>
          <div v-if="!o.lowStock.length" class="empty">{{ t('dash.wellStocked') }}</div>
          <ul v-else class="low">
            <li v-for="p in o.lowStock" :key="p.id">
              <span class="rank-name">{{ p.name }}</span>
              <span class="pill" :class="p.count === 0 ? 'pill-red' : 'pill-amber'">{{ t('dash.leftN', { n: p.count }) }}</span>
            </li>
          </ul>
        </section>
      </div>

      <section v-if="o.profitTracked" class="card inv">
        <div>
          <div class="eyebrow">{{ t('dash.inventoryValue') }}</div>
          <div class="inv-val num">{{ money(o.inventoryValue) }}</div>
        </div>
        <router-link to="/reports" class="btn btn-dark">{{ t('dash.viewReports') }}</router-link>
      </section>
    </template>
  </div>
</template>

<style scoped>
.page-head { margin-bottom: 22px; }
.page-head h1 { font-size: 32px; font-weight: 900; }
.muted { color: var(--txt-soft); }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 18px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.block { padding: 20px; }
.block-title { font-size: 17px; font-weight: 800; margin-bottom: 14px; }
.empty { color: var(--txt-faint); font-size: 14px; padding: 8px 0; }

.rank { list-style: none; margin: 0; padding: 0; }
.rank li { display: flex; align-items: center; gap: 14px; padding: 11px 0; border-bottom: 1px solid var(--line); }
.rank li:last-child { border-bottom: none; }
.rank-no { font-size: 14px; color: var(--orange); font-weight: 700; width: 24px; }
.rank-name { flex: 1; font-weight: 600; }
.rank-val { font-weight: 700; font-size: 16px; }
.rank-unit { font-size: 11px; color: var(--txt-faint); margin-left: 3px; font-family: var(--font-display); }

.low { list-style: none; margin: 0; padding: 0; }
.low li { display: flex; align-items: center; justify-content: space-between; padding: 11px 0; border-bottom: 1px solid var(--line); }
.low li:last-child { border-bottom: none; }

.inv { margin-top: 16px; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.inv-val { font-size: 30px; font-weight: 700; margin-top: 4px; }

@media (max-width: 980px) { .stats { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 720px) { .grid-2 { grid-template-columns: 1fr; } .inv { flex-direction: column; align-items: stretch; } }
</style>
