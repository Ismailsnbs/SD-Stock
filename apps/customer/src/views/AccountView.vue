<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuth } from "../stores/auth.js";
import { api, apiError } from "../api.js";
import { useToast } from "../stores/toast.js";

const router = useRouter();
const auth = useAuth();
const toast = useToast();
const { t } = useI18n();
const sales = ref([]);
const loading = ref(true);

const money = (n) => `₺${Number(n).toLocaleString("tr-TR")}`;
const when = (iso) => new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

// Default range: last 1 month (From = a month ago, To = today).
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const defaultFrom = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return ymd(d); };
const defaultTo = () => ymd(new Date());

const from = ref(defaultFrom());
const to = ref(defaultTo());

const spent = computed(() => sales.value.reduce((a, s) => a + s.total, 0));

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get("/sales/mine", { params: { from: from.value, to: to.value } });
    sales.value = data;
  } catch (e) {
    toast.err(apiError(e, t("account.loadFailed")));
  } finally {
    loading.value = false;
  }
}
onMounted(load);
watch([from, to], load);

function logout() {
  auth.logout();
  router.replace("/");
}
</script>

<template>
  <div class="account">
    <header class="bar">
      <button class="icon-btn" @click="router.push('/shop')" :aria-label="t('common.back')">←</button>
      <h2>{{ t('account.title') }}</h2>
    </header>

    <div class="profile">
      <div class="profile-main">
        <div class="avatar num">{{ (auth.customer?.name || '?')[0] }}</div>
        <div>
          <div class="p-name">{{ auth.customer?.name }} {{ auth.customer?.surname }}</div>
          <div class="p-id num">ID · {{ auth.customer?.loginId }}</div>
        </div>
      </div>
      <button class="logout-side" @click="logout" :aria-label="t('account.logout')">
        <span class="lo-icon" aria-hidden="true">⏻</span>
        <span class="lo-label">{{ t('account.logout') }}</span>
      </button>
    </div>

    <div class="hist-head">
      <h3 class="section-title">{{ t('account.history') }}</h3>
      <span class="hist-spent">{{ t('account.orders', { n: sales.length, total: money(spent) }) }}</span>
    </div>

    <div class="date-filter">
      <div class="df-field">
        <label>{{ t('account.from') }}</label>
        <input v-model="from" type="date" />
      </div>
      <div class="df-field">
        <label>{{ t('account.to') }}</label>
        <input v-model="to" type="date" />
      </div>
      <button class="df-reset" @click="from = defaultFrom(); to = defaultTo()" aria-label="reset">↺</button>
    </div>

    <div v-if="loading" class="state">{{ t('account.loading') }}</div>
    <div v-else-if="!sales.length" class="state">{{ t('account.empty') }}</div>

    <div v-else class="orders">
      <div v-for="s in sales" :key="s.id" class="order">
        <div class="order-head">
          <span class="num order-when">{{ when(s.createdAt) }}</span>
          <span class="num order-total">{{ money(s.total) }}</span>
        </div>
        <div class="order-items">
          <span v-for="i in s.items" :key="i.id" class="oi">{{ i.productName }} <b class="num">×{{ i.quantity }}</b></span>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.account { min-height: 100vh; padding: calc(14px + var(--sat)) 22px calc(30px + var(--sab)); }
.bar { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
.icon-btn { width: 42px; height: 42px; border-radius: 12px; background: var(--paper); border: 1.5px solid var(--line); font-size: 18px; display: grid; place-items: center; }
.bar h2 { font-size: 26px; font-weight: 900; }
.profile { display: flex; align-items: stretch; background: var(--ink); color: #fff; border-radius: var(--r-lg); margin-bottom: 28px; overflow: hidden; }
.profile-main { flex: 0 0 80%; max-width: 80%; display: flex; align-items: center; gap: 14px; padding: 20px; }
.avatar { flex-shrink: 0; width: 52px; height: 52px; border-radius: 999px; background: var(--orange); display: grid; place-items: center; font-size: 24px; font-weight: 700; text-transform: uppercase; }
.p-name { font-family: var(--font-display); font-weight: 800; font-size: 20px; }
.p-id { font-size: 13px; color: rgba(255,255,255,0.65); margin-top: 2px; }

/* logout: 20% of the card, vertical icon + label, on the right */
.logout-side {
  flex: 0 0 20%; max-width: 20%;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  background: rgba(229, 72, 77, 0.12); color: #ff8b8e;
  border: none; border-left: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer; transition: background 0.15s, color 0.15s;
}
.logout-side:active { background: rgba(229, 72, 77, 0.22); }
.lo-icon { font-size: 22px; line-height: 1; }
.lo-label { font-size: 12px; font-weight: 700; }
.hist-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.section-title { font-size: 16px; font-weight: 800; }
.hist-spent { font-size: 13px; color: var(--txt-soft); }
.hist-spent b { color: var(--txt); }

.date-filter { display: flex; align-items: flex-end; gap: 10px; margin-bottom: 18px; }
.df-field { flex: 1; }
.df-field label { font-size: 12px; margin-bottom: 6px; }
.df-field input { padding: 11px 12px; font-size: 15px; }
.df-reset {
  flex-shrink: 0; width: 48px; height: 46px; border-radius: 12px;
  background: var(--paper); border: 1.5px solid var(--line); font-size: 19px; color: var(--txt-soft);
}
.df-reset:active { background: var(--chalk); }
.state { text-align: center; color: var(--txt-faint); padding: 40px 0; }
.orders { display: flex; flex-direction: column; gap: 12px; }
.order { background: var(--paper); border: 1.5px solid var(--line); border-radius: var(--r-md); padding: 16px; box-shadow: var(--shadow); }
.order-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.order-when { font-size: 13px; color: var(--txt-faint); }
.order-total { font-size: 18px; font-weight: 700; }
.order-items { display: flex; flex-wrap: wrap; gap: 6px; }
.oi { background: var(--chalk); border-radius: 8px; padding: 4px 9px; font-size: 13px; }
.logout { margin-top: 28px; color: var(--red); border-color: #f3d3d4; }
</style>
