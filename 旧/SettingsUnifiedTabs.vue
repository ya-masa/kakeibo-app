<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { GAS_URL } from '@/constants/index.js'
import loadingStore from '@/stores/loadingStore'

const router = useRouter()

/* GASから取得した生データ */
const rawList = ref([])

/* モード：100=資産, 200=負債, 400=収入, 500=支出 */
const mode = ref(100)

/* 読み込み状態 */
const loading = ref(false)

/* モードに応じて group を決める */
const modeGroup = computed(() => {
  if (mode.value === 100) return '1_資産'
  if (mode.value === 200) return '2_負債'
  if (mode.value === 400) return '4_収入'
  if (mode.value === 500) return '5_支出'
  return ''
})

/* タブ情報 */
const modeTabs = [
  { code: 100, label: '資産' },
  { code: 200, label: '負債' },
  { code: 400, label: '収入' },
  { code: 500, label: '支出' }
]

/* GASから一覧データ取得 */
onMounted(async () => {
  loading.value = true

  try {
    const res = await fetch(`${GAS_URL}?list=ALLLIST`)

    if (!res.ok) {
      throw new Error(`データ取得に失敗しました（${res.status}）`)
    }

    const all = await res.json()
    rawList.value = all

  } catch (e) {
    console.error('科目一覧取得エラー:', e)
    alert('科目一覧の取得に失敗しました。\n' + e.message)

  } finally {
    loading.value = false

    // 画面表示後にローディングを解除
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          loadingStore.globalLoading.value = false
        }, 10)
      })
    })
  }
})

