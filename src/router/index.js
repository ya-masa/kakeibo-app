import { createRouter, createWebHashHistory } from "vue-router"
import { globalLoading } from '@/stores/loadingStore'

import List from "@/pages/List.vue"
import Add from "@/pages/Add.vue"
import Edit from "@/pages/Edit.vue"
import Setting from "@/pages/Setting.vue"
import Home from "@/pages/Home.vue"


const routes = [
  { path: "/list", name: "list", component: List },

  // ★ 追加画面
  { path: "/add", name: "add", component: Add },

  // ★ 修正画面
  { path: "/edit", name: "edit", component: Edit },

  // ★ 設定画面
  { path: "/setting", name: "setting", component: Setting },

  // ★ ホーム画面
  { path: "/home", name: "home", component: Home },
  
  // ★ 初期ページ
  { path: "/", name: "add", component: Add }

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