<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuth } from "../stores/auth.js";
import LangToggle from "../components/LangToggle.vue";

const auth = useAuth();
const router = useRouter();
const { t } = useI18n();
const open = ref(false);

const nav = computed(() => [
  { to: "/", name: "dashboard", label: t("nav.dashboard"), icon: "▦" },
  { to: "/stock", name: "stock", label: t("nav.stock"), icon: "▣" },
  { to: "/customers", name: "customers", label: t("nav.members"), icon: "◉" },
  { to: "/sales", name: "sales", label: t("nav.sales"), icon: "↯" },
  { to: "/reports", name: "reports", label: t("nav.reports"), icon: "▲" }
]);

function logout() {
  auth.logout();
  router.push({ name: "login" });
}
</script>

<template>
  <div class="shell">
    <aside class="side" :class="{ open }">
      <div class="brand">
        <img class="brand-logo" src="/logo-light.svg" alt="SD Fitness" />
        <div class="brand-sub">{{ t('nav.brandSub') }}</div>
      </div>

      <nav class="menu">
        <router-link
          v-for="n in nav"
          :key="n.name"
          :to="n.to"
          class="nav-item"
          active-class="active"
          :exact="n.to === '/'"
          @click="open = false"
        >
          <span class="ic">{{ n.icon }}</span>
          <span>{{ n.label }}</span>
        </router-link>
      </nav>

      <div class="side-foot">
        <div class="who">
          <router-link to="/settings" class="who-link" active-class="active" :title="t('settings.title')" @click="open = false">
            <div class="who-avatar num">{{ (auth.admin?.username || 'A')[0].toUpperCase() }}</div>
            <div class="who-name">{{ auth.admin?.username }}</div>
            <span class="who-cog" aria-hidden="true">⚙</span>
          </router-link>
          <LangToggle class="who-lang" />
        </div>
        <button class="btn btn-ghost btn-sm logout" @click="logout">{{ t('nav.signOut') }}</button>
      </div>
    </aside>

    <div v-if="open" class="scrim" @click="open = false"></div>

    <div class="main">
      <header class="topbar">
        <button class="burger" @click="open = !open" aria-label="Menu">☰</button>
        <img class="topbar-logo" src="/logo-light.svg" alt="SD Fitness" />
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell { display: flex; min-height: 100vh; }

.side {
  width: 244px; flex-shrink: 0; background: var(--ink); color: var(--txt-on-dark);
  display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh;
}
.brand { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 24px 20px 18px; }
.brand-logo { width: 100%; max-width: 190px; height: auto; display: block; }
.brand-sub { font-size: 11px; color: var(--txt-on-dark-soft); letter-spacing: 0.04em; }

.menu { display: flex; flex-direction: column; gap: 3px; padding: 8px 12px; flex: 1; }
.nav-item {
  display: flex; align-items: center; gap: 12px; padding: 11px 13px; border-radius: 10px;
  color: var(--txt-on-dark-soft); text-decoration: none; font-weight: 600; font-size: 14.5px;
  transition: background 0.12s, color 0.12s;
}
.nav-item:hover { background: var(--graphite-2); color: #fff; }
.nav-item.active { background: var(--graphite-2); color: #fff; }
.nav-item.active .ic { color: var(--orange); }
.ic { font-size: 16px; width: 18px; text-align: center; }

.side-foot { padding: 14px; border-top: 1px solid var(--line-dark); }
.who { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.who-link {
  display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit;
  border-radius: 9px; padding: 4px 6px; margin: -4px -6px; transition: background 0.12s, color 0.12s;
}
.who-link:hover, .who-link.active { background: var(--graphite-2); color: #fff; }
.who-link:hover .who-cog { color: var(--orange); }
.who-avatar { width: 32px; height: 32px; border-radius: 999px; background: var(--graphite-2); display: grid; place-items: center; font-weight: 700; font-size: 13px; }
.who-name { font-weight: 600; font-size: 14px; }
.who-cog { font-size: 13px; color: var(--txt-on-dark-soft); }
.who-lang { margin-left: auto; }
.logout { width: 100%; color: var(--txt-on-dark-soft); border-color: var(--line-dark); }
.logout:hover { color: #fff; }

.main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.topbar { display: none; }
.content { padding: 28px 32px 48px; max-width: 1180px; width: 100%; margin: 0 auto; }

.scrim { display: none; }

@media (max-width: 860px) {
  .side {
    position: fixed; left: 0; top: 0; z-index: 80; transform: translateX(-100%);
    transition: transform 0.22s ease; box-shadow: var(--shadow-pop);
  }
  .side.open { transform: none; }
  .scrim { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 70; }
  .topbar {
    display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--ink);
    color: #fff; position: sticky; top: 0; z-index: 40;
  }
  .burger { background: none; border: none; color: #fff; font-size: 22px; }
  .topbar-logo { height: 26px; width: auto; display: block; }
  .content { padding: 18px 16px 64px; }
}
</style>
