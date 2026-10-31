
<template>
  <main class="container list-page">

    <!-- 画面タイトル -->
    <h1 class="list-title">
      <Search :size="25" :stroke-width="2.2" aria-hidden="true" />
      <span>検索</span>
    </h1>

    <!-- 検索条件 -->
    <section class="card search-form-card">

      <div class="search-guide">
        <div class="search-guide-title">
          検索条件を入力してください
        </div>
        <div class="search-guide-description">
          すべて空白のときは新しいものから順に表示します
        </div>
      </div>

      <!-- 期間 -->
      <div class="search-form-row search-period-row">
        <label class="form-label">期間</label>

        <div class="period-inputs">
          <input
            type="date"
            v-model="periodStart"
            class="input-field"
            aria-label="開始日"
          />

          <span class="period-separator">〜</span>

          <input
            type="date"
            v-model="periodEnd"
            class="input-field"
            aria-label="終了日"
          />
        </div>
      </div>

      <!-- 大項目 -->
      <div class="search-form-row">
        <label class="form-label">大項目</label>

        <select v-model="large" class="select-field">
          <option value="">（すべて）</option>
          <option
            v-for="item in categoriesLarge"
            :key="item"
            :value="item"
          >
            {{ item }}
          </option>
        </select>
      </div>

      <!-- 小項目 -->
      <div class="search-form-row">
        <label class="form-label">小項目</label>

        <select v-model="small" class="select-field">
          <option value="">（すべて）</option>
          <option
            v-for="item in categoriesSmall"
            :key="item"
            :value="item"
          >
            {{ item }}
          </option>
        </select>
      </div>

      <!-- キーワード -->
      <div class="search-form-row">
        <label class="form-label">キーワード</label>

        <input
          type="text"
          v-model="keyword"
          class="input-field"
          placeholder="店名・メモを入力"
        />
      </div>

      <!-- 表示ボタン -->
      <div class="search-actions">
        <button
          type="button"
          class="btn btn-lg"
          @click="fetchList"
          :disabled="isLoading"
        >
          検索
        </button>
      </div>

    </section>

    <!-- ローディング -->
    <div class="loading-area">
      <LoadingIcon :show="isLoading" v-show="isLoading" />
    </div>

    <LoadingIcon
      :show="globalLoading"
      v-show="globalLoading"
    />

    <!-- 一覧 -->
    <section class="transaction-list">

      <article
        v-for="item in list"
        :key="item.id"
        class="card transaction-card"
        :class="{ unchecked: item.check === false }"
      >

        <!-- 左側：チェックと更新ボタン -->
        <div class="transaction-check-area">

          <template v-if="item.check === false">

            <input
              type="checkbox"
              class="transaction-checkbox"
              :checked="selectedCheckId === item.id"
              :aria-label="`${formatDate(item.date)}の確認チェック`"
              @change="selectedCheckId = $event.target.checked ? item.id : null"
            />

            <!-- チェックを入れたときだけ表示 -->
            <button
              v-if="selectedCheckId === item.id"
              type="button"
              class="btn-red btn-sm check-update-btn"
              @click.stop="updateCheck(item.id)"
              :disabled="isLoading"
            >
              更新
            </button>

          </template>

        </div>

        <!-- 右側：内容を押すと修正画面へ -->
        <button
          type="button"
          class="transaction-edit-area"
          @click="goEdit(item)"
          :aria-label="`${formatDate(item.date)} ${item.large} ${item.small} ${formatAmount(item.amount)}円を修正`"
        >

          <!-- 1段目：日付 -->
          <div class="transaction-date-row">
            <span class="transaction-date">
              {{ formatDate(item.date) }}
            </span>
          </div>

          <!-- 2段目：科目・金額・矢印 -->
          <div class="transaction-main-row">

            <div class="transaction-category">
              <span>{{ item.large }}</span>
              <span class="category-separator">_</span>
              <span>{{ item.small }}</span>
            </div>

            <div
              class="transaction-amount"
              :class="{
                'amount-negative': Number(item.amount) < 0
              }"
            >
              {{ formatAmount(item.amount) }}円
            </div>

            <ChevronRight
              class="transaction-chevron"
              :size="20"
              :stroke-width="2"
              aria-hidden="true"
            />

          </div>

          <!-- 3段目：相手・内容 -->
          <div class="transaction-sub-row">

            <div
              v-if="item.shop"
              class="transaction-shop"
            >
              {{ item.shop }}
            </div>

            <div
              v-if="item.naiyo"
              class="transaction-description"
            >
              {{ item.naiyo }}
            </div>

          </div>

          <!-- 4段目：ペア側の科目 -->
          <div
            v-if="item.counterpart"
            class="transaction-counterpart"
          >
            <span>
              {{ item.counterpart.large || '大項目なし' }}
            </span>
            <span class="category-separator">_</span>
            <span>
              {{ item.counterpart.small || '小項目なし' }}
            </span>
          </div>

        </button>

      </article>

      <!-- 該当データなし -->
      <p
        v-if="!isLoading && list.length === 0"
        class="empty-list-message"
      >
        条件に一致するデータがありません。
      </p>

    </section>

  </main>
