<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { api, apiError, downloadFile } from "../api.js";
import { useToast } from "../stores/toast.js";
import ImportControls from "../components/ImportControls.vue";
import Modal from "../components/Modal.vue";

const toast = useToast();
const router = useRouter();
const { t, locale } = useI18n();
const customers = ref([]);
const q = ref("");
const loading = ref(true);

const showForm = ref(false);
const editing = ref(null);
const form = ref({ loginId: "", password: "", name: "", surname: "", telephone: "", membershipStart: "" });

// Payment modal
const showPay = ref(false);
const payTarget = ref(null);
const payAmount = ref("");
const payNote = ref("");
const payDetail = ref(null);

const money = (n) => `₺${Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`;
const dateOnly = (iso) => (iso ? new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" }) : "—");

// Membership package: days until the paid period ends (<=0 expired, <=5 warn).
const daysLeft = (c) => (c.membershipEnd ? Math.ceil((new Date(c.membershipEnd) - Date.now()) / 86400000) : null);
const endMonth = (c) => new Date(c.membershipEnd).toLocaleDateString(locale.value === "tr" ? "tr-TR" : "en", { month: "long" });

const statusPill = { clean: "pill-green", owing: "pill-amber", overdue: "pill-red", credit: "pill-steel" };

// Click-to-sort. sortKey = null keeps the server order (createdAt desc, newest first).
const sortKey = ref(null);
const sortDir = ref("asc");
const sortGetters = {
  loginId: (c) => (c.loginId || "").toLowerCase(),
  name: (c) => `${c.name} ${c.surname}`.toLowerCase(),
  membershipStart: (c) => new Date(c.membershipStart).getTime() || 0,
  overall: (c) => c.finance?.overall ?? 0,
  balance: (c) => c.finance?.balance ?? 0,
  status: (c) => c.finance?.status || ""
};
function sortBy(key) {
  if (sortKey.value === key) sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  else { sortKey.value = key; sortDir.value = "asc"; }
}
const sortIcon = (key) => (sortKey.value === key ? (sortDir.value === "asc" ? "▲" : "▼") : "");
const sortedCustomers = computed(() => {
  if (!sortKey.value) return customers.value;
  const get = sortGetters[sortKey.value];
  const dir = sortDir.value === "asc" ? 1 : -1;
  return [...customers.value].sort((a, b) => {
    const va = get(a), vb = get(b);
    return va < vb ? -dir : va > vb ? dir : 0;
  });
});

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get("/customers", { params: { q: q.value } });
    customers.value = data;
  } catch (e) {
    toast.err(apiError(e, t("members.loadFailed")));
  } finally {
    loading.value = false;
  }
}
onMounted(load);

async function openAdd() {
  editing.value = null;
  form.value = { loginId: "", password: "", name: "", surname: "", telephone: "", membershipStart: "" };
  showForm.value = true;
  // Suggest the next ID in the sequence (max existing number + 1); still editable.
  try {
    const { data } = await api.get("/customers/next-id");
    if (!editing.value && showForm.value && !form.value.loginId) form.value.loginId = data.nextId;
  } catch { /* leave the field empty */ }
}
function openEdit(c) {
  editing.value = c;
  form.value = {
    loginId: c.loginId, password: "", name: c.name, surname: c.surname,
    telephone: c.telephone || "", membershipStart: c.membershipStart ? c.membershipStart.slice(0, 10) : ""
  };
  showForm.value = true;
}

async function save() {
  try {
    if (editing.value) {
      const payload = { name: form.value.name, surname: form.value.surname, telephone: form.value.telephone };
      if (form.value.password) payload.password = form.value.password;
      if (form.value.membershipStart) payload.membershipStart = form.value.membershipStart;
      await api.put(`/customers/${editing.value.id}`, payload);
      toast.ok(t("members.saved"));
    } else {
      await api.post("/customers", form.value);
      toast.ok(t("members.added"));
    }
    showForm.value = false;
    load();
  } catch (e) {
    toast.err(apiError(e, t("members.saveFailed")));
  }
}

// Approval modal for renew / undo: set message + action, run only on approve.
const confirmBox = ref(null);
function askConfirm(message, run) {
  confirmBox.value = { message, run };
}
async function approveConfirm() {
  const action = confirmBox.value;
  confirmBox.value = null;
  await action.run();
}

