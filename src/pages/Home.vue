<template>

  <div class="month-switch">
    <button class="nav-btn prev" @click="goPrevMonth">前月</button>

    <div class="month-label">
      {{ outputYear }} 年 {{ outputMonth }} 月
    </div>

    <button
      class="nav-btn next"
      v-if="!(outputYear === now.getFullYear() && outputMonth === now.getMonth() + 1)"
      @click="goNextMonth"
    >
      翌月
    </button>
  </div>
  <div class="has-footer">

    <!-- 今月の収支 -->
    <section class="card">
      <h2>一か月の収支</h2>
      <div class="row">
        <span>収入</span>
        <span class ="amount">{{ monthly.income }} 円</span>
      </div>
      <div class="row">
        <span>支出</span>
        <span class ="amount">{{ monthly.expense }} 円</span>
      </div>
      <div class="row total">
        <span>差額</span>
        <span class ="amount">{{ monthly.income + monthly.expense }} 円</span>
      </div>
    </section>

    <!-- 今月の支出（円グラフ＋大項目） -->
    <section class="card">
        <h2>一か月の支出</h2>
      <div class="toggle-header" @click="showExpense = !showExpense">
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
      <div v-for="(item, i) in expenseSummary" :key="i">
        <div  class="large-row">
          <!-- ＋ボタン（左寄せ） -->
          <button
            class="toggle-btn"
            @click="openLarge = openLarge === item.name ? null : item.name"
          >
            {{ openLarge === item.name ? '－' : '＋' }}
          </button>

          <!-- ● 色丸 -->
          <span class="dot" :style="{ backgroundColor: chartColors[i] }"></span>
          <!-- 大項目名 -->
          <span class="large-name">{{ item.name }}</span>

          <!-- 金額 -->
          <span class="amount">{{ item.amount }}円</span>
        </div>
        <!-- ★★★ 小項目は “大項目ループの外” に置く ★★★ -->
        <div class="sub-wrapper" v-if="openLarge === item.name">
          <div
            v-for="sub in expenseSubSummary.filter(s => s.large === item.name)"
            :key="sub.name"
            class="sub-row"
          >
            <span class="sub-name">{{ sub.name }}</span>
            <span class="sub-amount">{{ sub.amount }} 円</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 口座残高 -->
    <section class="card">
        <h2>口座残高</h2>
      <div class="toggle-header" @click="showBalance = !showBalance">
      </div>
      <div v-for="(acc, i) in accounts" :key="i">
        <div class="large-row">
          <button
            class="toggle-btn"
            @click="openKouza = openKouza === acc.name ? null : acc.name"
          >
            {{ openKouza === acc.name ? '－' : '＋' }}
          </button>
          <!-- ● 色丸（口座は色が無いなら透明でもOK） -->
          <span class="dot" style="background-color: transparent;opacity:0;"></span>
          <span class="large-name">{{ acc.name }}</span>
          <span class="amount">{{ acc.amount }} 円</span>
        </div>

        <div class="sub-wrapper" v-if="openKouza === acc.name">
          <div
            v-for="sub in accountSubs.filter(s => s.large === acc.name)"
            :key="sub.name"
            class="sub-row"
          >
            <span class="sub-name">{{ sub.name }}</span>
            <span class="sub-amount">{{ sub.amount }} 円</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, computed,watch } from "vue"
import { GAS_URL } from "@/constants/index.js"
import loadingStore from "@/stores/loadingStore"
import PieChart from "@/components/PieChart.vue"

const chartColors = ref([])

const showExpense = ref(false)
const showBalance = ref(false)

const monthly = ref({ income: 0, expense: 0 })
const expenseSummary = ref([])
const expenseSubSummary = ref([])
const accounts = ref([])
const accountSubs = ref([])
const openLarge = ref(null)
const openKouza = ref(null)


const now = new Date()

const outputYear = ref(now.getFullYear()) // 初期値＝現在の年
const outputMonth = ref(now.getMonth() + 1)   // 初期値＝当月（今なら7）

