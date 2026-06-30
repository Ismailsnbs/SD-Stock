<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { api, apiError, downloadFile } from "../api.js";
import { useToast } from "../stores/toast.js";
import Modal from "../components/Modal.vue";

const toast = useToast();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();

// Default range: To = today, From = one month ago.
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function defaultFrom() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return ymd(d);
}
function defaultTo() {
  return ymd(new Date());
}

const sales = ref([]);
const loading = ref(true);
const from = ref(defaultFrom());
const to = ref(defaultTo());
const customerId = ref(route.query.customerId ? Number(route.query.customerId) : null);
const customerName = ref(route.query.name || "");
const member = ref(null); // finance detail when filtered by a member
const members = ref([]); // combobox options
const type = ref("all"); // all | sale | payment

// Customer filter combobox (type to search by name).
const memberQuery = ref("");
const comboOpen = ref(false);
const filteredMembers = computed(() => {
  const q = memberQuery.value.trim().toLowerCase();
  const list = q ? members.value.filter((m) => m.label.toLowerCase().includes(q)) : members.value;
  return list.slice(0, 30);
});
// Initial shown in the avatar once a member is selected.
const memberInitial = computed(() => (memberQuery.value.trim()[0] || "?").toUpperCase());

const money = (n) => `₺${Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`;
const when = (iso) => new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const dateOnly = (iso) => (iso ? new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" }) : "—");

// Payment modal (records against the member shown in the filter banner).
const showPay = ref(false);
const payAmount = ref("");
const payNote = ref("");

const params = computed(() => {
  const p = {};
  if (customerId.value) p.customerId = customerId.value;
  if (from.value) p.from = from.value;
  if (to.value) p.to = to.value;
  return p;
});

const summary = computed(() => {
  const onlySales = sales.value.filter((s) => s.kind === "sale");
  const onlyPays = sales.value.filter((s) => s.kind === "payment");
  return {
    count: onlySales.length,
    total: onlySales.reduce((a, s) => a + s.total, 0),
    units: onlySales.reduce((a, s) => a + s.items.reduce((n, i) => n + i.quantity, 0), 0),
    payCount: onlyPays.length,
    collected: onlyPays.reduce((a, p) => a + p.amount, 0)
  };
});

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get("/sales/feed", { params: { ...params.value, type: type.value } });
    sales.value = data;
  } catch (e) {
    toast.err(apiError(e, t("sales.loadFailed")));
  } finally {
    loading.value = false;
  }
}

async function loadMember() {
  if (!customerId.value) { member.value = null; return; }
  try {
    const { data } = await api.get(`/customers/${customerId.value}`);
    member.value = data;
    customerName.value = `${data.name} ${data.surname}`;
    memberQuery.value = `${data.name} ${data.surname} · ${data.loginId}`;
  } catch { member.value = null; }
}