function renew(c) {
  askConfirm(t("members.renewConfirm", { name: `${c.name} ${c.surname}`, month: endMonth(c) }), async () => {
    try {
      const { data } = await api.post(`/customers/${c.id}/renew`);
      toast.ok(t("members.renewed", { date: dateOnly(data.membershipEnd) }));
      load();
    } catch (e) {
      toast.err(apiError(e, t("members.renewFailed")));
    }
  });
}

function revertRenew(c) {
  const newEnd = new Date(new Date(c.membershipEnd).getTime() - 30 * 86400000);
  askConfirm(t("members.revertRenewConfirm", { name: `${c.name} ${c.surname}`, date: dateOnly(newEnd) }), async () => {
    try {
      const { data } = await api.post(`/customers/${c.id}/renew-revert`);
      toast.ok(t("members.revertRenewed", { date: dateOnly(data.membershipEnd) }));
      load();
    } catch (e) {
      toast.err(apiError(e, t("members.revertRenewFailed")));
    }
  });
}

async function remove(c) {
  if (!confirm(t("members.delConfirm", { name: `${c.name} ${c.surname}` }))) return;
  try {
    await api.delete(`/customers/${c.id}`);
    toast.ok(t("members.deleted"));
    load();
  } catch (e) {
    toast.err(apiError(e, t("members.delFailed")));
  }
}

function viewSales(c) {
  router.push({ name: "sales", query: { customerId: c.id, name: `${c.name} ${c.surname}` } });
}

async function openPay(c) {
  payTarget.value = c;
  payAmount.value = c.finance?.balance > 0 ? c.finance.balance : "";
  payNote.value = "";
  payDetail.value = null;
  showPay.value = true;
  try {
    const { data } = await api.get(`/customers/${c.id}`);
    payDetail.value = data;
  } catch { /* non-blocking */ }
}

async function submitPayment() {
  const amount = Number(payAmount.value);
  if (!amount || amount <= 0) return toast.err(t("members.payAmtErr"));
  try {
    await api.post(`/customers/${payTarget.value.id}/payments`, { amount, note: payNote.value });
    toast.ok(t("members.paid", { v: money(amount) }));
    showPay.value = false;
    load();
  } catch (e) {
    toast.err(apiError(e, t("members.payFailed")));
  }
}

async function deletePayment(p) {
  if (!confirm(t("members.delPayConfirm"))) return;
  try {
    await api.delete(`/customers/${payTarget.value.id}/payments/${p.id}`);
    const { data } = await api.get(`/customers/${payTarget.value.id}`);
    payDetail.value = data;
    payAmount.value = data.finance.balance > 0 ? data.finance.balance : "";
    load();
  } catch (e) {
    toast.err(apiError(e, t("members.delPayFailed")));
  }
}

async function exportMembers() {
  try {
    await downloadFile("/customers/export", "members.xlsx");
    toast.ok(t("members.exported"));
  } catch (e) {
    toast.err(apiError(e, t("members.exportFailed")));
  }
}
</script>

