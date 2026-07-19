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
      console.log("ALLLIST:")
      const all = await res.json()

      rawList.value = all
      console.log("rawList:",rawList)
      // ローディング解除
      requestAnimationFrame(() => {
          requestAnimationFrame(() => {
          setTimeout(() => {
              loadingStore.globalLoading.value = false
          }, 10)
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

  const map = {}

  list.forEach(item => {
    if (!map[item.daikoumoku]) {
      map[item.daikoumoku] = {
        daikoumoku: item.daikoumoku,
        daikoumokuCode: Math.floor(item.code / 10) * 10, // 大項目コード
        items: []
      }
    }
    map[item.daikoumoku].items.push({
      code: item.code,
      shoukoumoku: item.shoukoumoku,   // ← name ではなく shoukoumoku に統一
      disabled: item.hihyouji === true,
      order: item.hihyouji === true ? null : item.hihyouji,
      shops: normalizeShops(item.shops ?? [])
    })
  })

  // 🔥 小項目を code 順に並べ替え
  Object.values(map).forEach(category => {
    category.items.sort((a, b) => a.code - b.code)
  })
  // 🔥 大項目も code 順に並べ替え
  return Object.values(map).sort((a, b) => a.daikoumokuCode - b.daikoumokuCode)
  })

  const openedCode = ref(null)
  //トグルボタンを押したときの動作
  const toggle = (code) => {
    console.log("toggle:", code)
    openedCode.value = openedCode.value === code ? null : code
  }
  
  //更新ボタン押下時の処理
  const update = async (item) => {
  item.dirty = false
  loadingStore.globalLoading.value = true

  try {
    const res = await fetch(`${GAS_URL}?mode=kamoku`, {
      method: "POST",
      body: JSON.stringify(rawList.value)
    })

    const result = await res.json()
      alert(result.message)
      item.dirty = false
  } catch (e) {
      alert("更新に失敗しました" + e.message)
  }

  loadingStore.globalLoading.value = false
}

function normalizeShops(shops) {
  const result = [];

  for (let i = 0; i < 10; i++) {
    result.push(shops[i] || "");   // 足りない分は空欄
  }

  return result;
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
        <div v-for="(item, index) in category.items" :key="index" class="item-row">
          <span class="item-code">{{ item.code }}</span>
          <span class="item-input">{{ item.shoukoumoku }}</span>

          <button @click="toggle(item.code)">＋</button>
          
          <div v-if="openedCode === item.code" class="shop-area">
            <div v-for="(shop, sIndex) in item.shops" :key="sIndex" class="row">
              <input v-model="item.shops[sIndex]" placeholder="ショップ名" />
            </div>

            <button class="update-btn" @click="update(item)">
              更新
            </button>
          </div>
        </div>
      </div>
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

/*固定ヘッダー */
.header-save {
  position: sticky;
  top: 0;
  background: #fff;
  padding: 12px;
  z-index: 100;
  border-bottom: 1px solid #ddd;
}
.save-btn {
  width: 100%;
  padding: 12px;
  background: #66aaff;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
}
.item-code {
  width: 60px;
  display: inline-block;
  text-align: center;
  color: #555;
  font-size: 14px;
}
.dirty {
  color: red;
}
</style>