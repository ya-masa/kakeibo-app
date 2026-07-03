<script setup>
import { ref, computed, onMounted } from 'vue'
import { GAS_URL } from '@/constants/index.js'
import loadingStore from "@/stores/loadingStore"

/* GASから取得した生データ */
const rawList = ref([])

/* モード：100=資産, 200=負債, 400=収入, 500=支出 */
const mode = ref(100)

/* GASから一覧データ取得 */
onMounted(async () => {
  const res = await fetch(`${GAS_URL}?list=ALLLIST`)
  const all = await res.json()

  rawList.value = all

  // ローディング解除
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        loadingStore.globalLoading.value = false
      }, 500)
    })
  })
})

/* モードに応じて group を決める */
const modeGroup = computed(() => {
  if (mode.value === 100) return "1_資産"
  if (mode.value === 200) return "2_負債"
  if (mode.value === 400) return "4_収入"
  if (mode.value === 500) return "5_支出"
})

/* 大項目ごとにカード化する */
const categories = computed(() => {
  const list = rawList.value.filter(i => i.group === modeGroup.value)

  // 大項目ごとにまとめる
  const map = {}

  list.forEach(item => {
    if (!map[item.daikoumoku]) {
      map[item.daikoumoku] = {
        daikoumoku: item.daikoumoku,
        items: []
      }
    }

    map[item.daikoumoku].items.push({
      code: item.code,
      name: item.shoukoumoku,
      disabled: item.hihyouji === true,   // TRUE → 非表示
      order: item.hihyouji === true ? null : item.hihyouji
    })
  })

  return Object.values(map)
})

/* 小項目追加（最大10件） */
const addItem = (category) => {
  if (category.items.length >= 10) return

  category.items.push({
    code: null,
    name: "",
    disabled: false,
    order: category.items.length + 1
  })
}

/* 小項目削除 */
const removeItem = (category, index) => {
  category.items.splice(index, 1)
}
</script>

<template>
  <div class="settings-wrapper">

    <!-- タブUI -->
    <div class="tabs">
      <button :class="{ active: mode === 100 }" @click="mode = 100">資産</button>
      <button :class="{ active: mode === 200 }" @click="mode = 200">負債</button>
      <button :class="{ active: mode === 400 }" @click="mode = 400">収入</button>
      <button :class="{ active: mode === 500 }" @click="mode = 500">支出</button>
    </div>

    <!-- カード表示（大項目ごと） -->
    <div
      v-for="category in categories"
      :key="category.daikoumoku"
      class="card"
    >
      <div class="card-header">
        <h3>{{ category.daikoumoku }}</h3>
        <span class="lock">🔒</span>
      </div>

      <div class="item-list">
        <div
          v-for="(item, index) in category.items"
          :key="index"
          class="item-row"
        >
          <!-- 非表示チェック -->
          <input type="checkbox" v-model="item.disabled" />

          <!-- 小項目名 -->
          <input
            v-model="item.name"
            type="text"
            class="item-input"
            :class="{ disabled: item.disabled }"
          />

          <!-- 削除 -->
          <button class="delete" @click="removeItem(category, index)">
            削除
          </button>
        </div>
      </div>

      <!-- 追加ボタン -->
      <button
        class="add-btn"
        @click="addItem(category)"
        :disabled="category.items.length >= 10"
      >
        ＋ 小項目を追加
      </button>
    </div>

  </div>
</template>

<style scoped>
.settings-wrapper {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* タブUI */
.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
}

.tabs button {
  flex: 1;
  padding: 10px 0;
  border-radius: 8px;
  border: 1px solid #ccc;
  background: #f8f8f8;
}

.tabs button.active {
  background: #d0e8ff;
  border-color: #66aaff;
  font-weight: bold;
}

/* カード */
.card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

/* 大項目ヘッダー */
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.lock {
  opacity: 0.6;
}

/* 小項目行 */
.item-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.item-input {
  flex: 1;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #ccc;
}

.item-input.disabled {
  background: #f0f0f0;
  color: #999;
}

/* 削除ボタン */
.delete {
  padding: 6px 10px;
  border-radius: 6px;
  border: none;
  background: #ffdddd;
}

/* 追加ボタン */
.add-btn {
  margin-top: 10px;
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: #e0f0ff;
}

.add-btn:disabled {
  background: #ccc;
}
</style>
