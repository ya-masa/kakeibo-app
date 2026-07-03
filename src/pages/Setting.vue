<template>
  <div class="settings-page">
    <h1>設定</h1>

    <!-- 科目や大小項目編集へ遷移 -->
    <button class="nav-btn" @click="goCategories">
      科目や大小項目編集
    </button>

    <p>よく使うお店の登録</p>
    <p>毎月の定期収支設定</p>
    <p>年1回の定期収支設定</p>
  </div>
</template>

<script>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'


export default {
  name: 'SettingsPage',
  setup() {
    const router = useRouter()

    const goCategories = () => {
      router.push('/settings/kamoku')
    }

    onMounted(() => {
      setTimeout(() => {
        loadingStore.globalLoading.value = false
      }, 10)
    })

    return { goCategories }
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
