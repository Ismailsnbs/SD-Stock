<script setup>
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { api, apiError, downloadFile } from "../api.js";
import { useToast } from "../stores/toast.js";

const props = defineProps({
  templateUrl: String,
  importUrl: String,
  templateName: String,
  noun: { type: String, default: "stock" } // "stock" | "member"
});
const emit = defineEmits(["imported"]);
const toast = useToast();
const { t } = useI18n();
const nounLabel = computed(() => t(`imp.${props.noun}`));

const open = ref(false); // collapsed by default — user expands to import
const fileInput = ref(null);
const pendingFile = ref(null);
const replace = ref(false);
const busy = ref(false);
const result = ref(null);

async function getTemplate() {
  try {
    await downloadFile(props.templateUrl, props.templateName);
    toast.ok(t("imp.tplDownloaded"));
  } catch (e) {
    toast.err(apiError(e, t("imp.tplFailed")));
  }
}

function choose() {
  fileInput.value?.click();
}
function onFile(e) {
  pendingFile.value = e.target.files?.[0] || null;
  result.value = null;
}

async function upload() {
  if (!pendingFile.value) return;
  busy.value = true;
  result.value = null;
  try {
    const form = new FormData();
    form.append("file", pendingFile.value);
    const url = props.importUrl + (replace.value ? "?mode=replace" : "");
    const { data } = await api.post(url, form, { headers: { "Content-Type": "multipart/form-data" } });
    result.value = data;
    toast.ok(t("imp.importedToast", { created: data.created, updated: data.updated }));
    pendingFile.value = null;
    if (fileInput.value) fileInput.value.value = "";
    emit("imported");
  } catch (e) {
    result.value = e?.response?.data || null;
    toast.err(apiError(e, t("imp.importFailed")));
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="card import" :class="{ collapsed: !open }">
    <button class="import-head" :aria-expanded="open" @click="open = !open">
      <div class="head-txt">
        <div class="eyebrow">{{ t('imp.eyebrow') }}</div>
        <h3>{{ t('imp.upload', { noun: nounLabel }) }}</h3>
      </div>
      <span class="chev" :class="{ up: open }" aria-hidden="true">⌄</span>
    </button>

    <div v-show="open" class="import-body">
      <div class="body-top">
        <p class="note">{{ t('imp.note') }}</p>
        <button class="btn btn-ghost btn-sm tmpl" @click="getTemplate">{{ t('imp.template') }}</button>
      </div>

      <input ref="fileInput" type="file" accept=".xlsx,.xls" class="hidden" @change="onFile" />

      <div class="row">
        <button class="btn btn-ghost" @click="choose">
          {{ pendingFile ? pendingFile.name : t('imp.choose') }}
        </button>
        <button class="btn btn-primary" :disabled="!pendingFile || busy" @click="upload">
          {{ busy ? t('imp.importing') : t('imp.import') }}
        </button>
      </div>

      <label class="check">
        <input type="checkbox" v-model="replace" class="cb" />
        <span>{{ t('imp.replace') }}</span>
      </label>

      <div v-if="result" class="result">
        <div class="counts">
          <span class="pill pill-green">{{ t('imp.added', { n: result.created || 0 }) }}</span>
          <span class="pill pill-steel">{{ t('imp.updated', { n: result.updated || 0 }) }}</span>
          <span v-if="result.skipped" class="pill pill-amber">{{ t('imp.skipped', { n: result.skipped }) }}</span>
        </div>
        <ul v-if="result.errors?.length" class="errs">
          <li v-for="(e, i) in result.errors.slice(0, 8)" :key="i">{{ e }}</li>
          <li v-if="result.errors.length > 8">{{ t('imp.andMore', { n: result.errors.length - 8 }) }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.import { padding: 0; overflow: hidden; }
.import-head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  width: 100%; padding: 18px 20px; background: none; border: none; text-align: left; cursor: pointer;
}
.import.collapsed .import-head:hover { background: #faf9f6; }
.head-txt h3 { font-size: 18px; font-weight: 800; margin-top: 2px; }
.chev { font-size: 22px; color: var(--txt-faint); transition: transform 0.2s; line-height: 1; }
.chev.up { transform: rotate(180deg); color: var(--ink); }
.import-body { padding: 0 20px 20px; border-top: 1px solid var(--line); }
.body-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding-top: 14px; }
.tmpl { flex-shrink: 0; }
.note { font-size: 13px; color: var(--txt-soft); margin: 0 0 16px; line-height: 1.5; }
.hidden { display: none; }
.row { display: flex; gap: 10px; flex-wrap: wrap; }
.row .btn:first-child { flex: 1; min-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.check { display: flex; align-items: flex-start; gap: 8px; margin: 14px 0 0; font-size: 12.5px; color: var(--txt-soft); font-weight: 500; }
.cb { width: auto; margin-top: 1px; }
.result { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line); }
.counts { display: flex; gap: 8px; flex-wrap: wrap; }
.errs { margin: 12px 0 0; padding-left: 18px; font-size: 12.5px; color: var(--red); }
.errs li { margin-bottom: 3px; }
</style>
