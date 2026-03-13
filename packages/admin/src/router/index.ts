import { createRouter, createWebHistory } from "vue-router";

import HomePage from "../pages/HomePage.vue";
import DashboardPage from "../pages/DashboardPage.vue";
import PageEditorPage from "../pages/PageEditorPage.vue";
import ConfigEditorPage from "../pages/ConfigEditorPage.vue";

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
      name: "dashboard",
      component: DashboardPage,
    },
    {
      path: "/editor/page/:path(.*)",
      name: "page-editor",
      component: PageEditorPage,
    },
    {
      path: "/editor/config/:path(.*)",
      name: "config-editor",
      component: ConfigEditorPage,
    },
  ],
});