<template>
  <div>
    <header class="page-head">
      <div>
        <div class="eyebrow">{{ t('members.eyebrow') }}</div>
        <h1>{{ t('members.title') }}</h1>
      </div>
      <div class="head-actions">
        <button class="btn btn-dark" @click="exportMembers">{{ t('members.export') }}</button>
        <button class="btn btn-primary" @click="openAdd">{{ t('members.add') }}</button>
      </div>
    </header>

    <ImportControls
      class="mb"
      noun="member"
      template-url="/customers/template"
      import-url="/customers/import"
      template-name="customer-template.xlsx"
      @imported="load"
    />

    <div class="toolbar">
      <input v-model="q" :placeholder="t('members.search')" class="search" @input="load" />
    </div>

    <div class="card table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th class="sortable" @click="sortBy('loginId')">{{ t('members.colId') }}<span class="sort-ind">{{ sortIcon('loginId') }}</span></th>
            <th class="sortable" @click="sortBy('name')">{{ t('members.colName') }}<span class="sort-ind">{{ sortIcon('name') }}</span></th>
            <th class="sortable" @click="sortBy('membershipStart')">{{ t('members.colSince') }}<span class="sort-ind">{{ sortIcon('membershipStart') }}</span></th>
            <th class="right sortable" @click="sortBy('overall')">{{ t('members.colOverall') }}<span class="sort-ind">{{ sortIcon('overall') }}</span></th>
            <th class="right sortable" @click="sortBy('balance')">{{ t('members.colBalance') }}<span class="sort-ind">{{ sortIcon('balance') }}</span></th>
            <th class="sortable" @click="sortBy('status')">{{ t('members.colStatus') }}<span class="sort-ind">{{ sortIcon('status') }}</span></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="center muted">{{ t('members.loading') }}</td></tr>
          <tr v-else-if="!customers.length"><td colspan="7" class="center muted">{{ t('members.empty') }}</td></tr>
          <tr v-for="c in sortedCustomers" :key="c.id" :class="{ rowdanger: c.finance?.status === 'overdue' }">
            <td class="num strong">{{ c.loginId }}</td>
            <td>
              {{ c.name }} {{ c.surname }}
              <div class="sub num">{{ c.telephone || t('members.noPhone') }}</div>
            </td>
            <td class="num">
              {{ dateOnly(c.membershipStart) }}
              <div v-if="c.membershipEnd" class="mship">
                <span v-if="daysLeft(c) <= 0" class="pill pill-red">{{ t('members.expired') }}</span>
                <span v-else-if="daysLeft(c) <= 5" class="pill pill-amber">{{ t('members.daysLeft', { n: daysLeft(c) }) }}</span>
                <span v-else class="sub">{{ t('members.until', { date: dateOnly(c.membershipEnd) }) }}</span>
                <button class="btn btn-success btn-sm renew-btn" @click="renew(c)">{{ t('members.renew', { month: endMonth(c) }) }}</button>
                <button class="btn btn-danger btn-sm renew-btn" @click="revertRenew(c)">↩ {{ t('members.revertRenew') }}</button>
              </div>
            </td>
            <td class="right num">{{ money(c.finance?.overall) }}</td>
            <td class="right num" :class="c.finance?.balance > 0 ? 'owe' : 'ok'">{{ money(c.finance?.balance) }}</td>
            <td>
              <span class="pill" :class="statusPill[c.finance?.status] || 'pill-gray'">
                {{ c.finance?.status ? t(`status.${c.finance.status}`) : "—" }}
              </span>
              <span v-if="c.finance?.overdueAmount > 0" class="overdue-amt num">{{ t('members.overdueAmt', { v: money(c.finance.overdueAmount) }) }}</span>
            </td>
            <td class="right actions">
              <button class="btn btn-primary btn-sm" @click="openPay(c)">{{ t('members.pay') }}</button>
              <button class="btn btn-ghost btn-sm" @click="viewSales(c)">{{ t('members.sales') }}</button>
              <button class="btn btn-ghost btn-sm" @click="openEdit(c)">{{ t('members.edit') }}</button>
              <button class="btn btn-danger btn-sm" @click="remove(c)">{{ t('members.del') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add / edit member -->
    <Modal :open="showForm" :title="editing ? t('members.editTitle') : t('members.addTitle')" @close="showForm = false">
      <div class="form-grid">
        <div>
          <label>{{ t('members.fLoginId') }}</label>
          <input v-model="form.loginId" :disabled="!!editing" placeholder="alperen" />
        </div>
        <div>
          <label>{{ editing ? t('members.fNewPass') : t('members.fPass') }}</label>
          <input v-model="form.password" :placeholder="editing ? t('members.fPassKeep') : '••••'" />
        </div>
        <div>
          <label>{{ t('members.fName') }}</label>
          <input v-model="form.name" placeholder="Alperen" />
        </div>
        <div>
          <label>{{ t('members.fSurname') }}</label>
          <input v-model="form.surname" placeholder="Yilmaz" />
        </div>
        <div>
          <label>{{ t('members.fPhone') }}</label>
          <input v-model="form.telephone" placeholder="5551112233" />
        </div>
        <div>
          <label>{{ t('members.fStart') }}</label>
          <input v-model="form.membershipStart" type="date" />
        </div>
      </div>
      <template #footer>
        <button class="btn btn-ghost" @click="showForm = false">{{ t('members.cancel') }}</button>
        <button class="btn btn-primary" @click="save">{{ editing ? t('members.save') : t('members.create') }}</button>
      </template>
    </Modal>

    <!-- Record payment -->
    <Modal :open="showPay" :title="t('members.payTitle', { name: `${payTarget?.name} ${payTarget?.surname}` })" @close="showPay = false">
      <div class="pay-summary">
        <div><span class="eyebrow">{{ t('members.overallSpent') }}</span><div class="num psum">{{ money(payTarget?.finance?.overall) }}</div></div>
        <div><span class="eyebrow">{{ t('members.outstanding') }}</span><div class="num psum owe">{{ money(payTarget?.finance?.balance) }}</div></div>
      </div>

      <div class="form-grid">
        <div>
          <label>{{ t('members.amount') }}</label>
          <input v-model="payAmount" type="number" min="0" step="0.01" />
        </div>
        <div>
          <label>{{ t('members.note') }}</label>
          <input v-model="payNote" :placeholder="t('members.notePh')" />
        </div>
      </div>

      <div v-if="payDetail?.payments?.length" class="history">
        <div class="eyebrow">{{ t('members.history') }}</div>
        <div v-for="p in payDetail.payments" :key="p.id" class="hist-row">
          <span class="num">{{ dateOnly(p.createdAt) }}</span>
          <span class="hist-note">{{ p.note || "—" }}</span>
          <span class="num strong">{{ money(p.amount) }}</span>
          <button class="hist-del" @click="deletePayment(p)" aria-label="Delete">×</button>
        </div>
      </div>

      <template #footer>
        <button class="btn btn-ghost" @click="showPay = false">{{ t('members.cancel') }}</button>
        <button class="btn btn-primary" @click="submitPayment">{{ t('members.recordPayment') }}</button>
      </template>
    </Modal>

    <!-- Approval modal (renew / undo renewal) -->
    <Modal :open="!!confirmBox" :title="t('members.confirmTitle')" @close="confirmBox = null">
      <p class="confirm-msg">{{ confirmBox?.message }}</p>
      <template #footer>
        <button class="btn btn-ghost" @click="confirmBox = null">{{ t('members.cancel') }}</button>
        <button class="btn btn-primary" @click="approveConfirm">{{ t('members.confirm') }}</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; gap: 12px; flex-wrap: wrap; }
.page-head h1 { font-size: 32px; font-weight: 900; }
.head-actions { display: flex; gap: 10px; }
.mb { margin-bottom: 16px; }
.toolbar { margin-bottom: 14px; }
.search { max-width: 340px; }
.table-wrap { overflow: auto; }
.sortable { cursor: pointer; user-select: none; white-space: nowrap; }
.sortable:hover { color: var(--orange); }
.sort-ind { font-size: 10px; margin-left: 5px; color: var(--orange); }
.center { text-align: center; }
.muted { color: var(--txt-faint); }
.strong { font-weight: 700; }
.sub { font-size: 12px; color: var(--txt-faint); margin-top: 2px; }
.mship { display: flex; align-items: center; gap: 8px; margin-top: 6px; white-space: nowrap; }
.confirm-msg { font-size: 15px; line-height: 1.55; }
.renew-btn { font-size: 11.5px; padding: 4px 10px; }
.owe { color: var(--red); font-weight: 700; }
.ok { color: var(--txt-faint); }
.rowdanger td { background: #fdf6f6; }
.overdue-amt { display: block; font-size: 11px; color: var(--red); margin-top: 4px; }
.actions { white-space: nowrap; display: flex; gap: 5px; justify-content: flex-end; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

.pay-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
.pay-summary > div { background: var(--chalk); border-radius: 12px; padding: 14px 16px; }
.psum { font-size: 24px; font-weight: 700; margin-top: 6px; }
.history { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line); }
.hist-row { display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--line); font-size: 13px; }
.hist-note { color: var(--txt-soft); }
.hist-del { background: none; border: none; color: var(--txt-faint); font-size: 18px; cursor: pointer; }
.hist-del:hover { color: var(--red); }

@media (max-width: 620px) { .form-grid, .pay-summary { grid-template-columns: 1fr; } }
</style>
