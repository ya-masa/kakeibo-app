
<script setup>
import { ref, computed, onMounted } from 'vue'
import { GAS_URL } from '@/constants/index.js'
import loadingStore from '@/stores/loadingStore'

/* GASから取得した生データ */
const rawList = ref([])

/* モード：100=資産, 200=負債, 400=収入, 500=支出 */
const mode = ref(500)

/* 展開中の小項目コード */
const openedCode = ref(null)

/* GASから一覧データ取得 */
onMounted(async () => {
  try {
    const res = await fetch(`${GAS_URL}?list=ALLLIST`)
    const all = await res.json()

    rawList.value = all
    console.log('ALLLIST:', all)
  } catch (e) {
    console.error('店舗設定データの取得に失敗しました:', e)
    alert('店舗設定データの取得に失敗しました。')
  } finally {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          loadingStore.globalLoading.value = false
        }, 10)
      })
    })
  }
})

/* モードに応じて group を決める */
const modeGroup = computed(() => {
  if (mode.value === 100) return '1_資産'
  if (mode.value === 200) return '2_負債'
  if (mode.value === 400) return '4_収入'
  if (mode.value === 500) return '5_支出'
  return ''
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
      group: item.group,
      daikoumoku: item.daikoumoku,
      shoukoumoku: item.shoukoumoku,
      disabled: item.hihyouji === true,
      order: item.hihyouji === true ? null : item.hihyouji,
      shops: normalizeShops(item.shops ?? [])
    })
  })

  /* 小項目をコード順に並べ替え */
  Object.values(map).forEach(category => {
    category.items.sort((a, b) => a.code - b.code)
  })

  /* 大項目をコード順に並べ替え */
  return Object.values(map).sort(
    (a, b) => a.daikoumokuCode - b.daikoumokuCode
  )
})

/* 小項目の展開・折りたたみ */
const toggle = (code) => {
  openedCode.value = openedCode.value === code ? null : code
}

/* 店舗情報の更新 */
const update = async (item) => {
  loadingStore.globalLoading.value = true

  try {
    const payload = new URLSearchParams()

    payload.append('mode', 'shops')
    payload.append('code', item.code)
    payload.append('group', modeGroup.value)
    payload.append('daikoumoku', item.daikoumoku)
    payload.append('shoukoumoku', item.shoukoumoku)
    payload.append('hihyouji', item.disabled ? true : false)
    payload.append('shops', JSON.stringify(item.shops))

    const res = await fetch(`${GAS_URL}?mode=shops`, {
      method: 'POST',
      body: payload
    })

    const result = await res.json()
    alert(result.message)

    /* 更新成功 */
    item.dirty = false

  } catch (e) {
    alert('更新に失敗しました: ' + e.message)
  } finally {
    loadingStore.globalLoading.value = false
  }
}

/* 店舗名を10件分に統一 */
function normalizeShops(shops) {
  const result = []

  for (let i = 0; i < 10; i++) {
    result.push(shops[i] || '')
  }

  return result
}
</script>

