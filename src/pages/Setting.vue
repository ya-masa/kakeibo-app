<template>
  <div class="settings-page">
    <!-- ここに家計簿アプリの設定項目を追加していく -->
    <h1>設定</h1>

    <h3>科目や大小項目編集</h3>
    <h3>よく使うお店の登録</h3>
    <h3>毎月の定期収支設定</h3>
    <h3>年1回の定期収支設定</h3>
  </div>
</template>

<script>
import { onMounted} from 'vue'

export default {
  name: 'SettingsPage',
  setup() {
    // まだ何もロジックは書かない
    return {};
  },
};
onMounted(() => {
    // ここでローディングを消す（長めにしたいなら調整）
    setTimeout(() => {
      loadingStore.globalLoading.value = false
    }, 10) // ← ここを好きな時間にできる
    })
</script>

<style scoped>
.settings-page {
  padding: 16px;
}
</style>