/* 大項目ごとにカード化する */
const categories = computed(() => {
  const list = rawList.value.filter(
    item => item.group === modeGroup.value
  )

  const map = {}

  list.forEach(item => {
    if (!map[item.daikoumoku]) {
      map[item.daikoumoku] = {
        daikoumoku: item.daikoumoku,
        daikoumokuCode: Math.floor(item.code / 10) * 10,
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

  // 小項目をコード順に並べ替え
  Object.values(map).forEach(category => {
    category.items.sort((a, b) => a.code - b.code)
  })

  // 大項目をコード順に並べ替え
  return Object.values(map).sort(
    (a, b) => a.daikoumokuCode - b.daikoumokuCode
  )
})

/* 小項目追加（最大10件） */
const addItem = (category) => {
  const group = modeGroup.value

  // 該当する大項目のデータを抽出
  const targetList = rawList.value.filter(
    item =>
      item.group === group &&
      item.daikoumoku === category.daikoumoku
  )

  // 10件以上なら追加不可
  if (targetList.length >= 10) return

  // 既存コードの1の位を取得
  const usedSmallCodes = targetList
    .map(item => item.code % 10)
    .sort((a, b) => a - b)

  // 未使用の番号を取得
  let nextSmallCode = 0

  for (let i = 0; i < 10; i++) {
    if (!usedSmallCodes.includes(i)) {
      nextSmallCode = i
      break
    }
  }

  // 大項目コードを取得
  const firstItem = targetList[0]
  const daikoumokuCode = Math.floor(firstItem.code / 10) * 10

  // 新しいコードを作成
  const newCode = daikoumokuCode + nextSmallCode

  // rawListに追加
  rawList.value.push({
    code: newCode,
    group: group,
    daikoumoku: category.daikoumoku,
    shoukoumoku: '',
    hihyouji: targetList.length + 1
  })
}

/* 小項目削除 */
const removeItem = (category, index) => {
  const targetList = rawList.value.filter(
    item =>
      item.group === modeGroup.value &&
      item.daikoumoku === category.daikoumoku
  )

  const item = targetList[index]

  if (!item) return

  rawList.value = rawList.value.filter(
    target => target !== item
  )
}

/* 小項目の変更を反映 */
const changeItem = (item) => {
  const target = rawList.value.find(
    data => data.code === item.code
  )

  if (target) {
    target.shoukoumoku = item.shoukoumoku
  }
}

/* 表示・非表示の変更 */
const changeDisabled = (item, disabled) => {
  const target = rawList.value.find(
    data => data.code === item.code
  )

  if (target) {
    target.hihyouji = disabled ? true : item.order
  }
}

/* 全項目保存 */
const saveAll = async () => {
  loadingStore.globalLoading.value = true

  try {
    const payload = new URLSearchParams()

    payload.append('mode', 'kamoku')

    rawList.value.forEach((item, index) => {
      payload.append(`code_${index}`, item.code)
      payload.append(`group_${index}`, item.group)
      payload.append(`daikomoku_${index}`, item.daikoumoku)
      payload.append(`shoukoumoku_${index}`, item.shoukoumoku)
      payload.append(`hihyouji_${index}`, item.hihyouji)
    })

    // GAS側で復元するための件数
    payload.append('length', rawList.value.length)

    const res = await fetch(`${GAS_URL}?mode=kamoku`, {
      method: 'POST',
      body: payload
    })

    if (!res.ok) {
      throw new Error(`保存に失敗しました（${res.status}）`)
    }

    const result = await res.json()

    alert(result.message)

    // 保存後は設定メニューへ戻る
    router.push('/setting')

  } catch (e) {
    console.error('科目保存エラー:', e)
    alert('更新に失敗しました。\n' + e.message)

  } finally {
    loadingStore.globalLoading.value = false
  }
}
</script>

<template>
  <div class="settings-wrapper">

    <!-- ヘッダー -->
    <header class="settings-header">
      <div class="settings-title">
        <div class="title-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="23"
            height="23"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4 5h16" />
            <path d="M4 12h16" />
            <path d="M4 19h16" />
            <path d="M9 5v14" />
          </svg>
        </div>

        <div>
          <h1>科目設定</h1>
          <p class="settings-description">
            大項目ごとに小項目を管理できます
          </p>
        </div>
      </div>

      <button
        class="btn btn-lg save-button"
        type="button"
        @click="saveAll"
        :disabled="loading"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
          <path d="M17 21v-8H7v8" />
          <path d="M7 3v5h8" />
        </svg>
        保存する
      </button>
    </header>

    <!-- 説明 -->
    <div class="settings-help">
      <p>
        <strong>チェックを入れる</strong>と、入力画面などの選択肢に表示されなくなります。
      </p>
      <p>
        小項目の追加・名称変更を行ったら、最後に保存してください。
      </p>
    </div>

    <!-- 資産・負債・収入・支出タブ -->
    <div class="tabs category-tabs">
      <button
        v-for="tab in modeTabs"
        :key="tab.code"
        type="button"
        class="tab-btn"
        :class="{ active: mode === tab.code }"
        @click="mode = tab.code"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 大項目カード -->
    <div
      v-for="category in categories"
      :key="category.daikoumoku"
      class="category-card"
    >
      <div class="category-header">
        <div class="category-heading">
          <span class="category-code">
            {{ category.daikoumokuCode }}
          </span>

          <h2>{{ category.daikoumoku }}</h2>
        </div>

        <span class="lock-mark" title="大項目">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
      </div>

      <!-- 小項目一覧 -->
      <div class="item-list">
        <div
          v-for="item in category.items"
          :key="item.code"
          class="item-row"
          :class="{ 'item-hidden': item.disabled }"
        >
          <label class="visibility-control">
            <input
              type="checkbox"
              :checked="item.disabled"
              @change="changeDisabled(item, $event.target.checked)"
              :aria-label="`${item.code}を非表示にする`"
            />
          </label>

          <span class="item-code">
            {{ item.code }}
          </span>

          <input
            v-model="item.shoukoumoku"
            type="text"
            class="input-field item-input"
            placeholder="小項目名を入力"
            @input="changeItem(item)"
            :class="{ disabled: item.disabled }"
          />

          <span
            v-if="item.disabled"
            class="hidden-label"
          >
            非表示
          </span>
        </div>
      </div>

      <!-- 小項目追加 -->
      <button
        class="add-item-button"
        type="button"
        @click="addItem(category)"
        :disabled="category.items.length >= 10"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>

        小項目を追加

        <span class="add-count">
          {{ category.items.length }}/10
        </span>
      </button>
    </div>

    <!-- データなし -->
    <div
      v-if="categories.length === 0"
      class="empty-state"
    >
      <p>登録されている科目はありません。</p>
    </div>

    <!-- 画面下部の保存ボタン -->
    <div class="bottom-save">
      <button
        class="btn btn-lg save-button"
        type="button"
        @click="saveAll"
        :disabled="loading"
      >
        保存する
      </button>
    </div>

  </div>
</template>

<style scoped>
/* ========================================
   科目設定画面
   共通カラー・サイズはBase.cssを使用
======================================== */

.settings-wrapper {
  width: 100%;
  max-width: var(--content-width);
  min-width: 0;
  margin: 0 auto;
  padding: var(--space-3) 0 var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* ヘッダー */
.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-width: 0;
}

.settings-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.title-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--color-surface-soft);
  color: var(--color-coffee);
}

.settings-title h1 {
  margin: 0;
  font-size: 22px;
}

.settings-description {
  margin: 3px 0 0;
  color: var(--color-muted);
  font-size: 12px;
}

.save-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  flex: 0 0 auto;
  width: auto;
  min-width: 112px;
  min-height: 44px;
  margin: 0;
  padding: 9px 14px;
  white-space: nowrap;
}

/* 説明エリア */
.settings-help {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-soft);
}

