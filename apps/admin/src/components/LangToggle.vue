<script setup>
import { useI18n } from "vue-i18n";
import { setLocale } from "../i18n.js";

const { locale } = useI18n();
</script>

<template>
  <div class="lang" role="group" aria-label="Language">
    <button :class="{ on: locale === 'tr' }" @click="setLocale('tr')">TR</button>
    <button :class="{ on: locale === 'en' }" @click="setLocale('en')">EN</button>
  </div>
</template>

<style scoped>
.lang { display: inline-flex; background: var(--graphite-2); border-radius: 9px; padding: 3px; gap: 2px; }
.lang button { border: none; background: none; padding: 5px 10px; font-weight: 800; font-size: 12px; border-radius: 6px; color: var(--txt-on-dark-soft); font-family: var(--font-display); letter-spacing: 0.04em; }
.lang button.on { background: var(--orange); color: #fff; }
</style>
