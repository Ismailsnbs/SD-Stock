<script setup>
import { useI18n } from "vue-i18n";
import { setLocale } from "../i18n.js";

const { locale } = useI18n();
function pick(lang) { setLocale(lang); }
</script>

<template>
  <div class="lang" role="group" aria-label="Language">
    <button :class="{ on: locale === 'tr' }" @click="pick('tr')">TR</button>
    <button :class="{ on: locale === 'en' }" @click="pick('en')">EN</button>
  </div>
</template>

<style scoped>
.lang { display: inline-flex; background: var(--paper); border: 1.5px solid var(--line); border-radius: 11px; padding: 3px; gap: 2px; }
.lang button { border: none; background: none; padding: 6px 11px; font-weight: 800; font-size: 12.5px; border-radius: 8px; color: var(--txt-faint); font-family: var(--font-display); letter-spacing: 0.04em; }
.lang button.on { background: var(--ink); color: #fff; }
</style>