async function loadMembers() {
  try {
    const { data } = await api.get("/customers");
    members.value = data
      .map((c) => ({ id: c.id, name: `${c.name} ${c.surname}`, loginId: c.loginId, label: `${c.name} ${c.surname} · ${c.loginId}` }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch { /* dropdown stays empty */ }
}

onMounted(() => { load(); loadMember(); loadMembers(); });
watch([from, to, type], load);

// Switching the member from the combobox (or clearing it).
function onMemberChange() {
  router.replace({ name: "sales", query: customerId.value ? { customerId: customerId.value } : {} });
  loadMember();
  load();
}
function pickMember(m) {
  customerId.value = m.id;
  memberQuery.value = m.label;
  comboOpen.value = false;
  onMemberChange();
}
function onComboInput() {
  // typing invalidates the current selection until a member is picked again
  comboOpen.value = true;
  if (customerId.value) {
    customerId.value = null;
    member.value = null;
    customerName.value = "";
    onMemberChange();
  }
}
function clearMember() {
  customerId.value = null;
  customerName.value = "";
  member.value = null;
  memberQuery.value = "";
  onMemberChange();
}

function openPay() {
  if (!member.value) return;
  payAmount.value = member.value.finance?.balance > 0 ? member.value.finance.balance : "";
  payNote.value = "";
  showPay.value = true;
}

async function submitPayment() {
  const amount = Number(payAmount.value);
  if (!amount || amount <= 0) return toast.err(t("sales.payAmtErr"));
  try {
    await api.post(`/customers/${customerId.value}/payments`, { amount, note: payNote.value });
    toast.ok(t("sales.paid", { v: money(amount) }));
    showPay.value = false;
    await loadMember(); // refresh balance/history in the banner
    load(); // payment now shows in the transactions feed
  } catch (e) {
    toast.err(apiError(e, t("sales.payFailed")));
  }
}

async function deletePayment(p) {
  if (!confirm(t("sales.delPayConfirm"))) return;
  try {
    await api.delete(`/customers/${customerId.value}/payments/${p.id}`);
    await loadMember();
    payAmount.value = member.value?.finance?.balance > 0 ? member.value.finance.balance : "";
    load();
  } catch (e) {
    toast.err(apiError(e, t("sales.delPayFailed")));
  }
}

async function exportXlsx() {
  try {
    const qs = new URLSearchParams(params.value).toString();
    await downloadFile(`/sales/export${qs ? "?" + qs : ""}`, "sales.xlsx");
    toast.ok(t("sales.exported"));
  } catch (e) {
    toast.err(apiError(e, t("sales.exportFailed")));
  }
}

const statusPill = { clean: "pill-green", owing: "pill-amber", overdue: "pill-red", credit: "pill-steel" };
</script>

<template>
  <div>
    <header class="page-head">
      <div>
        <div class="eyebrow">{{ t('sales.eyebrow') }}</div>
        <h1>{{ t('sales.title') }}</h1>
      </div>
      <button class="btn btn-dark" @click="exportXlsx">{{ t('sales.export') }}</button>
    </header>

    <!-- Member context banner -->
    <div v-if="member" class="member-bar card">
      <div class="mb-left">
        <div class="eyebrow">{{ t('sales.filteredBy') }}</div>
        <div class="mb-name">{{ member.name }} {{ member.surname }} <span class="num mb-id">· {{ member.loginId }}</span></div>
      </div>
      <div class="mb-fin">
        <div><span class="mb-cap">{{ t('sales.overall') }}</span><span class="num mb-val">{{ money(member.finance.overall) }}</span></div>
        <div><span class="mb-cap">{{ t('sales.balance') }}</span><span class="num mb-val" :class="member.finance.balance > 0 ? 'owe' : ''">{{ money(member.finance.balance) }}</span></div>
        <span class="pill" :class="statusPill[member.finance.status]">{{ t(`status.${member.finance.status}`) }}</span>
      </div>
      <div class="mb-actions">
        <button class="btn btn-primary btn-sm" @click="openPay">{{ t('sales.recordPayment') }}</button>
        <button class="btn btn-ghost btn-sm" @click="clearMember">{{ t('sales.clear') }}</button>
      </div>
    </div>

    <!-- Type filter -->
    <div class="type-seg">
      <button :class="{ on: type === 'all' }" @click="type = 'all'">{{ t('sales.typeAll') }}</button>
      <button :class="{ on: type === 'sale' }" @click="type = 'sale'">{{ t('sales.typeSales') }}</button>
      <button :class="{ on: type === 'payment' }" @click="type = 'payment'">{{ t('sales.typePayments') }}</button>
    </div>

    <!-- Filters -->
    <div class="filters card">
      <div class="f f-member">
        <label>{{ t('sales.member') }}</label>
        <div class="combo" :class="{ open: comboOpen }">
          <span v-if="customerId" class="combo-avatar">{{ memberInitial }}</span>
          <span v-else class="combo-ic" aria-hidden="true">⌕</span>
          <input
            v-model="memberQuery"
            class="combo-input"
            :class="{ picked: customerId }"
            :placeholder="t('sales.searchMember')"
            autocomplete="off"
            @focus="comboOpen = true"
            @input="onComboInput"
            @blur="comboOpen = false"
          />
          <button v-if="customerId || memberQuery" class="combo-clear" @mousedown.prevent="clearMember" aria-label="Clear">×</button>
          <ul v-if="comboOpen && filteredMembers.length" class="combo-list">
            <li
              v-for="m in filteredMembers"
              :key="m.id"
              class="combo-opt"
              :class="{ active: m.id === customerId }"
              @mousedown.prevent="pickMember(m)"
            >
              <span class="opt-avatar">{{ m.name[0] }}</span>
              <span class="opt-text">
                <span class="opt-name">{{ m.name }}</span>
                <span class="opt-id num">{{ m.loginId }}</span>
              </span>
              <span v-if="m.id === customerId" class="opt-check" aria-hidden="true">✓</span>
            </li>
          </ul>
          <p v-if="comboOpen && memberQuery && !filteredMembers.length" class="combo-empty">
            {{ t('sales.noMatch', { q: memberQuery }) }}
          </p>
        </div>
      </div>
      <div class="f">
        <label>{{ t('sales.from') }}</label>
        <input v-model="from" type="date" />
      </div>
      <div class="f">
        <label>{{ t('sales.to') }}</label>
        <input v-model="to" type="date" />
      </div>
      <button class="btn btn-ghost btn-sm clearf" @click="from = defaultFrom(); to = defaultTo()">{{ t('sales.resetDates') }}</button>

      <div class="summary">
        <span v-if="type !== 'payment'"><b class="num">{{ summary.count }}</b> {{ t('sales.countSales') }}</span>
        <span v-if="type !== 'payment'"><b class="num">{{ summary.units }}</b> {{ t('sales.countUnits') }}</span>
        <span v-if="type !== 'sale'" class="collected"><b class="num">{{ money(summary.collected) }}</b> {{ t('sales.collected') }}</span>
        <span v-if="type !== 'payment'" class="sumtotal"><b class="num">{{ money(summary.total) }}</b></span>
      </div>
    </div>

    <div class="card table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th class="nowrap">{{ t('sales.colWhen') }}</th>
            <th class="nowrap">{{ t('sales.colMember') }}</th>
            <th class="col-grow">{{ t('sales.colItems') }}</th>
            <th class="nowrap">{{ t('sales.colVia') }}</th>
            <th class="right nowrap">{{ t('sales.colTotal') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="5" class="center muted">{{ t('sales.loading') }}</td></tr>
          <tr v-else-if="!sales.length"><td colspan="5" class="center muted">{{ t('sales.empty') }}</td></tr>
          <tr v-for="s in sales" :key="s.id" :class="{ payrow: s.kind === 'payment' }">
            <td class="num nowrap">{{ when(s.createdAt) }}</td>
            <td class="strong">{{ s.customerName }}</td>
            <td class="col-grow">
              <div v-if="s.kind === 'sale'" class="items">
                <span v-for="i in s.items" :key="i.id" class="item-chip">{{ i.productName }} <b class="num">×{{ i.quantity }}</b></span>
              </div>
              <span v-else class="pay-note">{{ s.note || '—' }}</span>
            </td>
            <td>
              <span v-if="s.kind === 'payment'" class="pill pill-green">{{ t('sales.paymentLabel') }}</span>
              <span v-else class="pill" :class="s.mode === 'login' ? 'pill-steel' : 'pill-gray'">{{ s.mode }}</span>
            </td>
            <td class="right num strong" :class="{ credit: s.kind === 'payment' }">
              {{ s.kind === 'payment' ? '+' + money(s.amount) : money(s.total) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Record payment for the filtered member -->
    <Modal :open="showPay" :title="t('sales.payTitle', { name: `${member?.name} ${member?.surname}` })" @close="showPay = false">
      <div class="pay-summary">
        <div><span class="eyebrow">{{ t('sales.overallSpent') }}</span><div class="num psum">{{ money(member?.finance?.overall) }}</div></div>
        <div><span class="eyebrow">{{ t('sales.outstanding') }}</span><div class="num psum owe">{{ money(member?.finance?.balance) }}</div></div>
      </div>

      <div class="pay-grid">
        <div>
          <label>{{ t('sales.amount') }}</label>
          <input v-model="payAmount" type="number" min="0" step="0.01" />
        </div>
        <div>
          <label>{{ t('sales.note') }}</label>
          <input v-model="payNote" :placeholder="t('sales.notePh')" />
        </div>
      </div>

      <div v-if="member?.payments?.length" class="history">
        <div class="eyebrow">{{ t('sales.history') }}</div>
        <div v-for="p in member.payments" :key="p.id" class="hist-row">
          <span class="num">{{ dateOnly(p.createdAt) }}</span>
          <span class="hist-note">{{ p.note || "—" }}</span>
          <span class="num strong">{{ money(p.amount) }}</span>
          <button class="hist-del" @click="deletePayment(p)" aria-label="Delete">×</button>
        </div>
      </div>

      <template #footer>
        <button class="btn btn-ghost" @click="showPay = false">{{ t('sales.cancel') }}</button>
        <button class="btn btn-primary" @click="submitPayment">{{ t('sales.recordPayment') }}</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; gap: 12px; }
.page-head h1 { font-size: 32px; font-weight: 900; }

.member-bar { display: flex; align-items: center; gap: 18px; padding: 16px 20px; margin-bottom: 14px; flex-wrap: wrap; border-left: 4px solid var(--steel); }
.mb-name { font-family: var(--font-display); font-weight: 800; font-size: 18px; margin-top: 3px; }
.mb-id { color: var(--txt-faint); font-size: 13px; }
.mb-fin { display: flex; align-items: center; gap: 22px; margin-left: auto; }
.mb-cap { display: block; font-size: 11px; color: var(--txt-faint); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
.mb-val { font-size: 18px; font-weight: 700; }
.owe { color: var(--red); }
.mb-actions { display: flex; gap: 8px; }

.pay-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
.pay-summary > div { background: var(--chalk); border-radius: 12px; padding: 14px 16px; }
.psum { font-size: 24px; font-weight: 700; margin-top: 6px; }
.pay-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.history { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line); }
.hist-row { display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--line); font-size: 13px; }
.hist-note { color: var(--txt-soft); }
.hist-del { background: none; border: none; color: var(--txt-faint); font-size: 18px; cursor: pointer; }
.hist-del:hover { color: var(--red); }

.type-seg { display: inline-flex; background: var(--paper); border: 1.5px solid var(--line); border-radius: 10px; padding: 3px; margin-bottom: 14px; }
.type-seg button { border: none; background: none; padding: 8px 18px; font-weight: 700; font-size: 14px; border-radius: 7px; color: var(--txt-soft); }
.type-seg button.on { background: var(--ink); color: #fff; }

.filters { display: flex; align-items: flex-end; gap: 14px; padding: 16px 20px; margin-bottom: 14px; flex-wrap: wrap; }
.f label { margin-bottom: 6px; }
.f input { width: 160px; }
.f-member { width: 260px; }
.combo { position: relative; }
/* override the generic `.f input { width:160px }` so the field fills the combo */
.f-member .combo-input { width: 100%; padding-left: 40px; padding-right: 36px; text-overflow: ellipsis; }
.combo-input.picked { border-color: var(--steel); font-weight: 600; }
.combo-input.picked:focus { box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
.combo-ic {
  position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
  color: var(--txt-faint); font-size: 18px; line-height: 1; pointer-events: none;
}
.combo-avatar {
  position: absolute; left: 8px; top: 50%; transform: translateY(-50%);
  width: 26px; height: 26px; border-radius: 999px; background: var(--steel); color: #fff;
  display: grid; place-items: center; font-size: 12px; font-weight: 800; pointer-events: none;
}
.combo-clear {
  position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
  width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center;
  background: none; border: none; color: var(--txt-faint); font-size: 18px; line-height: 1; cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.combo-clear:hover { background: var(--chalk); color: var(--red); }
.combo-list {
  list-style: none; margin: 8px 0 0; padding: 6px; max-height: 300px; overflow-y: auto;
  background: var(--paper); border: 1.5px solid var(--line); border-radius: 14px; box-shadow: var(--shadow-pop);
  position: absolute; left: 0; right: 0; top: calc(100% + 8px); z-index: 30;
}
.combo-opt {
  display: flex; align-items: center; gap: 11px; padding: 8px 10px; border-radius: 10px;
  cursor: pointer; white-space: nowrap; transition: background 0.1s;
}
.combo-opt:hover { background: var(--chalk); }
.combo-opt.active { background: #eef4fe; }
.opt-avatar {
  flex-shrink: 0; width: 30px; height: 30px; border-radius: 999px; background: var(--chalk);
  color: var(--txt-soft); display: grid; place-items: center; font-size: 13px; font-weight: 800; text-transform: uppercase;
}
.combo-opt.active .opt-avatar { background: var(--steel); color: #fff; }
.opt-text { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
.opt-name { font-weight: 700; font-size: 14px; overflow: hidden; text-overflow: ellipsis; }
.opt-id { font-size: 12px; color: var(--txt-faint); }
.opt-check { margin-left: auto; color: var(--steel); font-weight: 800; }
.combo-empty {
  position: absolute; left: 0; right: 0; top: calc(100% + 8px); z-index: 30; margin: 0;
  background: var(--paper); border: 1.5px solid var(--line); border-radius: 12px; box-shadow: var(--shadow);
  padding: 12px 14px; font-size: 13px; color: var(--txt-soft); font-weight: 600;
}
.clearf { margin-bottom: 1px; }
.summary { margin-left: auto; display: flex; align-items: center; gap: 18px; font-size: 13.5px; color: var(--txt-soft); }
.summary b { color: var(--txt); }
.sumtotal b { font-size: 20px; }

.table-wrap { overflow: auto; }
.center { text-align: center; }
.muted { color: var(--txt-faint); }
.strong { font-weight: 700; }
.nowrap { white-space: nowrap; }
/* the items column soaks up the remaining width so Kanal/Tutar hug the right edge */
.col-grow { width: 100%; }
.items { display: flex; flex-wrap: wrap; gap: 6px; }
.item-chip { background: #f2f0ea; border-radius: 6px; padding: 3px 8px; font-size: 12.5px; }
.payrow td { background: #f3faf5; }
.pay-note { font-size: 13px; color: var(--txt-soft); font-style: italic; }
.credit { color: var(--green); }
.collected b { color: var(--green); }

@media (max-width: 700px) {
  .summary { margin-left: 0; width: 100%; justify-content: space-between; }
  .mb-fin { margin-left: 0; }
  .pay-summary, .pay-grid { grid-template-columns: 1fr; }
}
</style>
