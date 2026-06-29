import { createApp } from "vue";
import { createPinia } from "pinia";
import { router } from "./router.js";
import { i18n } from "./i18n.js";
import App from "./App.vue";
import "./styles.css";

createApp(App).use(createPinia()).use(router).use(i18n).mount("#app");
