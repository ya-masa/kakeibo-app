<template>
  <div class="settings-page">
    <!-- ここに家計簿アプリの設定項目を追加していく -->
    <h1>設定</h1>

    <p>科目や大小項目編集</p>
    <p>よく使うお店の登録</p>
    <p>毎月の定期収支設定</p>
    <p>年1回の定期収支設定</p>
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
