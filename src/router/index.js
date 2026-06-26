import { createRouter, createWebHashHistory } from "vue-router"
import { globalLoading } from '@/stores/loadingStore'

import List from "@/pages/List.vue"
import Add from "@/pages/Add.vue"
import Edit from "@/pages/Edit.vue"
import Home from "@/pages/Home.vue"


const routes = [
  { path: "/list", name: "list", component: List },

  // ★ 追加画面
  { path: "/add", name: "add", component: Add },

  // ★ 修正画面
  { path: "/edit", name: "edit", component: Edit },

  // ★ ホーム画面
  { path: "/", name: "home", component: Home }
]

const router = createRouter({
  history: createWebHashHistory('/kakeibo-app/'),
  routes
})

router.beforeEach((to, from) => {
  globalLoading.value = true
  return true
})

router.afterEach(() => {
 //ここでは何もしない
})
export default router