<script setup>
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuth } from "../stores/auth.js";
import LangToggle from "../components/LangToggle.vue";

const router = useRouter();
const auth = useAuth();
const { t } = useI18n();
</script>

<template>
  <div class="home">
    <div class="bg">
      <div v-for="n in 8" :key="n" class="ring" :style="{ '--i': n }"></div>
    </div>

    <header class="top">
      <img class="mark" src="/logo.svg" alt="SD Fitness" />
      <span class="wordmark">SD FITNESS</span>
      <LangToggle class="top-lang" />
    </header>

    <section class="hero">
      <div class="eyebrow light">{{ t('home.eyebrow') }}</div>
      <h1>{{ t('home.title') }}</h1>
      <p>{{ t('home.tagline') }}</p>
    </section>

    <section class="choices">
      <template v-if="auth.isLoggedIn">
        <div class="welcome">
          <div class="eyebrow">{{ t('home.welcome') }}</div>
          <div class="welcome-name">{{ auth.customer.name }} {{ auth.customer.surname }}</div>
        </div>
        <button class="choice primary" @click="router.push('/shop')">
          <div class="choice-txt"><span class="c-title">{{ t('home.openShop') }}</span><span class="c-sub">{{ t('home.openShopSub') }}</span></div>
          <span class="arrow">→</span>
        </button>
        <button class="choice" @click="router.push('/account')">
          <div class="choice-txt"><span class="c-title">{{ t('home.account') }}</span><span class="c-sub">{{ t('home.accountSub') }}</span></div>
          <span class="arrow">→</span>
        </button>
      </template>

      <template v-else>
        <button class="choice primary" @click="router.push('/shop')">
          <div class="choice-txt">
            <span class="c-title">{{ t('home.quickBuy') }}</span>
            <span class="c-sub">{{ t('home.quickBuySub') }}</span>
          </div>
          <span class="arrow">→</span>
        </button>
        <button class="choice" @click="router.push('/login')">
          <div class="choice-txt">
            <span class="c-title">{{ t('home.login') }}</span>
            <span class="c-sub">{{ t('home.loginSub') }}</span>
          </div>
          <span class="arrow">→</span>
        </button>
      </template>
    </section>
  </div>
</template>

<style scoped>
.home { min-height: 100vh; padding: calc(20px + var(--sat)) 22px calc(34px + var(--sab)); display: flex; flex-direction: column; position: relative; overflow: hidden; }
.bg { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.ring {
  position: absolute; top: -40px; right: -60px;
  width: calc(80px * var(--i)); height: calc(80px * var(--i));
  border: 2px solid rgba(255, 90, 31, calc(0.10 - var(--i) * 0.008));
  border-radius: 50%; transform: translate(0, 0);
}
.home > * { position: relative; z-index: 1; }

.top { display: flex; align-items: center; gap: 10px; }
.mark { width: 40px; height: 40px; border-radius: 11px; object-fit: cover; display: block; }
.wordmark { font-family: var(--font-display); font-weight: 900; letter-spacing: 0.14em; font-size: 17px; }
.top-lang { margin-left: auto; }

.hero { margin-top: auto; padding: 40px 0 32px; }
.eyebrow.light { color: var(--orange); }
.hero h1 { font-size: 52px; line-height: 0.96; font-weight: 900; margin: 14px 0 16px; letter-spacing: -0.02em; }
.hero p { color: var(--txt-soft); font-size: 16px; line-height: 1.5; max-width: 320px; margin: 0; }

.choices { display: flex; flex-direction: column; gap: 12px; }
.welcome { margin-bottom: 4px; }
.welcome-name { font-family: var(--font-display); font-weight: 800; font-size: 22px; margin-top: 4px; }
.choice {
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
  background: var(--paper); border: 1.5px solid var(--line); border-radius: var(--r-lg);
  padding: 20px; text-align: left; box-shadow: var(--shadow); transition: transform 0.06s;
}
.choice:active { transform: scale(0.985); }
.choice.primary { background: var(--ink); border-color: var(--ink); color: #fff; }
.choice-txt { display: flex; flex-direction: column; gap: 4px; }
.c-title { font-family: var(--font-display); font-weight: 800; font-size: 20px; }
.c-sub { font-size: 13px; color: var(--txt-soft); }
.choice.primary .c-sub { color: rgba(255,255,255,0.7); }
.arrow { font-size: 24px; font-weight: 700; color: var(--orange); }
.choice.primary .arrow { color: var(--orange); }
</style>
