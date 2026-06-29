import { defineStore } from "pinia";
import { api } from "../api.js";

export const useAuth = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("gym_admin_token") || "",
    admin: JSON.parse(localStorage.getItem("gym_admin_user") || "null")
  }),
  getters: {
    isAuthed: (s) => !!s.token
  },
  actions: {
    async login(username, password) {
      const { data } = await api.post("/auth/admin/login", { username, password });
      this.token = data.token;
      this.admin = data.admin;
      localStorage.setItem("gym_admin_token", data.token);
      localStorage.setItem("gym_admin_user", JSON.stringify(data.admin));
    },
    logout() {
      this.token = "";
      this.admin = null;
      localStorage.removeItem("gym_admin_token");
      localStorage.removeItem("gym_admin_user");
    }
  }
});
