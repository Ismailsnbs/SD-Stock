<script setup>
import { computed } from "vue";

// Custom SVG "scoreboard" bar chart — revenue bars with an optional profit overlay.
const props = defineProps({
  series: { type: Array, default: () => [] }, // [{label, revenue, profit}]
  metric: { type: String, default: "revenue" }, // revenue | profit | units
  showProfit: { type: Boolean, default: false }
});

const W = 720;
const H = 240;
const PAD = { l: 8, r: 8, t: 16, b: 28 };

const max = computed(() => {
  const vals = props.series.map((d) => Math.max(d.revenue || 0, props.showProfit ? d.profit || 0 : 0, d[props.metric] || 0));
  return Math.max(1, ...vals);
});

const bars = computed(() => {
  const n = props.series.length || 1;
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const slot = innerW / n;
  const bw = Math.min(38, slot * 0.6);
  return props.series.map((d, i) => {
    const x = PAD.l + slot * i + (slot - bw) / 2;
    const v = d[props.metric] ?? d.revenue ?? 0;
    const h = (v / max.value) * innerH;
    const ph = props.showProfit ? (Math.max(0, d.profit || 0) / max.value) * innerH : 0;
    return { x, bw, h, ph, y: PAD.t + innerH - h, py: PAD.t + innerH - ph, label: d.label, v };
  });
});
</script>

<template>
  <div class="chart-wrap">
    <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="chart">
      <line v-for="g in 4" :key="g" :x1="0" :x2="W" :y1="PAD.t + ((H - PAD.t - PAD.b) / 4) * g" :y2="PAD.t + ((H - PAD.t - PAD.b) / 4) * g" class="grid" />
      <g v-for="(b, i) in bars" :key="i">
        <rect :x="b.x" :y="b.y" :width="b.bw" :height="Math.max(0, b.h)" rx="3" class="bar" />
        <rect v-if="showProfit" :x="b.x" :y="b.py" :width="b.bw" :height="Math.max(0, b.ph)" rx="3" class="bar-profit" />
        <text :x="b.x + b.bw / 2" :y="H - 8" class="lbl">{{ b.label }}</text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.chart-wrap { width: 100%; }
.chart { width: 100%; height: 240px; display: block; }
.grid { stroke: var(--line); stroke-width: 1; }
.bar { fill: var(--ink); }
.bar-profit { fill: var(--orange); }
.lbl { font-family: var(--font-mono); font-size: 10px; fill: var(--txt-faint); text-anchor: middle; }
</style>