//月の開始日を計算する
function getMonthStart() {
  return `${outputYear.value}/${String(outputMonth.value)}/1`
}
//月の終了日を計算する
function getMonthEnd() {
  const last = new Date(outputYear.value, outputMonth.value, 0)
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

watch(outputMonth, async () => {
  await fetchThisMonth()
  calcMonthly()
  calcExpenseSummary()
  calcAccounts()
})

//年またぎ対応関数
function goPrevMonth() {
  if (outputMonth.value === 1) {
    outputMonth.value = 12
    outputYear.value--
  } else {
    outputMonth.value--
  }
}

function goNextMonth() {
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // 当月より先には進めない
  if (outputYear.value === currentYear && outputMonth.value === currentMonth) {
    return
  }

  if (outputMonth.value === 12) {
    outputMonth.value = 1
    outputYear.value++
  } else {
    outputMonth.value++
  }
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
  const short = {}

  list.value
    .filter(item => item.group === "5_支出")
    .forEach(item => {
      const amount = Number(item.amount ?? 0)

      // ★ large が無いデータは完全スキップ
      if (!item.large) return

      // 大項目
      big[item.large] = (big[item.large] || 0) + amount

      // ★ small が無いデータもスキップ
      if (!item.small) return

      // 小項目（large を保持）
      if (!short[item.small]) {
        short[item.small] = { amount: 0, large: item.large }
      }
      short[item.small].amount += amount
    })

  // 大項目
  expenseSummary.value = Object.entries(big)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => a.amount - b.amount)

  // 小項目（large を含む）
  expenseSubSummary.value = Object.entries(short)
    .map(([name, data]) => ({
      name,
      amount: data.amount,
      large: data.large
    }))
    .sort((a, b) => a.amount - b.amount)
}

function calcAccounts() {
  const big = {}
  const small = {}

  list.value
    .filter(item => ["1_資産", "2_負債"].includes(item.group))
    .forEach(item => {
      const amount = Number(item.amount ?? 0)

      // ★ large が無いデータはスキップ
      if (!item.large) return

      // 大項目
      if (!big[item.large]) {
        big[item.large] = { amount: 0, kamokuCD: item.kamokuCD }
      }
      big[item.large].amount += amount

      // ★ small が無いデータはスキップ
      if (!item.small) return

      // 小項目
      if (!small[item.small]) {
        small[item.small] = {
          amount: 0,
          large: item.large,
          kamokuCD: item.kamokuCD
        }
      }
      small[item.small].amount += amount
    })

  // 大項目（口座）
  accounts.value = Object.entries(big)
    .map(([name, data]) => ({
      name,
      amount: data.amount,
      kamokuCD: data.kamokuCD
    }))
    .sort((a, b) => a.kamokuCD - b.kamokuCD)

  // 小項目（口座の内訳）
  accountSubs.value = Object.entries(small)
    .map(([name, data]) => ({
      name,
      large: data.large,
      amount: data.amount,
      kamokuCD: data.kamokuCD
    }))
    .sort((a, b) => a.kamokuCD - b.kamokuCD)
}


/* ★★★ ここが超重要 ★★★ */
const labels = computed(() => expenseSummary.value.map(i => i.name))
const values = computed(() => expenseSummary.value.map(i => Math.abs(i.amount)))

onMounted(async () => {
  await fetchThisMonth()
  calcMonthly()
  console.log("accountSubs:", accountSubs.value)
  calcExpenseSummary()
  calcAccounts()
  console.log("accountSubs:", accountSubs.value)

  setTimeout(() => {
    loadingStore.globalLoading.value = false
  }, 500)
})
</script>




<style scoped>
  /* 仮のCSS 後で base.css にまとめる */

  .home {
    padding: 16px;
    background: #f5e8d8;
  }

  .row > .amount{
    margin:4px 30px;
  }
  .row{
    font-weight: bold;
    align-items: center;
  }
  .toggle-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
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
    margin-left: 25px;
  }

  .large-row {
    display: grid;
    grid-template-columns: 20px 40px 1fr auto;
    align-items: center;
    gap: 6px;
    padding: 8px 0; /* ← 上下の余白 */
    font-weight: bold;
  }

  .large-name {
    text-align: left;
    margin-left:6px;
  }

  .amount {
    text-align: right;
    margin-right:30px;
  }

  .toggle-btn {
    width: 40px;
    background: none;
    border: 1px solid #6b4f3f;
    color: #6b4f3f;
    padding: 2px 6px;
    border-radius: 6px;
    font-size: 16px;
    text-align: center;
  }

  .chart-placeholder {
    height: 240px;
    position: relative;
  }

  .sub-wrapper {
    margin:4px 10px;
  }

  .sub-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    /*border-bottom: 1px solid #eee;*/
  }
  .sub-name {
    text-align: left;
    margin-left:20px;
  }
  .sub-amount {
    text-align: right;
    margin-right:40px;
  }

</style>