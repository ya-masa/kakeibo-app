<template>
  <div class="settings-page">
    <h1>設定</h1>

    <!-- 科目CDや大小項目編集へ遷移 -->
    <button class="btn" @click="goCategories">
      口座や小項目編集
    </button>

    <!-- よく使うお店の編集へ遷移 -->
    <button class="btn" @click="goShops">
      よく使うお店の編集
    </button>

    <button class="btn" @click="goMonthlys">
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
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: 16px;
  box-sizing: border-box;
}

.settings-page h1 {
  margin: 0 0 20px;
  color: var(--color-brown-dark);
  font-size: 1.5rem;
  text-align: center;
}

/* 共通 .btn の配色・形状を利用し、設定メニュー内の間隔だけ調整 */
.settings-page .btn {
  display: block;
  min-height: 48px;
  margin: 0 0 12px;
  padding: 12px 16px;
  text-align: center;
  box-sizing: border-box;
}

@media (max-width: 400px) {
  .settings-page {
    padding: 12px;
  }
}
</style>
