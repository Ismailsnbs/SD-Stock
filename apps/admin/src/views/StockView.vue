<script setup>
import { ref, onMounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import { api, apiError } from "../api.js";
import { useToast } from "../stores/toast.js";
import ImportControls from "../components/ImportControls.vue";
import Modal from "../components/Modal.vue";

const toast = useToast();
const { t } = useI18n();
const products = ref([]);
const q = ref("");
const loading = ref(true);

const showForm = ref(false);
const editing = ref(null);
const form = ref({ name: "", count: 0, buyingPrice: "", sellingPrice: "" });

const money = (n) => (n == null || n === "" ? "—" : `₺${Number(n).toLocaleString("tr-TR")}`);
const hasBuying = computed(() => products.value.some((p) => p.buyingPrice != null));

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get("/products", { params: { q: q.value } });
    products.value = data;
  } catch (e) {
    toast.err(apiError(e, t("stock.loadFailed")));
  } finally {
    loading.value = false;
  }
}
onMounted(load);

function openAdd() {
  editing.value = null;
  form.value = { name: "", count: 0, buyingPrice: "", sellingPrice: "" };
  showForm.value = true;
}
function openEdit(p) {
  editing.value = p;
  form.value = { name: p.name, count: p.count, buyingPrice: p.buyingPrice ?? "", sellingPrice: p.sellingPrice };
  showForm.value = true;
}

async function save() {
  try {
    const payload = {
      name: form.value.name,
      count: Number(form.value.count),
      buyingPrice: form.value.buyingPrice === "" ? null : Number(form.value.buyingPrice),
      sellingPrice: Number(form.value.sellingPrice)
    };
    if (editing.value) {
      await api.put(`/products/${editing.value.id}`, payload);
      toast.ok(t("stock.saved"));
    } else {
      await api.post("/products", payload);
      toast.ok(t("stock.added"));
    }
    showForm.value = false;
    load();
  } catch (e) {
    toast.err(apiError(e, t("stock.saveFailed")));
  }
}

async function remove(p) {
  if (!confirm(t("stock.removeConfirm", { name: p.name }))) return;
  try {
    await api.delete(`/products/${p.id}`);
    toast.ok(t("stock.removed"));
    load();
  } catch (e) {
    toast.err(apiError(e, t("stock.removeFailed")));
  }
}

function stockClass(n) {
  if (n === 0) return "pill-red";
  if (n <= 5) return "pill-amber";
  return "pill-gray";
}
</script>

<template>
  <div>
    <header class="page-head">
      <div>
        <div class="eyebrow">{{ t('stock.eyebrow') }}</div>
        <h1>{{ t('stock.title') }}</h1>
      </div>
      <button class="btn btn-primary" @click="openAdd">{{ t('stock.add') }}</button>
    </header>

    <ImportControls
      class="mb"
      noun="stock"
      template-url="/products/template"
      import-url="/products/import"
      template-name="stock-template.xlsx"
      @imported="load"
    />

    <p v-if="!hasBuying && products.length" class="hint-bar card">{{ t('stock.buyingHint') }}</p>

    <div class="toolbar">
      <input v-model="q" :placeholder="t('stock.search')" class="search" @input="load" />
    </div>

    <div class="card table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>{{ t('stock.colProduct') }}</th>
            <th class="right">{{ t('stock.colCount') }}</th>
            <th class="right">{{ t('stock.colBuying') }}</th>
            <th class="right">{{ t('stock.colSelling') }}</th>
            <th class="right">{{ t('stock.colMargin') }}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="6" class="center muted">{{ t('stock.loading') }}</td></tr>
          <tr v-else-if="!products.length"><td colspan="6" class="center muted">{{ t('stock.empty') }}</td></tr>
          <tr v-for="p in products" :key="p.id">
            <td class="strong">{{ p.name }}</td>
            <td class="right"><span class="pill" :class="stockClass(p.count)"><span class="num">{{ p.count }}</span></span></td>
            <td class="right num">{{ money(p.buyingPrice) }}</td>
            <td class="right num">{{ money(p.sellingPrice) }}</td>
            <td class="right num" :class="p.buyingPrice != null ? 'pos' : 'muted'">
              {{ p.buyingPrice != null ? money(p.sellingPrice - p.buyingPrice) : "—" }}
            </td>
            <td class="right actions">
              <button class="btn btn-ghost btn-sm" @click="openEdit(p)">{{ t('stock.edit') }}</button>
              <button class="btn btn-danger btn-sm" @click="remove(p)">{{ t('stock.remove') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal :open="showForm" :title="editing ? t('stock.editTitle') : t('stock.addTitle')" @close="showForm = false">
      <div class="form-grid">
        <div class="full">
          <label>{{ t('stock.fName') }}</label>
          <input v-model="form.name" placeholder="Whey Protein 1kg" />
        </div>
        <div>
          <label>{{ t('stock.fCount') }}</label>
          <input v-model="form.count" type="number" min="0" />
        </div>
        <div>
          <label>{{ t('stock.fSelling') }}</label>
          <input v-model="form.sellingPrice" type="number" min="0" step="0.01" />
        </div>
        <div class="full">
          <label>{{ t('stock.fBuying') }}</label>
          <input v-model="form.buyingPrice" type="number" min="0" step="0.01" :placeholder="t('stock.fBuyingPh')" />
        </div>
      </div>
      <template #footer>
        <button class="btn btn-ghost" @click="showForm = false">{{ t('stock.cancel') }}</button>
        <button class="btn btn-primary" @click="save">{{ editing ? t('stock.save') : t('stock.create') }}</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; gap: 12px; }
.page-head h1 { font-size: 32px; font-weight: 900; }
.mb { margin-bottom: 16px; }
.hint-bar { padding: 13px 18px; font-size: 13.5px; color: var(--txt-soft); margin-bottom: 16px; border-left: 4px solid var(--orange); }
.toolbar { margin-bottom: 14px; }
.search { max-width: 320px; }
.table-wrap { overflow: auto; }
.center { text-align: center; }
.muted { color: var(--txt-faint); }
.strong { font-weight: 600; }
.pos { color: var(--green); font-weight: 700; }
.actions { white-space: nowrap; display: flex; gap: 6px; justify-content: flex-end; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-grid .full { grid-column: 1 / -1; }
</style>
