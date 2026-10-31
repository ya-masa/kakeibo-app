<script setup>
import { ref, computed, onMounted, methods } from 'vue'
import { GAS_URL } from '@/constants/index.js'
import loadingStore from "@/stores/loadingStore"
import { getAccountIcon } from '@/components/accountIcons'
import {Tags} from "lucide-vue-next";


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
    target.shoukoumoku = item.shoukoumoku   // ← 保存用データを更新
  }

  console.log("保存:", target)
}


/*全項目保存 */
const saveAll = async () => {
  loadingStore.globalLoading.value = true
  
try {
    const payload = new URLSearchParams()
    console.log("rawList件数:", rawList.value.length)
    console.table(rawList.value)
    payload.append("mode", "kamoku")

    rawList.value.forEach((item, index) => {
      payload.append(`code_${index}`, item.code)
      payload.append(`group_${index}`, item.group)
      payload.append(`daikomoku_${index}`, item.daikoumoku)
      payload.append(`shoukoumoku_${index}`, item.shoukoumoku)
      payload.append(`hihyouji_${index}`, item.hihyouji)
    })

    // 件数も送る（GAS側で復元するため）
    payload.append("length", rawList.value.length)
    
  const res = await fetch(`${GAS_URL}?mode=kamoku`, {
    method: "POST",
    body: payload   // ← JSON ではない
  })
    console.log("保存件数:", rawList.value.length)
    console.log("送信データ:", payload.toString())
    const result = await res.json()
     alert(result.message)
     router.push('/setting')
  }   catch (e) {
    alert("更新に失敗しました"+e.message)
  } 

  loadingStore.globalLoading.value = false
}
  const changeDisabled = (item, disabled) => {
    const target = rawList.value.find(i => i.code === item.code)

    if (target) {
      target.hihyouji = disabled ? true : item.order
    }
  }
</script>

<template>
  <div class="settings-wrapper">
    <div class="settings-heading">
      <div class="menu-icon">
        <Tags :size="24" />
      </div>

      <div class="menu-text">
        <div class="menu-title">
          口座・科目の設定
        </div>
        <div class="menu-description">
          資産・負債・収入・支出の科目や小項目を編集します。
        </div>
      </div>
    </div>

    <!-- 固定ヘッダー（保存ボタン） -->
    <div class="header-save">
      <button class="btn" @click="saveAll">
        保存する
      </button>
    </div>

    <!-- タブUI -->
    <div class="tabs">
      <button class="button" :class="{ active: mode === 100 }" @click="mode = 100">資産</button>
      <button class="button" :class="{ active: mode === 200 }" @click="mode = 200">負債</button>
      <button class="button" :class="{ active: mode === 400 }" @click="mode = 400">収入</button>
      <button class="button" :class="{ active: mode === 500 }" @click="mode = 500">支出</button>
    </div>

    <!-- カード表示（大項目ごと） -->
    <div
      v-for="category in categories"
      :key="category.daikoumoku"
      class="card"
    >
      <div class="card-header">
        <span class="category-icon">
          <component :is="getAccountIcon(category.daikoumoku)" :size="21" :stroke-width="2.2" />
        </span>
        <h3>{{ category.daikoumoku }}</h3>
        <span class="lock">🔒</span>
      </div>

      <div class="item-list">
        <div
          v-for="(item, index) in category.items"
          :key="index"
          class="item-row"
        >
          <input
            type="checkbox"
            :checked="item.disabled"
            @change="changeDisabled(item, $event.target.checked)"
          />
          <span class="item-code">{{ item.code }}</span>

          <input
            v-model="item.shoukoumoku"
            type="text"
            class="input-field item-input"
            @input="changeItem(item)"
            :class="{ disabled: item.disabled }"
          />
              
        </div>
      </div>

      <button
        class="btn"
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
  width: 100%;
  max-width: var(--content-width, 600px);
  min-width: 0;
  margin: 0 auto;
  padding: 8px 0 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
/* タイトル */

.settings-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.settings-title svg {
  flex: 0 0 auto;
  color: var(--color-coffee);
}


/* 説明 */

.settings-description {
  margin: 0 0 var(--space-5);
  color: var(--color-muted);
  font-size: 13px;
  line-height: 1.6;
}

/* 固定保存エリア */
.header-save {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 10px 12px 4px;
  background: var(--color-background, #f9f1e7);
  border-bottom: 1px solid var(--color-border, #c8a27e);
}

.header-save .btn {
  width: 100%;
  margin: 0;
  min-height: 44px;
  border: 1px solid var(--color-coffee, #6b4f3f);
  border-radius: var(--radius-md, 8px);
  background: var(--color-beige, #c8a27e);
  color: var(--color-brown-dark, #3a2f2a);
  font-weight: 600;
}

/* 資産・負債・収入・支出のタブ */
.tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  margin: 0px;
}

.settings-menu {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}


/* メニューカード */

.settings-menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  min-height: 86px;
  margin: 0;
  padding: var(--space-4);
  gap: var(--space-3);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
  transition:
    background-color .16s ease,
    border-color .16s ease,
    transform .16s ease;
}

.settings-menu-item:hover {
  background: var(--color-surface-soft);
  border-color: var(--color-border-strong);
}

.settings-menu-item:active {
  transform: translateY(1px);
}


/* アイコン */

.menu-icon {
  display: flex;
  flex: 0 0 46px;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: var(--radius-md);
  background: var(--color-surface-soft);
  color: var(--color-coffee);
}

.menu-icon svg {
  flex-shrink: 0;
}


/* メニュー文字 */

.menu-text {
  flex: 1 1 auto;
  min-width: 0;
}

.menu-title {
  margin-bottom: 4px;
  color: var(--color-text);
  font-size: 15px;
  font-weight: 750;
  line-height: 1.4;
}

.menu-description {
  color: var(--color-muted);
  font-size: 12px;
  line-height: 1.5;
}

/* アイコン＋タイトル＋説明 */
.settings-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

/* 文字部分 */
.menu-text {
  flex: 1;
  min-width: 0;
}

/* タイトル */
.menu-title {
  margin-bottom: 4px;
  color: var(--color-text);
  font-size: 15px;
  font-weight: 750;
  line-height: 1.4;
}

/* 説明 */
.menu-description {
  color: var(--color-muted);
  font-size: 12px;
  line-height: 1.5;
}

.card-header {
  justify-content: flex-start;
}

.card-header h3 {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  text-align: left;
}

.category-icon {
  display: inline-flex;
  flex: 0 0 28px;
  align-items: center;
  justify-content: center;
  color: var(--color-coffee);
}

.lock {
  margin-left: auto;
  flex: 0 0 auto;
  opacity: 0.65;
  font-size: 14px;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  margin: 0;
}

.item-row input[type="checkbox"] {
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--color-text);
}

.item-code {
  flex: 0 0 42px;
  display: inline-block;
  text-align: center;
  color: var(--color-muted);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.item-input.disabled {
  background: var(--color-surface-strong);
  color: var(--color-muted);
}

@media (max-width: 360px) {
  .settings-wrapper {
    gap: 12px;
  }

  .card {
    padding: 11px;
  }

  .tabs {
    gap: 4px;
  }

  .tabs button {
    font-size: 13px;
    padding-inline: 2px;
  }

  .item-row {
    gap: 6px;
  }

  .item-code {
    flex-basis: 36px;
    font-size: 12px;
  }
}
</style>
