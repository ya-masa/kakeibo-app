<template>
  <div class="settings-page">
    <h1>設定</h1>

    <!-- 科目や大小項目編集へ遷移 -->
    <button class="nav-btn" @click="goCategories">
      口座や小項目編集
    </button>

    <!-- よく使うお店の編集へ遷移 -->
    <button class="nav-btn" @click="goShops">
      よく使うお店の編集
    </button>

    <p>毎月の定期収支設定</p>
    <p>年1回の定期収支設定</p>
  </div>
</template>

<script>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import loadingStore from "@/stores/loadingStore"

export default {
  name: 'SettingsPage',
  setup() {
    const router = useRouter()

    const goCategories = () => {
      router.push('/setting/kamoku')
    }

    const goShops = () => {
      router.push('/setting/shops')
    }

    onMounted(() => {
      setTimeout(() => {
        loadingStore.globalLoading.value = false
      }, 10)
    })

    return { goCategories, goShops }
  },
}
</script>

<style scoped>
.settings-page {
  padding: 16px;
}

.nav-btn {
  display: block;
  margin: 12px 0;
  padding: 12px;
  width: 100%;
  border-radius: 8px;
  border: none;
  background: #e0f0ff;
  font-size: 16px;
}
</style>