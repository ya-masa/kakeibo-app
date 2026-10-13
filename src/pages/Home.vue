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


    <!-- 未確認データ -->
    <section
      class="card unchecked-card"
      :class="{ warning: uncheckedCount > 0 }"
    >
      <h2>未確認データ</h2>

      <div class="unchecked-content">
        <div class="unchecked-main">
          <span class="unchecked-count">
            {{ uncheckedCount }}件
          </span>

          <span class="unchecked-message" v-if="uncheckedCount > 0">
            まだ確認していない明細があります
          </span>

          <span class="unchecked-message" v-else>
            今月の未確認明細はありません
          </span>
        </div>

        <button
          class="unchecked-action"
        >
          タップして確認
          <span class="action-arrow">›</span>
        </button>
      </div>
    </section>


    <!-- 今日の支出 -->
    <section class="card today-expense-card">
      <div class="today-expense-header">
        <h2>今日の支出</h2>
        <span class="today-date">
          {{ now.getMonth() + 1 }}月{{ now.getDate() }}日
        </span>
      </div>

      <div class="today-expense-list">
        <div
          v-for="item in todayExpenseSummary"
          :key="item.name"
          class="today-expense-row"
        >
          <span>{{ item.name }}</span>
          <span class="amount">{{ item.amount }} 円</span>
        </div>

        <p v-if="todayExpenseTotal === 0" class="no-expense">
          今日の支出はまだありません。
        </p>
      </div>

      <div class="today-expense-total">
        <span>今日の支出合計</span>
        <span class="amount">{{ todayExpenseTotal }} 円</span>
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

        <div
          class="sub-wrapper"
          v-if="openKouza === acc.name"
        >
          <div
            v-for="sub in accountSubs.filter(s => s.large === acc.name)"
            :key="sub.kamokuCD"
            class="sub-row"
          >
            <div class="sub-info">
              <span class="sub-name">{{ sub.name }}</span>
              <span class="check-date">
                {{ sub.checkDate
                  ? `最終照合日：${sub.checkDate.getFullYear()}/${String(sub.checkDate.getMonth() + 1).padStart(2, '0')}/${String(sub.checkDate.getDate()).padStart(2, '0')}`
                  : sub.checkStatus === '確認履歴なし'
                    ? '確認履歴なし'
                    : '未照合'
                }}
              </span>
            </div>

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

const uncheckedCount = ref(0)

// 今日の支出
const todayExpenseSummary = ref([])
const todayExpenseTotal = ref(0)


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
  calcUncheckedCount()
  calcTodayExpense()
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

  // 今月の未確認件数
  function calcUncheckedCount() {
    console.log("① calcUncheckedCount 開始")
    console.log("② list件数:", list.value.length)

    console.log(
      "③ 収入・支出データ:",
      list.value.filter(item =>
        ["4_収入", "5_支出"].includes(item.group)
      )
    )

    uncheckedCount.value = list.value.filter(item =>
      ["4_収入", "5_支出"].includes(item.group) &&
      item.check === false
    ).length

    console.log(
      "チェック値の内訳:",
      list.value
        .filter(item => ["4_収入", "5_支出"].includes(item.group))
        .map(item => ({
          group: item.group,
          check: item.check,
          type: typeof item.check
        }))
    )


    console.log("④ 今月の未確認件数:", uncheckedCount.value)
  }

  // 今日の支出を費目別に集計
  function calcTodayExpense() {
    const summary = {}
    let total = 0

    const today = new Date()

    list.value
      .filter(item => {
        if (item.group !== "5_支出") return false

        const d = new Date(item.date)

        return !isNaN(d.getTime()) &&
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate()
      })
      .forEach(item => {
        const amount = Number(item.amount ?? 0)
        const name = item.large

        if (!name) return

        summary[name] = (summary[name] || 0) + amount
        total += amount
      })

    todayExpenseSummary.value = Object.entries(summary)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)

    todayExpenseTotal.value = total

    console.log("今日の支出:", todayExpenseSummary.value)
    console.log("今日の支出合計:", todayExpenseTotal.value)
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

    // 科目コードごとの照合状態を管理
    const checkInfo = {}

    // まず月初残高（内容の№00）から初期状態を取得
    list.value
      .filter(item =>
        ["1_資産", "2_負債"].includes(item.group) &&
        Number(item.kamokuCD) >= 100 &&
        Number(item.kamokuCD) <= 299 &&
        String(item.naiyo ?? "").includes("№00")
      )
      .forEach(item => {
        const code = String(item.kamokuCD)
        const result = item.checkResult

        checkInfo[code] = {
          status: result || "未照合",
          date: ""
        }

        // 月初残高の照合結果が日付なら保存
        if (result && result !== "確認履歴なし") {
          const d = new Date(result)
          if (!isNaN(d.getTime())) {
            checkInfo[code].date = d
          }
        }
      })

    // 同じ科目コードのデータから照合日を更新
    list.value
      .filter(item =>
        ["1_資産", "2_負債"].includes(item.group) &&
        Number(item.kamokuCD) >= 100 &&
        Number(item.kamokuCD) <= 299
      )
      .forEach(item => {
        const code = String(item.kamokuCD)
        const result = item.checkResult

        if (!checkInfo[code]) {
          checkInfo[code] = {
            status: result || "未照合",
            date: ""
          }
        }

        // 空欄や「確認履歴なし」では更新しない
        if (!result || result === "確認履歴なし") return

        const d = new Date(result)

        if (!isNaN(d.getTime())) {
          if (
            !checkInfo[code].date ||
            d > checkInfo[code].date
          ) {
            checkInfo[code].date = d
            checkInfo[code].status = result
          }
        }
      })

    // 口座残高を集計
    list.value
      .filter(item => ["1_資産", "2_負債"].includes(item.group))
      .forEach(item => {
        const amount = Number(item.amount ?? 0)
        const code = String(item.kamokuCD)

        if (!item.large) return

        if (!big[item.large]) {
          big[item.large] = {
            amount: 0,
            kamokuCD: item.kamokuCD
          }
        }

        big[item.large].amount += amount

        if (!item.small) return

        if (!small[code]) {
          small[code] = {
            name: item.small,
            large: item.large,
            amount: 0,
            kamokuCD: item.kamokuCD
          }
        }

        small[code].amount += amount
      })

    // 大項目（口座グループ）
    accounts.value = Object.entries(big)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        kamokuCD: data.kamokuCD
      }))
      .sort((a, b) => a.kamokuCD - b.kamokuCD)

    // 小項目（科目コード単位）
    accountSubs.value = Object.entries(small)
      .map(([code, data]) => {
        const info = checkInfo[code] || {
          status: "未照合",
          date: ""
        }

        return {
          name: data.name,
          large: data.large,
          amount: data.amount,
          kamokuCD: data.kamokuCD,
          checkStatus: info.status,
          checkDate: info.date
        }
      })
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
    calcUncheckedCount()
    console.log("accountSubs:", accountSubs.value)
    calcTodayExpense()

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

