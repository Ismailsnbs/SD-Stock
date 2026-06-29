<script setup>
import { useToast } from "./stores/toast.js";
const toast = useToast();
</script>

<template>
  <router-view v-slot="{ Component }">
    <transition name="slide" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>

  <div class="toast-wrap">
    <div v-for="t in toast.items" :key="t.id" class="toast" :class="t.type" @click="toast.dismiss(t.id)">
      {{ t.message }}
    </div>
  </div>
</template>

<style>
.slide-enter-active, .slide-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.slide-enter-from { opacity: 0; transform: translateX(10px); }
.slide-leave-to { opacity: 0; transform: translateX(-10px); }
@media (prefers-reduced-motion: reduce) {
  .slide-enter-active, .slide-leave-active { transition: none; }
}
</style>
