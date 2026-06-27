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
      </div>

      <!-- 円グラフ -->
      <div class="chart-placeholder">
        <PieChart
          :labels="labels"
          :values="values"
          @update:colors="chartColors = $event"
        />
      </div>

      <!-- 大項目の一覧 -->
      <div v-for="(item, i) in expenseSummary" :key="i" class="row">
        <span
          class="dot"
          :style="{ backgroundColor: chartColors[i] }"
        ></span>
        <span>{{ item.name }}</span>
        <button class="toggle-btn">{{ showExpense ? '－' : '＋' }}</button>
        <span>{{ item.amount }}円</span>
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

      <div v-for="acc in accounts" :key="acc.name" class="row">
        <span>{{ acc.name }}</span>
        <span>{{ acc.amount }} 円</span>
      </div>

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

const showExpense = ref(false)
const showBalance = ref(false)

const monthly = ref({ income: 0, expense: 0 })
const expenseSummary = ref([])
const expenseSubSummary = ref([])
const accounts = ref([])
const accountSubs = ref([])

function getMonthStart() {
  const now = new Date()
  return `${now.getFullYear()}/${String(now.getMonth() + 1)}/1`
}

function getMonthEnd() {
  const now = new Date()
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return `${last.getFullYear()}/${String(last.getMonth() + 1)}/${String(last.getDate())}`
}

const list = ref([])

async function fetchThisMonth() {
  const params = new URLSearchParams({
    list: "homelist",
    start: getMonthStart(),
    end: getMonthEnd()
  })

  const res = await fetch(`${GAS_URL}?${params}`)
  list.value = await res.json()
}

function calcMonthly() {
  monthly.value.income = list.value
    .filter(item => item.group === "4_収入")
    .reduce((sum, item) => sum + Number(item.amount), 0)

  monthly.value.expense = list.value
    .filter(item => item.group === "5_支出")
    .reduce((sum, item) => sum + Number(item.amount), 0)
}

function calcExpenseSummary() {
  const big = {}
  const small = {}

  list.value
    .filter(item => item.group === "5_支出")
    .forEach(item => {
      const amount = Number(item.amount ?? 0)
      big[item.large] = (big[item.large] || 0) + amount
      small[item.small] = (small[item.small] || 0) + amount
    })

  expenseSummary.value = Object.entries(big)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => a.amount - b.amount)

  expenseSubSummary.value = Object.entries(small)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => a.amount - b.amount)
}

function calcAccounts() {
  const big = {}
  const small = {}
  console.log("expenseSummary:", expenseSummary.value)
console.log("labels for chart:", expenseSummary.value.map(i => i.name))
console.log("values for chart:", expenseSummary.value.map(i => Math.abs(i.amount)))


  list.value
    .filter(item => ["1_資産", "2_負債"].includes(item.group))
    .forEach(item => {
      big[item.large] = (big[item.large] || 0) + Number(item.amount)
      small[item.small] = (small[item.small] || 0) + Number(item.amount)
    })

  accounts.value = Object.entries(big)
    .map(([name, amount]) => {
      const item = list.value.find(i => i.large === name)
      return { name, amount, kamokuCD: item?.kamokuCD ?? 9999 }
    })
    .sort((a, b) => a.kamokuCD - b.kamokuCD)

  accountSubs.value = Object.entries(small)
    .map(([name, amount]) => {
      const item = list.value.find(i => i.small === name)
      return { name, amount, kamokuCD: item?.kamokuCD ?? 9999 }
    })
    .sort((a, b) => a.kamokuCD - b.kamokuCD)
}

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

<style>
.chart-placeholder {
  height: 240px;
  position: relative;
}
</style>




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

/*丸のCSS */
.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
}
</style>