/* =========================
   未確認データ
========================= */

.unchecked-card {
  background: #fffaf4;
  border: 1px solid #e8cfc4;
}

.unchecked-card h2 {
  color: #6b4f3f;
}

.unchecked-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.unchecked-main {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.unchecked-count {
  flex-shrink: 0;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.2;
  color: #b7473a;
}

.unchecked-message {
  font-size: 14px;
  font-weight: 600;
  color: #6b4f3f;
}

.unchecked-action {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid #6b4f3f;
  border-radius: 8px;
  background: #6b4f3f;
  color: #fffaf4;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.unchecked-action:active {
  background: #523b30;
}

.action-arrow {
  font-size: 22px;
  line-height: 1;
}


  /* =========================
    今日の支出
  ========================= */

  .today-expense-card {
    background: #fffaf4;
  }

  .today-expense-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    margin-left:80px;
  }

  .today-expense-header h2 {
    margin: 0;
    color: #6b4f3f;
  }

  .today-date {
    flex-shrink: 0;
    padding: 5px 10px;
    border-radius: 6px;
    background: #efe1d2;
    color: #6b4f3f;
    font-size: 14px;
    font-weight: 700;
  }

  .today-expense-list {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .today-expense-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    color: #4b4038;
    font-size: 14px;
    font-weight: 600;
  }

  .today-expense-row .amount {
    flex-shrink: 0;
    margin-right: 0;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .no-expense {
    margin: 8px 0 14px;
    color: #8a7769;
    font-size: 14px;
  }

  /* 支出一覧と合計の間の区切り */
  .today-expense-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
    padding-top: 14px;
    border-top: 2px solid #cbb5a3;
    color: #6b4f3f;
    font-size: 16px;
    font-weight: 800;
  }

  .today-expense-total .amount {
    flex-shrink: 0;
    margin-right: 0;
    white-space: nowrap;
    font-size: 18px;
    font-variant-numeric: tabular-nums;
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


  /* 口座残高：小項目のレイアウト */
  .sub-wrapper {
    margin: 6px 12px 10px 20px;
    padding-left: 12px;
    border-left: 2px solid #e2d2c3;
  }

  /* 小項目：口座名と照合日 */
  .sub-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    flex: 1;
  }

  .sub-name {
    text-align: left;
    margin-left: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #4b4038;
  }

  /* 照合状態・照合日 */
  .check-date {
    margin-left: 8px;
    font-size: 12px;
    font-weight: normal;
    line-height: 1.4;
    color: #47765a;
    text-align: left;
  }

  /* 小項目の1行 */
  .sub-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 10px 0;
    border-bottom: 1px solid #eee5dc;
  }

  .sub-row:last-child {
    border-bottom: none;
  }

  /* 小項目の残高 */
  .sub-amount {
    flex-shrink: 0;
    text-align: right;
    margin-right: 8px;
    font-size: 14px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: #4b4038;
  }


</style>