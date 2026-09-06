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

    <button class="nav-btn" @click="goMonthlys">
      定期収支設定
    </button>
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

    const goMonthlys = () => {
      router.push('/setting/monthly')
    }

    onMounted(() => {
      setTimeout(() => {
        loadingStore.globalLoading.value = false
      }, 10)
    })

    return { goCategories, goShops ,goMonthlys}
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