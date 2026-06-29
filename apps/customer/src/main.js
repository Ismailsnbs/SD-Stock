import { createApp } from "vue";
import { createPinia } from "pinia";
import { router } from "./router.js";
import { useAuth } from "./stores/auth.js";
import { i18n } from "./i18n.js";
import App from "./App.vue";
import "./styles.css";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia).use(router).use(i18n);

// Re-validate the infinite token on boot before mounting.
useAuth(pinia).refresh().finally(() => app.mount("#app"));
