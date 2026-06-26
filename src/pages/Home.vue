<template>
  <div class="has-footer">

    <!-- 今月の収支 -->
    <section class="card">
      <h2>今月の収支</h2>
      <div class="row">
        <span>収入</span>
        <span>{{ monthly.income }} 円</span>
      </div>
      <div class="row">
        <span>支出</span>
        <span>{{ monthly.expense }} 円</span>
      </div>
      <div class="row total">
        <span>差額</span>
        <span>{{ monthly.income - monthly.expense }} 円</span>
      </div>
    </section>

    <!-- 今月の支出（円グラフ＋大項目） -->
    <section class="card">
      <div class="toggle-header" @click="showExpense = !showExpense">
        <h2>今月の支出</h2>
        <button class="toggle-btn">{{ showExpense ? '－' : '＋' }}</button>
      </div>

      <!-- 円グラフ（後で実装） -->
      <div class="chart-placeholder">円グラフが入る</div>

      <!-- 大項目の一覧 -->
      <div v-for="item in expenseSummary" :key="item.name" class="row">
        <span>{{ item.name }}</span>
        <span>{{ item.amount }} 円</span>
      </div>

      <!-- 小項目（開閉） -->
      <div v-if="showExpense" class="sub-list">
        <div
          v-for="sub in expenseSubSummary"
          :key="sub.name"
          class="row sub"
        >
          <span>{{ sub.name }}</span>
          <span>{{ sub.amount }} 円</span>
        </div>
      </div>
    </section>

    <!-- 口座残高 -->
    <section class="card">
      <div class="toggle-header" @click="showBalance = !showBalance">
        <h2>口座残高</h2>
        <button class="toggle-btn">{{ showBalance ? '－' : '＋' }}</button>
      </div>

      <!-- 大項目の口座 -->
      <div v-for="acc in accounts" :key="acc.name" class="row">
        <span>{{ acc.name }}</span>
        <span>{{ acc.amount }} 円</span>
      </div>

      <!-- 小項目（開閉） -->
      <div v-if="showBalance" class="sub-list">
        <div
          v-for="sub in accountSubs"
          :key="sub.name"
          class="row sub"
        >
          <span>{{ sub.name }}</span>
          <span>{{ sub.amount }} 円</span>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, watch ,onMounted} from "vue"
import { GAS_URL } from "@/constants/index.js"
import loadingStore from "@/stores/loadingStore"
import { fetchCategories } from "@/services/categories.js"
import LoadingIcon from "@/components/LoadingIcon.vue"
import AppLinks from '@/components/AppLinks.vue'

// ローディング
const isLoading = ref(false)

/* GASから一覧データ取得 */

// 入力項目
const periodStart = ref("")
const periodEnd = ref("")
const large = ref("")
const small = ref("")
const keyword = ref("")

// チェックされた rowNo を保持
const selectedRows = ref([])

// カテゴリ取得
const categoriesData = ref({})
fetchCategories().then(data => {
  categoriesData.value = data
})

// start日付 がクリアされたら end日付 もクリア
watch(periodStart, (value) => {
  if (!value) periodEnd.value = ""
})

// end日付 がクリアされたら start日付 もクリア
watch(periodEnd, (value) => {
  if (!value) periodStart.value = ""
})

// 大項目一覧
const categoriesLarge = computed(() => {
  if (!Array.isArray(categoriesData.value)) return []
  const row = categoriesData.value.find(item => item.large === "大項目")
  return row ? row.small : []
})

// 小項目を先に選んだ時は、大項目を自動補完
watch(small, (newSmall) => {
  if (!newSmall) return
  if (!Array.isArray(categoriesData.value)) return

  const found = categoriesData.value.find(item =>
    item.small.includes(newSmall)
  )
  if (found) large.value = found.large
})

// 小項目一覧
const categoriesSmall = computed(() => {
  const data = categoriesData.value
  if (!Array.isArray(data)) return []

  if (!large.value) {
    return [...new Set(
      data
        .filter(item => item.large !== "大項目")
        .flatMap(item => item.small)
    )]
  }
  const found = data.find(item => item.large === large.value)
  return found ? found.small : []
})

// 月初（1日）
function getMonthStart() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
}

// 月末
function getMonthEnd() {
  const now = new Date()
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`
}

// 一覧データ
const list = ref([])

// 一覧取得（検索と同じロジック）
const fetchList = async () => {
  isLoading.value = true
  list.value = []
  selectedRows.value = []

  const params = new URLSearchParams({
    list: "sortlist",
    start: periodStart.value,
    end: periodEnd.value,
    big: large.value,
    small: small.value,
    keyword: keyword.value
  })

  try {
    const res = await fetch(`${GAS_URL}?${params}`)
    const data = await res.json()
    list.value = data
  } catch (e) {
    console.error("一覧取得エラー", e)
  }
  isLoading.value = false
}

// mounted
onMounted(() => {
  // 今月の開始日・終了日を自動セット
  periodStart.value = getMonthStart()
  periodEnd.value = getMonthEnd()

  // 今月のデータを取得
  fetchList()

  // ローディング解除
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        loadingStore.globalLoading.value = false
      }, 500)
    })
  })
})
</script>


<style scoped>
/* 仮のCSS（後で base.css にまとめる） */

.home {
  padding: 16px;
  background: #f5e8d8;
}


.toggle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-btn {
  background: none;
  border: 1px solid #6b4f3f;
  color: #6b4f3f;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 18px;
}

.chart-placeholder {
  background: rgba(255,255,255,0.4);
  height: 120px;
  border-radius: 6px;
  margin: 8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>