<script setup>
defineProps({
  label: String,
  value: [String, Number],
  unit: { type: String, default: "" },
  sub: String,
  accent: { type: String, default: "ink" } // ink | orange | steel | green
});
</script>

<template>
  <div class="stat card" :class="`a-${accent}`">
    <div class="stat-label eyebrow">{{ label }}</div>
    <div class="stat-value">
      <span class="num">{{ value }}</span>
      <span v-if="unit" class="stat-unit">{{ unit }}</span>
    </div>
    <div v-if="sub" class="stat-sub">{{ sub }}</div>
  </div>
</template>

<style scoped>
.stat { padding: 18px 20px; position: relative; overflow: hidden; }
.stat::before {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--ink);
}
.a-orange::before { background: var(--orange); }
.a-steel::before { background: var(--steel); }
.a-green::before { background: var(--green); }
.stat-label { margin-bottom: 10px; }
.stat-value { font-size: 34px; font-weight: 700; line-height: 1; color: var(--txt); }
.stat-unit { font-family: var(--font-display); font-size: 14px; font-weight: 700; color: var(--txt-faint); margin-left: 6px; }
.stat-sub { margin-top: 8px; font-size: 12.5px; color: var(--txt-soft); }
</style>
