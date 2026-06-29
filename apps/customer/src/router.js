import { createRouter, createWebHashHistory } from "vue-router";
import { useAuth } from "./stores/auth.js";

const routes = [
  { path: "/", name: "home", component: () => import("./views/HomeView.vue") },
  { path: "/shop", name: "shop", component: () => import("./views/ShopView.vue") },
  { path: "/login", name: "login", component: () => import("./views/LoginView.vue") },
  { path: "/account", name: "account", component: () => import("./views/AccountView.vue"), meta: { auth: true } }
];

export const router = createRouter({ history: createWebHashHistory(), routes });

router.beforeEach((to) => {
  const auth = useAuth();
  if (to.meta.auth && !auth.isLoggedIn) return { name: "login" };
});
