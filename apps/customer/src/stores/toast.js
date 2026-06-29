import { defineStore } from "pinia";

let counter = 0;

export const useToast = defineStore("toast", {
  state: () => ({ items: [] }),
  actions: {
    push(message, type = "info") {
      const id = ++counter;
      this.items.push({ id, message, type });
      setTimeout(() => this.dismiss(id), 3000);
    },
    ok(m) { this.push(m, "ok"); },
    err(m) { this.push(m, "err"); },
    dismiss(id) { this.items = this.items.filter((t) => t.id !== id); }
  }
});
