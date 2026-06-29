<script setup>
defineProps({ title: String, open: Boolean });
const emit = defineEmits(["close"]);
</script>

<template>
  <transition name="fade">
    <div v-if="open" class="overlay" @click.self="emit('close')">
      <div class="sheet card">
        <header class="sheet-head">
          <h3>{{ title }}</h3>
          <button class="x" @click="emit('close')" aria-label="Close">×</button>
        </header>
        <div class="sheet-body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="sheet-foot">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.overlay {
  position: fixed; inset: 0; background: rgba(21, 23, 28, 0.45);
  display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 900;
  backdrop-filter: blur(2px);
}
.sheet { width: 100%; max-width: 520px; max-height: 90vh; display: flex; flex-direction: column; }
.sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid var(--line); }
.sheet-head h3 { font-size: 20px; font-weight: 800; }
.x { background: none; border: none; font-size: 26px; line-height: 1; color: var(--txt-faint); padding: 0 4px; }
.x:hover { color: var(--ink); }
.sheet-body { padding: 22px; overflow-y: auto; }
.sheet-foot { padding: 16px 22px; border-top: 1px solid var(--line); display: flex; gap: 10px; justify-content: flex-end; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
