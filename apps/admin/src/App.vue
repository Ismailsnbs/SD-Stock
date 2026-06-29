<script setup>
import { useToast } from "./stores/toast.js";
const toast = useToast();
</script>

<template>
  <router-view />
  <div class="toast-wrap">
    <div v-for="t in toast.items" :key="t.id" class="toast" :class="t.type" @click="toast.dismiss(t.id)">
      {{ t.message }}
    </div>
  </div>
</template>
