import { createRouter, createWebHistory } from "vue-router";

import HomePage from "../pages/HomePage.vue";
import AdminPage from "../pages/AdminPage.vue";

export default createRouter({
  history: createWebHistory("/admin/"),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomePage,
    },
    {
      path: "/editor",
      name: "admin",
      component: AdminPage,
    },
  ],
});
