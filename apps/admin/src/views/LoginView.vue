<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuth } from "../stores/auth.js";
import { apiError } from "../api.js";
import LangToggle from "../components/LangToggle.vue";

const auth = useAuth();
const router = useRouter();
const { t } = useI18n();
const username = ref("admin");
const password = ref("");
const loading = ref(false);
const error = ref("");

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    await auth.login(username.value, password.value);
    router.push({ name: "dashboard" });
  } catch (e) {
    error.value = apiError(e, t("login.failed"));
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth">
    <div class="auth-art">
      <div class="art-grid">
        <div v-for="n in 36" :key="n" class="plate"></div>
      </div>
      <div class="art-copy">
        <img class="mark" src="/logo.jpg" alt="Spotter" />
        <h1>SPOTTER</h1>
        <p>{{ t('login.tagline') }}</p>
      </div>
    </div>

    <div class="auth-form">
      <form class="card panel" @submit.prevent="submit">
        <div class="panel-top">
          <div class="eyebrow">{{ t('login.eyebrow') }}</div>
          <LangToggle class="panel-lang" />
        </div>
        <h2>{{ t('login.title') }}</h2>
        <p class="lead">{{ t('login.lead') }}</p>

        <label for="u">{{ t('login.username') }}</label>
        <input id="u" v-model="username" autocomplete="username" placeholder="admin" />

        <label for="p">{{ t('login.password') }}</label>
        <input id="p" v-model="password" type="password" autocomplete="current-password" placeholder="••••••••" />

        <p v-if="error" class="err-line">{{ error }}</p>

        <button class="btn btn-primary big" :disabled="loading">
          {{ loading ? t('login.signingIn') : t('login.signIn') }}
        </button>
        <p class="hint">{{ t('login.hint') }} <span class="num">admin</span> / <span class="num">admin123</span></p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth { min-height: 100vh; display: grid; grid-template-columns: 1.1fr 1fr; }
.auth-art { position: relative; background: var(--ink); overflow: hidden; display: grid; place-items: center; }
.art-grid {
  position: absolute; inset: -10%; display: grid; grid-template-columns: repeat(6, 1fr);
  gap: 24px; transform: rotate(-12deg); opacity: 0.5;
}
.plate { aspect-ratio: 1; border: 2px solid var(--graphite-2); border-radius: 50%; }
.plate:nth-child(3n) { border-color: rgba(255,90,31,0.5); }
.art-copy { position: relative; text-align: center; color: #fff; padding: 40px; }
.art-copy .mark { width: 56px; height: 56px; border-radius: 14px; object-fit: cover; display: block; margin: 0 auto 20px; }
.art-copy h1 { font-family: var(--font-display); font-weight: 900; font-size: 46px; letter-spacing: 0.14em; }
.art-copy p { color: var(--txt-on-dark-soft); max-width: 320px; margin: 14px auto 0; font-size: 15px; }

.auth-form { display: grid; place-items: center; padding: 24px; background: var(--chalk); }
.panel { width: 100%; max-width: 380px; padding: 34px 32px; }
.panel-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.panel h2 { font-size: 26px; font-weight: 800; margin: 8px 0 4px; }
.lead { color: var(--txt-soft); font-size: 14px; margin: 0 0 22px; }
.panel label { margin-top: 14px; }
.big { width: 100%; padding: 13px; font-size: 15px; margin-top: 20px; }
.err-line { color: var(--red); font-size: 13px; font-weight: 600; margin: 14px 0 0; }
.hint { text-align: center; font-size: 12px; color: var(--txt-faint); margin: 16px 0 0; }

@media (max-width: 820px) {
  .auth { grid-template-columns: 1fr; }
  .auth-art { display: none; }
}
</style>
