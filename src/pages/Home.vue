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
        <span class ="amount"
        :class="{ 'amount-negative': monthly.income < 0 }">{{ monthly.income }} 円</span>
      </div>
      <div class="row">
        <span>支出</span>
        <span class ="amount"
        :class="{ 'amount-negative': monthly.expense < 0 }">{{ monthly.expense }} 円</span>
      </div>
      <div class="row total">
        <span>差額</span>
        <span class ="amount"
        :class="{ 'amount-negative': monthly.income + monthly.expense < 0 }">{{ monthly.income + monthly.expense }} 円</span>
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
          class="btn unchecked-action"
          @click="goUnchecked"
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
          <span class="amount"
          :class=" { 'amount-negative' : item.amount < 0 } ">{{ item.amount }} 円</span>
        </div>

        <p v-if="todayExpenseTotal === 0" class="no-expense">
          今日の支出はまだありません
        </p>
      </div>

      <div class="today-expense-total">
        <span>今日の支出合計</span>
        <span class="amount"
        :class=" { 'amount-negative' : todayExpenseTotal < 0 } ">{{ todayExpenseTotal }} 円</span>
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
            class="btn toggle-btn"
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
            <span class="sub-amount"
            :class=" { 'amount-negative' : sub.amount < 0 } ">{{ sub.amount }} 円</span>
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
            class="btn toggle-btn"
            @click="openKouza = openKouza === acc.name ? null : acc.name"
          >
            {{ openKouza === acc.name ? '－' : '＋' }}
          </button>
          <!-- ● 色丸（口座は色が無いなら透明でもOK） -->
          <span class="dot" style="background-color: transparent;opacity:0;"></span>
          <span class="large-name">{{ acc.name }}</span>
          <span class="amount"
          :class=" { 'amount-negative' : acc.amount < 0 } ">{{ acc.amount }} 円</span>
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

            <span class="sub-amount"
            :class=" { 'amount-negative' : sub.amount < 0 } ">{{ sub.amount }} 円</span>
          </div>
        </div>

      </div>
      <!-- 残高確定画面へのボタン -->
      <div class="balance-confirm-action">
        <button
          class="btn balance-confirm-btn"
          @click="goBalanceConfirm"
        >
          <span>確定残高を入力する</span>
          <span class="action-arrow">›</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
  import { ref, onMounted, computed,watch } from "vue"
  import { GAS_URL } from "@/constants/index.js"
  import loadingStore from "@/stores/loadingStore"
  import PieChart from "@/components/PieChart.vue"
  import { useRouter } from "vue-router"

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
  const router = useRouter()

  // 未確認データの検索画面へ移動
  function goUnchecked() {
    router.push({
      name: "list", // 検索画面の実際のルート名に合わせる
      query: {
        start: getMonthStartISO(),
        end: getMonthEndISO(),
        unchecked: "true"
      }
    })
  }

  // 検索画面の日付入力に合わせて yyyy-mm-dd に変換
  function getMonthStartISO() {
    return `${outputYear.value}-${String(outputMonth.value).padStart(2, "0")}-01`
  }

  function getMonthEndISO() {
    const last = new Date(outputYear.value, outputMonth.value, 0)
    return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`
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
        String(item.naiyo ?? "").includes("№00") &&
        item.hihyouji !== true &&
        String(item.hihyouji).toUpperCase() !== "TRUE"
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
        Number(item.kamokuCD) <= 299 &&
        item.hihyouji !== true &&
        String(item.hihyouji).toUpperCase() !== "TRUE"
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
      .filter(item =>
        ["1_資産", "2_負債"].includes(item.group) &&
        item.hihyouji !== true &&
        String(item.hihyouji).toUpperCase() !== "TRUE"
      )
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


  // 残高確定画面へ移動
  function goBalanceConfirm() {
    router.push({
      name: "balanceConfirm"
    })
  }
</script>





<style scoped>
/* ホーム画面固有のレイアウトのみ。
   色・基本文字・カード・共通ボタン・金額表示は Base.css を使用。 */

/* 未確認データ */
.unchecked-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.unchecked-main {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  min-width: 0;
}

.unchecked-count {
  flex-shrink: 0;
  color: var(--color-danger);
  font-size: 30px;
  line-height: 1.2;
}

.unchecked-message {
  min-width: 0;
  color: var(--color-muted);
  font-size: 14px;
}

.unchecked-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
}

.action-arrow {
  flex: 0 0 auto;
  font-size: 24px;
  line-height: 1;
}

/* 今日の支出 */
.today-expense-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.today-expense-header h2 {
  min-width: 0;
  margin: 0;
  text-align: left;
}

.today-date {
  flex: 0 0 auto;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-background);
  color: var(--color-muted);
  font-size: 13px;
}

.today-expense-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
}

.today-expense-row,
.today-expense-total {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: 12px;
  width: 100%;
  min-width: 0;
}

.today-expense-row > span:first-child,
.today-expense-total > span:first-child {
  min-width: 0;
  text-align: left;
}

.today-expense-row {
  padding: 8px 0;
  font-size: 14px;
}

.today-expense-total {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.today-expense-total .amount {
  font-size: 18px;
}

.no-expense {
  margin: 8px 0 12px;
  color: var(--color-muted);
  font-size: 14px;
}

/* 一か月の収支：中央寄りの領域で項目名は左、金額は右 */
.card > .row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 320px;
  min-width: 0;
  margin-inline: auto;
  padding: 8px 0;
}

.card > .row > * {
  min-width: 0;
}

.card > .row.total {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

/* 円グラフ領域 */
.chart-placeholder {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 240px;
  min-width: 0;
  margin: 8px 0;
  border-radius: var(--radius-sm);
  background: var(--color-background);
}

/* 大項目・口座の行 */
.large-row {
  display: grid;
  grid-template-columns: 40px 10px minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 8px 0;
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.large-name {
  min-width: 0;
  text-align: left;
}

/* 展開した小項目 */
.sub-wrapper {
  min-width: 0;
  margin: 6px 0 10px 20px;
  padding-left: 12px;
  border-left: 1px solid var(--color-border);
}

.sub-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
}

.sub-row:last-child {
  border-bottom: none;
}

.sub-info {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.sub-name {
  min-width: 0;
  margin-left: 8px;
  font-size: 14px;
}

.check-date {
  margin-left: 8px;
  color: var(--color-success);
  font-size: 12px;
  line-height: 1.4;
}

.sub-amount {
  flex: 0 0 auto;
  margin-right: 8px;
  font-size: 14px;
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* 残高確定ボタン：共通ボタンの見た目を使い、配置のみ指定 */
.balance-confirm-action {
  margin: 12px 0 24px;
}

.balance-confirm-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 56px;
  gap: 12px;
}

@media (max-width: 420px) {
  .large-row {
    gap: 4px;
  }

  .sub-wrapper {
    margin-left: 12px;
    padding-left: 8px;
  }

  .sub-row {
    gap: 6px;
  }
}
</style>