.settings-help p {
  margin: 0;
  color: var(--color-muted);
  font-size: 13px;
  line-height: 1.6;
}

.settings-help p + p {
  margin-top: 4px;
}

.settings-help strong {
  color: var(--color-coffee-dark);
}

/* タブ */
.category-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
  margin: 0;
}

.category-tabs .tab-btn {
  min-height: 46px;
  padding: 9px 5px;
  white-space: nowrap;
}

/* 大項目カード */
.category-card {
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.category-heading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.category-code {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-width: 38px;
  min-height: 28px;
  padding: 3px 7px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-soft);
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.category-heading h2 {
  min-width: 0;
  margin: 0;
  color: var(--color-coffee-dark);
  font-size: 17px;
}

.lock-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  color: var(--color-muted);
}

/* 小項目 */
.item-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.item-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.visibility-control {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 24px;
  width: 24px;
  min-height: 40px;
  cursor: pointer;
}

.visibility-control input {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--color-coffee);
  cursor: pointer;
}

.item-code {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 42px;
  min-height: 40px;
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.item-input {
  flex: 1 1 auto;
  width: 0;
  min-width: 0;
  min-height: 42px;
  margin: 0;
  padding: 9px 11px;
}

.item-input.disabled {
  background: var(--color-surface-soft);
  color: var(--color-muted);
}

.hidden-label {
  flex: 0 0 auto;
  color: var(--color-muted);
  font-size: 11px;
  white-space: nowrap;
}

/* 非表示項目 */
.item-hidden {
  opacity: 0.85;
}

.item-hidden .item-input {
  background: var(--color-surface-soft);
  color: var(--color-muted);
  border-color: var(--color-border);
}

.item-hidden .item-code {
  color: var(--color-muted);
}


/* 小項目追加ボタン */
.add-item-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  min-height: 44px;
  padding: 9px 12px;

  border: 1px dashed var(--color-yellow);
  border-radius: var(--radius-md);

  background: var(--color-yellow-soft);
  color: var(--color-coffee-dark);

  font-size: 14px;
  font-weight: 700;

  transition:
    background-color .16s ease,
    border-color .16s ease;
}

.add-item-button:hover:not(:disabled) {
  background: var(--color-accent-light);
  border-color: var(--color-beige-hover);
}

.add-item-button:disabled {
  opacity: .45;
  cursor: not-allowed;
}

.add-count {
  margin-left: auto;
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 600;
}

/* データなし */
.empty-state {
  padding: var(--space-6) var(--space-3);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-muted);
  text-align: center;
}

/* 下部保存 */
.bottom-save {
  padding-top: var(--space-2);
}

.bottom-save .save-button {
  width: 100%;
}

/* スマートフォン */
@media (max-width: 420px) {
  .settings-wrapper {
    gap: var(--space-3);
    padding-top: var(--space-2);
  }

  .settings-header {
    align-items: flex-start;
  }

  .settings-title {
    gap: var(--space-2);
  }

  .title-icon {
    flex-basis: 38px;
    width: 38px;
    height: 38px;
  }

  .settings-title h1 {
    font-size: 20px;
  }

  .settings-description {
    font-size: 11px;
  }

  .settings-header .save-button {
    min-width: 94px;
    min-height: 40px;
    padding: 8px 10px;
    font-size: 13px;
  }

  .category-card {
    padding: var(--space-3);
  }

  .category-heading h2 {
    font-size: 16px;
  }

  .item-row {
    gap: 5px;
  }

  .item-code {
    flex-basis: 36px;
    font-size: 12px;
  }

  .item-input {
    min-height: 42px;
    padding: 8px;
    font-size: 15px;
  }

  .hidden-label {
    font-size: 10px;
  }
}

@media (max-width: 340px) {
  .settings-header {
    flex-wrap: wrap;
  }

  .settings-header .save-button {
    width: 100%;
  }

  .category-tabs {
    gap: 5px;
  }

  .category-tabs .tab-btn {
    font-size: 12px;
  }
}
</style>