</template>


<script setup>
import { ref, computed, watch, onMounted } from "vue"
import { Search, ChevronRight } from "lucide-vue-next"

import { GAS_URL } from "@/constants/index.js"
import { globalLoading } from "@/stores/loadingStore"

import { fetchCategories } from "@/services/categories.js"
import LoadingIcon from "@/components/LoadingIcon.vue"

import { useRoute, useRouter } from "vue-router"


const route = useRoute()
const router = useRouter()


// ----------------------------------
// 状態
// ----------------------------------

// 未確認データだけを検索するか
const uncheckedOnly = ref(false)

// ローディング
const isLoading = ref(false)

// 検索条件
const periodStart = ref("")
const periodEnd = ref("")
const large = ref("")
const small = ref("")
const keyword = ref("")

// チェック選択中のID
const selectedCheckId = ref(null)

// 一覧データ
const list = ref([])


// ----------------------------------
// カテゴリ取得
// ----------------------------------

const categoriesData = ref([])

fetchCategories()
  .then(data => {
    categoriesData.value = data
  })
  .catch(error => {
    console.error("カテゴリ取得エラー", error)
  })


// 開始日がクリアされたら終了日もクリア
watch(periodStart, (value) => {
  if (!value) {
    periodEnd.value = ""
  }
})

// 終了日がクリアされたら開始日もクリア
watch(periodEnd, (value) => {
  if (!value) {
    periodStart.value = ""
  }
})


// 大項目一覧
const categoriesLarge = computed(() => {
  if (!Array.isArray(categoriesData.value)) return []

  const row = categoriesData.value.find(
    item => item.large === "大項目"
  )

  return row ? row.small : []
})


// 小項目を先に選んだ時は大項目を自動補完
watch(small, (newSmall) => {
  if (!newSmall) return
  if (!Array.isArray(categoriesData.value)) return

  const found = categoriesData.value.find(item =>
    item.small.includes(newSmall)
  )

  if (found) {
    large.value = found.large
  }
})


// 小項目一覧
const categoriesSmall = computed(() => {
  const data = categoriesData.value

  if (!Array.isArray(data)) return []

  if (!large.value) {
    return [
      ...new Set(
        data
          .filter(item => item.large !== "大項目")
          .flatMap(item => item.small)
      )
    ]
  }

  const found = data.find(
    item => item.large === large.value
  )

  return found ? found.small : []
})


// ----------------------------------
// 日付・金額表示
// ----------------------------------

// 日付を YYYY/MM/DD に変換
function formatDate(dateStr) {
  if (!dateStr) return ""

  const d = new Date(dateStr)

  if (Number.isNaN(d.getTime())) {
    return String(dateStr)
  }

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")

  return `${year}/${month}/${day}`
}


// 金額表示
function formatAmount(amount) {
  const value = Number(amount)

  if (!Number.isFinite(value)) {
    return String(amount ?? "")
  }

  return value.toLocaleString("ja-JP")
}


// ----------------------------------
// 初期表示
// ----------------------------------

onMounted(async () => {

  // HOME画面から条件が渡された場合
  if (route.query.start && route.query.end) {

    periodStart.value = String(route.query.start)
    periodEnd.value = String(route.query.end)

    uncheckedOnly.value =
      route.query.unchecked === "true"

    // 条件をセットして自動検索
    await fetchList()

    console.log("検索条件", {
      start: periodStart.value,
      end: periodEnd.value,
      unchecked: uncheckedOnly.value
    })
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        globalLoading.value = false
      }, 500)
    })
  })

})


// ----------------------------------
// 一覧取得
// ----------------------------------

const fetchList = async () => {

  isLoading.value = true
  list.value = []
  selectedCheckId.value = null

  const params = new URLSearchParams({
    list: "sortlist",
    start: periodStart.value,
    end: periodEnd.value,
    big: large.value,
    small: small.value,
    keyword: keyword.value,
    unchecked: uncheckedOnly.value ? "true" : "false"
  })

  try {

    const res = await fetch(`${GAS_URL}?${params}`)

    if (!res.ok) {
      throw new Error(`HTTPエラー: ${res.status}`)
    }

    const data = await res.json()

    list.value = Array.isArray(data) ? data : []

  } catch (e) {

    console.error("一覧取得エラー", e)
    alert("一覧データの取得に失敗しました")

  } finally {

    isLoading.value = false

  }

}


// ----------------------------------
// チェック更新（Vue → GAS）
// ----------------------------------

const updateCheck = async (id) => {

  if (id == null) {
    alert("更新するデータがありません")
    return
  }

  isLoading.value = true
  console.log("id="+id);

  try {
    const payload = new URLSearchParams()
    payload.append("mode", "updateCheck")
    payload.append("id", id)

    const res = await fetch(GAS_URL, {
      method: "POST",
      body: payload
    })
    
    const result = await res.json()

    alert(result.message)
    console.log(result.message)
    router.push(
      jump === "reconciliation"
        ? "/reconciliation"
        : "/list"
    )

  } catch (e) {
    alert("修正に失敗しました" + e.message)
  } finally {
    isLoading.value = false
  }
}


