<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useAuth } from "../stores/auth.js";
import { api, apiError } from "../api.js";
import { useToast } from "../stores/toast.js";

const auth = useAuth();
const toast = useToast();
const { t } = useI18n();

const username = ref(auth.admin?.username || "");
const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const saving = ref(false);

// Storefront settings (global, admin-toggleable).
const showBalance = ref(false);
const settingBusy = ref(false);

// Membership fee charged on each Renew (per-member overrides live on the member).
const membershipFee = ref("");
const feeSaving = ref(false);

onMounted(async () => {
  try {
    const { data } = await api.get("/settings");
    showBalance.value = !!data.showCustomerBalance;
    membershipFee.value = data.membershipFee ?? "";
  } catch { /* leave defaults; toggling will still try to save */ }
});

async function saveMembershipFee() {
  const fee = Number(membershipFee.value);
  if (!Number.isFinite(fee) || fee < 0) return toast.err(t("settings.feeInvalid"));
  feeSaving.value = true;
  try {
    const { data } = await api.put("/settings", { membershipFee: fee });
    membershipFee.value = data.membershipFee;
    toast.ok(t("settings.settingSaved"));
  } catch (e) {
    toast.err(apiError(e, t("settings.settingFailed")));
  } finally {
    feeSaving.value = false;
  }
}

async function toggleShowBalance() {
  const next = !showBalance.value;
  settingBusy.value = true;
  try {
    const { data } = await api.put("/settings", { showCustomerBalance: next });
    showBalance.value = !!data.showCustomerBalance;
    toast.ok(t("settings.settingSaved"));
  } catch (e) {
    toast.err(apiError(e, t("settings.settingFailed")));
  } finally {
    settingBusy.value = false;
  }
}

async function save() {
  const name = username.value.trim();
  if (!name) return toast.err(t("settings.errUsername"));

  // Password is optional — only validate/send it when a new one is typed.
  const changingPassword = !!newPassword.value;
  if (changingPassword) {
    if (!currentPassword.value) return toast.err(t("settings.errCurrentRequired"));
    if (newPassword.value !== confirmPassword.value) return toast.err(t("settings.errMismatch"));
  }

  const payload = { username: name };
  if (changingPassword) {
    payload.currentPassword = currentPassword.value;
    payload.newPassword = newPassword.value;
  }

  saving.value = true;
  try {
    await auth.updateProfile(payload);
    currentPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
    toast.ok(t("settings.saved"));
  } catch (e) {
    toast.err(apiError(e, t("settings.saveFailed")));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="settings">
    <header class="page-head">
      <div>
        <div class="eyebrow">{{ t('settings.eyebrow') }}</div>
        <h1>{{ t('settings.title') }}</h1>
      </div>
    </header>

    <form class="card form-card" @submit.prevent="save">
      <h2 class="section">{{ t('settings.profile') }}</h2>
      <div class="field">
        <label>{{ t('settings.username') }}</label>
        <input v-model="username" autocomplete="username" />
      </div>

      <h2 class="section sp">{{ t('settings.changePassword') }}</h2>
      <p class="hint">{{ t('settings.passwordHint') }}</p>
      <div class="field">
        <label>{{ t('settings.currentPassword') }}</label>
        <input v-model="currentPassword" type="password" autocomplete="current-password" placeholder="••••" />
      </div>
      <div class="field">
        <label>{{ t('settings.newPassword') }}</label>
        <input v-model="newPassword" type="password" autocomplete="new-password" placeholder="••••" />
      </div>
      <div class="field">
        <label>{{ t('settings.confirmPassword') }}</label>
        <input v-model="confirmPassword" type="password" autocomplete="new-password" placeholder="••••" />
      </div>

      <div class="actions">
        <button class="btn btn-primary" type="submit" :disabled="saving">
          {{ saving ? t('settings.saving') : t('settings.save') }}
        </button>
      </div>
    </form>

    <div class="card form-card">
      <h2 class="section">{{ t('settings.storefront') }}</h2>
      <div class="toggle-row">
        <div class="toggle-text">
          <div class="toggle-label">{{ t('settings.showBalance') }}</div>
          <p class="hint">{{ t('settings.showBalanceHint') }}</p>
        </div>
        <button
          type="button"
          class="switch"
          :class="{ on: showBalance }"
          role="switch"
          :aria-checked="showBalance"
          :disabled="settingBusy"
          @click="toggleShowBalance"
        ><span class="knob"></span></button>
      </div>
    </div>

    <div class="card form-card">
      <h2 class="section">{{ t('settings.membership') }}</h2>
      <div class="field">
        <label>{{ t('settings.membershipFee') }}</label>
        <input v-model="membershipFee" type="number" min="0" step="0.01" />
      </div>
      <p class="hint">{{ t('settings.membershipFeeHint') }}</p>
      <div class="actions">
        <button class="btn btn-primary" type="button" :disabled="feeSaving" @click="saveMembershipFee">
          {{ feeSaving ? t('settings.saving') : t('settings.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; gap: 12px; }
.page-head h1 { font-size: 32px; font-weight: 900; }
.form-card { max-width: 480px; padding: 24px; }
.section { font-size: 16px; font-weight: 800; margin-bottom: 14px; }
.section.sp { margin-top: 26px; padding-top: 22px; border-top: 1px solid var(--line); }
.hint { font-size: 13px; color: var(--txt-soft); margin-bottom: 16px; }
.field { margin-bottom: 14px; }
.field label { display: block; font-size: 13px; margin-bottom: 6px; }
.actions { margin-top: 24px; }
.actions .btn { width: 100%; }
.form-card + .form-card { margin-top: 20px; }
.toggle-row { display: flex; align-items: center; gap: 16px; justify-content: space-between; }
.toggle-text { flex: 1; }
.toggle-label { font-weight: 600; font-size: 14.5px; margin-bottom: 4px; }
.toggle-row .hint { margin-bottom: 0; }
.switch {
  flex-shrink: 0; width: 50px; height: 30px; border-radius: 999px; border: none; cursor: pointer;
  background: var(--line); padding: 3px; transition: background 0.16s;
}
.switch.on { background: var(--orange); }
.switch:disabled { opacity: 0.6; cursor: default; }
.knob {
  display: block; width: 24px; height: 24px; border-radius: 999px; background: #fff;
  transition: transform 0.16s; box-shadow: 0 1px 3px rgba(0,0,0,0.25);
}
.switch.on .knob { transform: translateX(20px); }
</style>