<template>
  <div class="settings-wrapper">

    <!-- 資産・負債・収入・支出タブ -->
    <div class="tabs">
      <button
        class="tab-btn"
        :class="{ active: mode === 100 }"
        @click="mode = 100"
      >
        資産
      </button>

      <button
        class="tab-btn"
        :class="{ active: mode === 200 }"
        @click="mode = 200"
      >
        負債
      </button>

      <button
        class="tab-btn"
        :class="{ active: mode === 400 }"
        @click="mode = 400"
      >
        収入
      </button>

      <button
        class="tab-btn"
        :class="{ active: mode === 500 }"
        @click="mode = 500"
      >
        支出
      </button>
    </div>

    <!-- 大項目ごとのカード -->
    <div
      v-for="category in categories"
      :key="category.daikoumoku"
      class="card category-card"
    >
      <div class="card-header">
        <h3>{{ category.daikoumoku }}</h3>
        <span class="lock">🔒</span>
      </div>

      <div class="item-area">

        <!-- 小項目 -->
        <div
          v-for="item in category.items"
          :key="item.code"
          class="item-list"
        >
          <div class="item-row">
            <span class="item-code">
              {{ item.code }}
            </span>

            <span class="item-name">
              {{ item.shoukoumoku }}
            </span>

            <button
              type="button"
              class="toggle-btn"
              :aria-label="openedCode === item.code ? '店舗設定を閉じる' : '店舗設定を開く'"
              @click="toggle(item.code)"
            >
              {{ openedCode === item.code ? '－' : '＋' }}
            </button>
          </div>

          <!-- 店舗入力エリア -->
          <div
            v-if="openedCode === item.code"
            class="shop-area"
          >
            <div class="shop-area-header">
              <span class="shop-area-title">
                店舗名・ショップ名
              </span>
              <span class="shop-area-count">
                最大10件
              </span>
            </div>

            <div class="shop-input-list">
              <div
                v-for="(shop, sIndex) in item.shops"
                :key="sIndex"
                class="shop-row"
              >
                <span class="shop-number">
                  {{ sIndex + 1 }}
                </span>

                <input
                  v-model="item.shops[sIndex]"
                  type="text"
                  :placeholder="`店舗名 ${sIndex + 1}`"
                  class="input-field shop-input"
                />
              </div>
            </div>

            <div class="shop-actions">
              <button
                type="button"
                class="btn btn-md update-button"
                @click="update(item)"
              >
                更新
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- データがない場合 -->
    <div
      v-if="categories.length === 0"
      class="empty-message"
    >
      登録されている項目はありません。
    </div>

  </div>
</template>

<style scoped>
.settings-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: 100%;
  max-width: var(--content-width);
  min-width: 0;
  margin: 0 auto;
  padding: var(--space-2) 0;
}

/* タブ */
.tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
  width: 100%;
}

/* 大項目カード */
.category-card {
  margin-bottom: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.card-header h3 {
  min-width: 0;
  margin: 0;
  color: var(--color-coffee-dark);
  font-size: 16px;
  font-weight: 750;
}

.lock {
  flex-shrink: 0;
  opacity: 0.6;
  font-size: 14px;
}

/* 小項目一覧 */
.item-area {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
  min-width: 0;
}

.item-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  border-bottom: 1px solid var(--color-border);
}

.item-list:last-child {
  border-bottom: 0;
}

/* 小項目の行 */
.item-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-width: 0;
  min-height: 48px;
  padding: 4px 0;
}

.item-code {
  display: inline-flex;
  flex: 0 0 42px;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-soft);
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.item-name {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

/* ＋／－ボタン */
.item-row .toggle-btn {
  flex: 0 0 40px;
}

/* 店舗入力エリア */
.shop-area {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
  min-width: 0;
  margin: 4px 0 var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-soft);
}

.shop-area-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.shop-area-title {
  color: var(--color-coffee-dark);
  font-size: 13px;
  font-weight: 750;
}

.shop-area-count {
  flex-shrink: 0;
  color: var(--color-muted);
  font-size: 11px;
}

/* 店舗入力行 */
.shop-input-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
  min-width: 0;
}

.shop-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-width: 0;
}

.shop-number {
  display: inline-flex;
  flex: 0 0 24px;
  align-items: center;
  justify-content: center;
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.shop-input {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: 42px;
  margin: 0;
  padding: 9px 11px;
  background: var(--color-surface);
  font-size: 14px;
}

/* 更新ボタン */
.shop-actions {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}

.update-button {
  min-width: 100px;
  margin: 0;
}

/* 小項目がない場合 */
.empty-message {
  padding: var(--space-6) var(--space-3);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-muted);
  text-align: center;
  font-size: 14px;
}

/* スマートフォン */
@media (max-width: 420px) {
  .settings-wrapper {
    gap: var(--space-3);
  }

  .tabs {
    gap: 5px;
  }

  .shop-area {
    padding: 10px;
  }

  .item-row {
    gap: 6px;
  }

  .item-code {
    flex-basis: 40px;
  }
}
</style>
