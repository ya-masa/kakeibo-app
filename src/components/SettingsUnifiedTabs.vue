<script setup>
import { ref, computed, onMounted, methods } from 'vue'
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
      shoukoumoku: item.shoukoumoku,
      disabled: item.hihyouji === true,
      order: item.hihyouji === true ? null : item.hihyouji
    })
  })

  // 🔥 小項目を code 順に並べ替え
  Object.values(map).forEach(category => {
    category.items.sort((a, b) => a.code - b.code)
  })

  // 🔥 大項目も code 順に並べ替え
  return Object.values(map).sort((a, b) => a.daikoumokuCode - b.daikoumokuCode)
})



/* 小項目追加（最大10件） */
const addItem = (category) => {
  // 現在のタブの group（例：1_資産）
  const group = modeGroup.value

  // rawList から該当大項目のデータを抽出
  const targetList = rawList.value.filter(
    i => i.group === group && i.daikoumoku === category.daikoumoku
  )

  // 10件以上なら追加不可
  if (targetList.length >= 10) return

  // 既存コードの1の位（小項目番号）を抽出
  const usedSmallCodes = targetList
    .map(i => i.code % 10) // 1の位だけ取り出す
    .sort((a, b) => a - b)

  // 次の番号を決める（0〜9）
  let nextSmallCode = 0
  for (let i = 0; i < 10; i++) {
    if (!usedSmallCodes.includes(i)) {
      nextSmallCode = i
      break
    }
  }

  // 大項目コード（10の位）を取得
  const firstItem = targetList[0]
  const daikoumokuCode = Math.floor(firstItem.code / 10) * 10

  // 新しい code を作成
  const newCode = daikoumokuCode + nextSmallCode

  // rawList に追加
  rawList.value.push({
    code: newCode,
    group: group,
    daikoumoku: category.daikoumoku,
    shoukoumoku: "",
    hihyouji: targetList.length + 1 // 表示順
  })
}


/* 小項目削除 */
const removeItem = (category, index) => {
  const targetList = rawList.value.filter(
    i => i.group === modeGroup.value && i.daikoumoku === category.daikoumoku
  )

  const item = targetList[index]

  // rawList から削除
  rawList.value = rawList.value.filter(i => i !== item)
}

/*小項目の変更を反映 */
const changeItem = (item) => {
  // rawList の該当データを探す
  const target = rawList.value.find(i => i.code === item.code)

  if (target) {
    target.shoukoumoku = item.name   // ← 保存用データを更新
  }

  console.log("保存:", target)
}


/*全項目保存 */
const saveAll = async () => {
  loadingStore.globalLoading.value = true
  
try {
    const payload = new URLSearchParams()

    payload.append("mode", "kamoku")

    rawList.value.forEach((item, index) => {
      payload.append(`code_${index}`, item.code)
      payload.append(`group_${index}`, item.group)
      payload.append(`daikomoku_${index}`, item.daikoumoku)
      payload.append(`shoukomoku_${index}`, item.shoukoumoku)
      payload.append(`hihyouji_${index}`, item.hihyouji)
    })

    // 件数も送る（GAS側で復元するため）
    payload.append("length", rawList.value.length)
    
  const res = await fetch(`${GAS_URL}?mode=kamoku`, {
    method: "POST",
    body: payload   // ← JSON ではない
  })
    console.log("rawList:"+payload,)  
    const result = await res.json()
     alert(result.message)
     router.push('/setting')
  }   catch (e) {
    alert("更新に失敗しました"+e.message)
  } 

  loadingStore.globalLoading.value = false
}

</script>

<template>
  <div class="settings-wrapper">

    <!-- 固定ヘッダー（保存ボタン） -->
    <div class="header-save">
      <button class="save-btn" @click="saveAll">
        保存する
      </button>
    </div>

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
          <input type="checkbox" v-model="item.disabled" />
          
          <span class="item-code">{{ item.code }}🔒</span>

          <input
            v-model="item.shoukoumoku"
            type="text"
            class="item-input"
            @input="changeItem(item)"
            :class="{ disabled: item.disabled }"
          />
              
        </div>
      </div>

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

</style>
