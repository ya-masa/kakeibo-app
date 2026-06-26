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
        <span>{{ monthly.income + monthly.expense }} 円</span>
      </div>
    </section>

    <!-- 今月の支出（円グラフ＋大項目） -->
    <section class="card">
      <div class="toggle-header" @click="showExpense = !showExpense">
        <h2>今月の支出</h2>
        <button class="toggle-btn">{{ showExpense ? '－' : '＋' }}</button>
      </div>

      <!-- 円グラフ（後で実装） -->
      <div class="chart-placeholder">
        <PieChart
          :labels="expenseSummary.map(i => i.name)"
          :values="expenseSummary.map(i =>  Math.abs(i.amount))"
        />
      </div>

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
import { ref, onMounted } from "vue"
import { GAS_URL } from "@/constants/index.js"
import loadingStore from "@/stores/loadingStore"
import PieChart from "@/components/PieChart.vue"


// ▼ ホーム画面で使うデータ
const monthly = ref({
  income: 0,
  expense: 0
})

const expenseSummary = ref([])       // 大項目
const expenseSubSummary = ref([])    // 小項目
const accounts = ref([])             // 大項目（口座）
const accountSubs = ref([])          // 小項目（口座）

// ▼ 今月の開始日・終了日
function getMonthStart() {
  const now = new Date()
  return `${now.getFullYear()}/${String(now.getMonth() + 1)}/1`
}

function getMonthEnd() {
  const now = new Date()
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return `${last.getFullYear()}/${String(last.getMonth() + 1)}/${String(last.getDate())}`
}

// ▼ GAS から今月のデータを取得
const list = ref([])

async function fetchThisMonth() {
  const params = new URLSearchParams({
    list: "homelist",
    start: getMonthStart(),
    end: getMonthEnd()
  })

  const res = await fetch(`${GAS_URL}?${params}`)
  list.value = await res.json()
  console.log ("データ:", list.value)
}

// ▼ 収入・支出の集計
function calcMonthly() {
  const income = list.value
    .filter(i => i.group === "4_収入")
    .reduce((sum, i) => sum + Number(i.amount), 0)

  const expense = list.value
    .filter(i => i.group === "5_支出")
    .reduce((sum, i) => sum + Number(i.amount), 0)

  monthly.value.income = income
  monthly.value.expense = expense
}

// ▼ 支出の大項目・小項目集計
function calcExpenseSummary() {
  const big = {}
  const small = {}

  list.value
    .filter(i => i.group === "5_支出")
    .forEach(i => {
      big[i.large] = (big[i.large] || 0) + Number(i.amount)
      small[i.small] = (small[i.small] || 0) + Number(i.amount)
    })

  // ▼ 金額の大きい順に並べ替え
  expenseSummary.value = Object.entries(big)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => a.amount - b.amount)

  expenseSubSummary.value = Object.entries(small)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => a.amount - b.amount)
}


// ▼ 口座残高の集計
function calcAccounts() {
  const big = {}
  const small = {}

  list.value
    .filter(i => ["1_資産", "2_負債"].includes(i.group))
    .forEach(i => {
      big[i.large] = (big[i.large] || 0) + Number(i.amount)
      small[i.small] = (small[i.small] || 0) + Number(i.amount)
    })

  // ▼ kamokuCD の順に並べ替え
  accounts.value = Object.entries(big)
    .map(([name, amount]) => {
      const item = list.value.find(i => i.large === name)
      return {
        name,
        amount,
        kamokuCD: item?.kamokuCD ?? 9999
      }
    })
    .sort((a, b) => a.kamokuCD - b.kamokuCD)

  accountSubs.value = Object.entries(small)
    .map(([name, amount]) => {
      const item = list.value.find(i => i.small === name)
      return {
        name,
        amount,
        kamokuCD: item?.kamokuCD ?? 9999
      }
    })
    .sort((a, b) => a.kamokuCD - b.kamokuCD)
}


// ▼ mounted
onMounted(async () => {
  await fetchThisMonth()
  calcMonthly()
  calcExpenseSummary()
  calcAccounts()

  setTimeout(() => {
    loadingStore.globalLoading.value = false
  }, 500)
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