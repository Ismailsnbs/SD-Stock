<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuth } from "../stores/auth.js";
import { apiError } from "../api.js";

const router = useRouter();
const auth = useAuth();
const { t } = useI18n();
const loginId = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    await auth.login(loginId.value.trim(), password.value);
    router.replace("/shop");
  } catch (e) {
    error.value = apiError(e, t("login.failed"));
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login">
    <header class="bar">
      <button class="icon-btn" @click="router.push('/')" aria-label="Back">←</button>
    </header>

    <div class="head">
      <img class="mark" src="/logo.jpg" alt="SD Fitness" />
      <div class="eyebrow">{{ t('login.eyebrow') }}</div>
      <h1>{{ t('login.title') }}</h1>
      <p>{{ t('login.sub') }}</p>
    </div>

    <form class="form" @submit.prevent="submit">
      <div>
        <label for="id">{{ t('login.memberId') }}</label>
        <input id="id" v-model="loginId" autocomplete="username" :placeholder="t('login.idPlaceholder')" autocapitalize="none" />
      </div>
      <div>
        <label for="pw">{{ t('login.password') }}</label>
        <input id="pw" v-model="password" type="password" autocomplete="current-password" placeholder="••••" />
      </div>

      <p v-if="error" class="err-line">{{ error }}</p>

      <button class="btn btn-primary btn-block" :disabled="loading">
        {{ loading ? t('login.signingIn') : t('login.signIn') }}
      </button>
    </form>

    <button class="ghost-link" @click="router.push('/shop')">
      {{ t('login.noLogin') }}
    </button>
  </div>
</template>

<style scoped>
.login { min-height: 100vh; padding: calc(14px + var(--sat)) 22px calc(30px + var(--sab)); display: flex; flex-direction: column; }
.bar { margin-bottom: 8px; }
.icon-btn { width: 42px; height: 42px; border-radius: 12px; background: var(--paper); border: 1.5px solid var(--line); font-size: 18px; display: grid; place-items: center; }
.head { margin: 24px 0 28px; }
.mark { width: 52px; height: 52px; border-radius: 14px; object-fit: cover; display: block; margin-bottom: 22px; }
.head h1 { font-size: 38px; font-weight: 900; margin: 10px 0 8px; }
.head p { color: var(--txt-soft); font-size: 15px; margin: 0; max-width: 300px; }
.form { display: flex; flex-direction: column; gap: 16px; }
.form .btn { margin-top: 8px; }
.err-line { color: var(--red); font-weight: 700; font-size: 14px; margin: 0; }
.ghost-link { margin-top: auto; padding: 16px; color: var(--txt-soft); font-weight: 600; font-size: 14px; }
</style>
