import { createRouter, createWebHistory } from "vue-router"
import { globalLoading } from '@/stores/loadingStore'

import List from "@/pages/List.vue"
import Add from "@/pages/Add.vue"
import Edit from "@/pages/Edit.vue"

const routes = [
  { path: "/", name: "list", component: List },
  { path: "/list", name: "list2", component: List },

  // ★ 追加画面
  { path: "/add", name: "add", component: Add },

  // ★ 修正画面
  { path: "/edit", name: "edit", component: Edit },
]
const router = createRouter({
  history: createWebHistory(),
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