// ----------------------------------
// 修正画面へ移動
// ----------------------------------

const goEdit = (item) => {
  router.push({
    name: "edit",
    query: {
      id: item.id
    }
  })
}

</script>


<style scoped>

/* ==================================
   画面全体
================================== */

.list-page {
  width: 100%;
  max-width: var(--content-width);
  margin: 0 auto;
  padding-bottom: var(--space-4);
}


/* タイトル */

.list-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.list-title svg {
  flex-shrink: 0;
  color: var(--color-coffee);
}


/* ==================================
   検索フォーム
================================== */

.search-form-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.search-form-row {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  min-width: 0;
  padding: 8px 0;
}

.search-form-row > .form-label {
  flex: 0 0 76px;
  margin: 0;
  white-space: nowrap;
}

.search-form-row > .input-field,
.search-form-row > .select-field {
  flex: 1 1 0;
  width: 100%;
  min-width: 0;
  margin: 0;
}

/*　説明文 */
.search-guide {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: var(--space-2);
}

.search-guide-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
}

.search-guide-description {
  font-size: 12px;
  color: var(--color-muted);
}

/* 期間 */

.period-inputs {
  display: flex;
  align-items: center;
  flex: 1 1 0;
  min-width: 0;
  gap: var(--space-2);
}

.period-inputs .input-field {
  flex: 1 1 0;
  width: 100%;
  min-width: 0;
  margin: 0;
  padding-left: 8px;
  padding-right: 8px;
}

.period-separator {
  flex: 0 0 auto;
  white-space: nowrap;
  color: var(--color-muted);
}


/* 表示ボタン */

.search-actions {
  margin-top: var(--space-3);
}

.search-actions .btn {
  width: 100%;
  margin: 0;
}


/* ==================================
   一覧
================================== */

.transaction-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
  max-width: var(--content-width);
  margin: 0 auto;
}


/* 一覧カード */

.transaction-card {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: stretch;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-3);
  margin-bottom: 0;
}


/* 未確認データ */

.transaction-card.unchecked {
  border-left: 4px solid var(--color-danger);
  background: var(--color-danger-bg);
}


/* ==================================
   チェックエリア
================================== */

.transaction-check-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: var(--space-3);
  padding-top: 2px;
  min-width: 0;
}

.transaction-checkbox {
  width: 20px;
  height: 20px;
  margin: 0;
  accent-color: var(--color-coffee);
  cursor: pointer;
}

.check-update-btn {
  width: 100%;
  min-width: 40px;
  min-height: 32px;
  padding: 5px 4px;
  margin: 0;
  font-size: 12px;
}


/* ==================================
   修正画面へのクリック領域
================================== */

.transaction-edit-area {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 5px;
  width: 100%;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.transaction-edit-area:focus-visible {
  outline: 2px solid var(--color-coffee);
  outline-offset: 4px;
}


/* 1段目：日付 */

.transaction-date-row {
  display: flex;
  align-items: center;
  min-width: 0;
}

.transaction-date {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}


/* 2段目：科目・金額・矢印 */

.transaction-main-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 20px;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.transaction-category {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  min-width: 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.category-separator {
  padding: 0 3px;
  color: var(--color-muted);
}

.transaction-amount {
  flex-shrink: 0;
  white-space: nowrap;
  text-align: right;
  font-size: 15px;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}

.transaction-chevron {
  flex-shrink: 0;
  color: var(--color-muted);
}


/* 3段目：相手・内容 */

.transaction-sub-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding-left: 2px;
}

.transaction-shop,
.transaction-description {
  min-width: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--color-text);
  overflow-wrap: anywhere;
}

.transaction-description {
  color: var(--color-muted);
}


/* 4段目：ペア側の科目 */

.transaction-counterpart {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  min-width: 0;
  padding-left: 2px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--color-muted);
  overflow-wrap: anywhere;
}


/* データなし */

.empty-list-message {
  padding: var(--space-5);
  text-align: center;
  color: var(--color-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}


/* ==================================
   スマートフォン
================================== */

@media (max-width: 420px) {

  .search-form-row {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
  }

  .search-form-row > .form-label {
    flex: none;
    align-self: flex-start;
  }

  /* 日付2つはスマホでも横並び */
  .search-period-row .period-inputs {
    width: 100%;
    flex: none;
  }

  .period-inputs .input-field {
    min-height: 44px;
    padding: 8px 4px;
    font-size: 13px;
  }

  .transaction-card {
    grid-template-columns: 38px minmax(0, 1fr);
    gap: var(--space-2);
    padding: 12px;
  }

  .transaction-main-row {
    gap: 5px;
  }

  .transaction-category {
    font-size: 13px;
  }

  .transaction-amount {
    font-size: 14px;
  }

}

</style>
