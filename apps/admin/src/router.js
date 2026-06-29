import { createRouter, createWebHashHistory } from "vue-router";
import { useAuth } from "./stores/auth.js";

const routes = [
  { path: "/login", name: "login", component: () => import("./views/LoginView.vue"), meta: { public: true } },
  {
    path: "/",
    component: () => import("./views/AppShell.vue"),
    children: [
      { path: "", name: "dashboard", component: () => import("./views/DashboardView.vue") },
      { path: "stock", name: "stock", component: () => import("./views/StockView.vue") },
      { path: "customers", name: "customers", component: () => import("./views/CustomersView.vue") },
      { path: "sales", name: "sales", component: () => import("./views/SalesView.vue") },
      { path: "reports", name: "reports", component: () => import("./views/ReportsView.vue") }
    ]
  }
];

export const router = createRouter({ history: createWebHashHistory(), routes });

router.beforeEach((to) => {
  const auth = useAuth();
  if (!to.meta.public && !auth.isAuthed) return { name: "login" };
  if (to.name === "login" && auth.isAuthed) return { name: "dashboard" };
});
