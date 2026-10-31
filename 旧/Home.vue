<template>
  <!-- ホーム見出し -->
  <div class="home-page">

    <header class="home-header">
      <div class="home-title-area">
        <span class="home-title-icon">⌂</span>
        <div>
          <h1>ホーム</h1>
          <p>家計の状況</p>
        </div>
      </div>
    </header>

    <!-- 月切り替え -->
    <div class="month-switch">
      <button class="nav-btn prev" @click="goPrevMonth">‹</button>

      <div class="month-label">
        {{ outputYear }}年 {{ outputMonth }}月
      </div>

      <button
        class="nav-btn next"
        v-if="!(outputYear === now.getFullYear() && outputMonth === now.getMonth() + 1)"
        @click="goNextMonth"
      >
        ›
      </button>
    </div>

    <div class="has-footer">

      <!-- 月間収支 -->
      <section class="card monthly-card">
        <div class="monthly-item">
          <span class="monthly-label">収入</span>
          <span class="monthly-value amount amount-primary">
            {{ monthly.income.toLocaleString() }}円
          </span>
        </div>

        <div class="monthly-item">
          <span class="monthly-label">支出</span>
          <span
            class="monthly-value amount amount-primary"
            :class="{ 'amount-negative': monthly.expense < 0 }"
          >
            {{ monthly.expense.toLocaleString() }}円
          </span>
        </div>

        <div
          class="monthly-item monthly-difference"
          :class="{
            'difference-negative': monthly.income + monthly.expense < 0,
            'difference-positive': monthly.income + monthly.expense > 0,
            'difference-zero': monthly.income + monthly.expense === 0
          }"
        >
          <span class="monthly-label">差額</span>
          <span
            class="monthly-value amount amount-primary"
            :class="{ 'amount-negative': monthly.income + monthly.expense < 0 }"
          >
            {{ (monthly.income + monthly.expense).toLocaleString() }}円
          </span>
        </div>
      </section>


      <!-- 未確認データ・今日の支出 -->
      <div class="home-summary-grid">

        <!-- 未確認データ：カード全体から検索へ -->
        <section
          class="card summary-card unchecked-card"
          :class="{ warning: uncheckedCount > 0 }"
          role="button"
          tabindex="0"
          @click="goUnchecked"
          @keydown.enter="goUnchecked"
          @keydown.space.prevent="goUnchecked"
        >
          <span class="summary-icon unchecked-icon"><ClipboardList /></span>
          <div class="summary-card-content">
            <span class="summary-title">未確認データ</span>
            <span class="summary-number amount">
              {{ uncheckedCount }}件
            </span>
          </div>
          <span class="summary-arrow">›</span>
        </section>

        <!-- 今日の支出：カード全体から今日の明細検索へ -->
        <section
          class="card summary-card today-expense-card"
          role="button"
          tabindex="0"
          @click="goTodayExpense"
          @keydown.enter="goTodayExpense"
          @keydown.space.prevent="goTodayExpense"
        >
          <span class="summary-icon today-icon"><CalendarDays  /></span>
          <div class="summary-card-content">
            <span class="today-date">
              {{ now.getMonth() + 1 }}月{{ now.getDate() }}日
            </span>
            <span class="summary-title">今日の支出</span>
            <span
              class="summary-number amount amount-primary"
              :class="{ 'amount-negative': todayExpenseTotal < 0 }"
            >
              {{ todayExpenseTotal.toLocaleString() }}円
            </span>
          </div>
          <span class="summary-arrow">›</span>
        </section>

      </div>

      <!-- 今月の支出 -->
      <section class="card expense-card">

        <h2>今月の支出</h2>

        <div class="expense-overview">

          <!-- 左：円グラフ -->
          <div class="chart-placeholder">
            <PieChart
              :labels="labels"
              :values="values"
              @update:colors="chartColors = $event"
            />
          </div>

          <!-- 右：大項目一覧 -->
          <div class="expense-summary-list">

            <div
              v-for="(item, i) in expenseSummary"
              :key="i"
              class="expense-summary-item"
            >
              <button
                type="button"
                class="large-row expandable-row"
                :aria-expanded="openLarge === item.name"
                @click="openLarge = openLarge === item.name ? null : item.name"
              >
                <!-- 色丸 -->
                <span
                  class="dot"
                  :style="{ backgroundColor: chartColors[i] }"
                ></span>

                <!-- 大項目名 -->
                <span class="large-name">
                  {{ item.name }}
                </span>

                <!-- 金額 -->
                <span
                  class="amount expense-item-amount"
                  :class="{ 'amount-negative': item.amount < 0 }"
                >
                  {{ item.amount.toLocaleString() }}円
                </span>

                <!-- 展開矢印 -->
                <span class="expense-arrow expandable-arrow">
                  {{ openLarge === item.name ? '⌄' : '›' }}
                </span>
              </button>

              <!-- 小項目 -->
              <div
                class="sub-wrapper detail-list"
                v-if="openLarge === item.name"
              >
                <div
                  v-for="sub in expenseSubSummary.filter(s => s.large === item.name)"
                  :key="sub.name"
                  class="sub-row detail-row"
                >
                  <span class="sub-name detail-name">{{ sub.name }}</span>
                  <span
                    class="sub-amount detail-amount amount"
                    :class="{ 'amount-negative': sub.amount < 0 }"
                  >
                    {{ sub.amount.toLocaleString() }}円
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      <!-- 口座残高 -->
      <section class="card account-card">

        <div class="account-card-header">
          <h2>口座残高</h2>
          <span class="account-count">
            {{ accounts.length }}項目
          </span>
        </div>

        <!-- 口座一覧 -->
        <div class="account-list">

          <div
            v-for="(acc, i) in accounts"
            :key="i"
            class="account-group"
          >

            <!-- 口座グループ -->
            <button
              type="button"
              class="account-row expandable-row"
              :aria-expanded="openKouza === acc.name"
              @click="openKouza = openKouza === acc.name ? null : acc.name"
            >

              <!-- アイコン -->
              <span class="account-icon">
                <component :is="getAccountIcon(acc.name)" :size="20" />
              </span>

              <!-- 口座名 -->
              <span class="account-name">
                {{ acc.name }}
              </span>

              <!-- 残高 -->
              <span
                class="amount account-amount"
                :class="{ 'amount-negative': acc.amount < 0 }"
              >
                {{ acc.amount.toLocaleString() }}円
              </span>

              <!-- 展開矢印 -->
              <span class="account-arrow expandable-arrow">
                {{ openKouza === acc.name ? '⌄' : '›' }}
              </span>

            </button>

            <!-- 口座の明細 -->
            <div
              class="account-detail detail-list"
              v-if="openKouza === acc.name"
            >

              <div
                v-for="sub in accountSubs.filter(s => s.large === acc.name)"
                :key="sub.kamokuCD"
                class="account-detail-row detail-row"
              >

                <div class="account-detail-info detail-info">
                  <span class="account-detail-name detail-name">
                    {{ sub.name }}
                  </span>

                  <span class="check-date detail-meta">
                    {{ sub.checkDate
                      ? `最終照合日：${sub.checkDate.getFullYear()}/${String(sub.checkDate.getMonth() + 1).padStart(2, '0')}/${String(sub.checkDate.getDate()).padStart(2, '0')}`
                      : sub.checkStatus === '確認履歴なし'
                        ? '確認履歴なし'
                        : '未照合'
                    }}
                  </span>
                </div>

                <span
                  class="amount account-detail-amount detail-amount"
                  :class="{ 'amount-negative': sub.amount < 0 }"
                >
                  {{ sub.amount.toLocaleString() }}円
                </span>

              </div>

            </div>

          </div>

        </div>

        <!-- 残高確定 -->
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
  </div>
</template>

<script setup>
  import { ref, onMounted, computed,watch } from "vue"
  import { GAS_URL } from "@/constants/index.js"
  import loadingStore from "@/stores/loadingStore"
  import PieChart from "@/components/PieChart.vue"
  import { useRouter } from "vue-router"
  import { getAccountIcon } from '@/components/accountIcons'
  import { ClipboardList , CalendarDays  } from "lucide-vue-next";

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

  // 今日の支出一覧へ移動（今日〜今日で自動検索）
  function goTodayExpense() {
    const today = new Date()
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

    router.push({
      name: "list",
      query: {
        start: todayISO,
        end: todayISO
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
  /* =========================================
    Home.vue 専用レイアウト
    共通カラー・カード・ボタンは Base.css を使用
    ========================================= */

  /* ホーム見出し */
  .home-page {
    width: 100%;
    max-width: var(--content-width);
    margin: 0 auto;
  }

  .home-header {
    padding: 8px 4px 12px;
  }

  .home-title-area {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .home-title-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: var(--radius-md);
    background: var(--color-yellow-soft);
    color: var(--color-coffee);
    font-size: 26px;
  }

  .home-header h1 {
    margin: 0;
  }

  .home-header p {
    margin: 2px 0 0;
    color: var(--color-muted);
    font-size: 13px;
  }

  /* 月間収支 */
  .monthly-card {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
    padding: 0;
    overflow: hidden;
  }

  .monthly-item {
    display: flex;
    min-width: 0;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-height: 88px;
    padding: 12px 3px;
    border-right: 1px solid var(--color-border);
  }

  .monthly-item:last-child {
    border-right: none;
  }

  .monthly-label {
    color: var(--color-muted);
    font-size: 13px;
  }

  .monthly-value {
    width: 100%;
    font-size: clamp(17px, 4.2vw, 25px);
    font-weight: 800;
    text-align: center;
    white-space: nowrap;
    letter-spacing: -0.035em;
  }

  .monthly-difference {
    border-right: none;
    transition: background-color .15s ease;
  }

  .monthly-difference.difference-negative {
    background: var(--color-danger-bg);
  }

  .monthly-difference.difference-positive {
    background: var(--color-success-bg);
  }

  .monthly-difference.difference-zero {
    background: var(--color-surface-soft);
  }

  /* 未確認データ・今日の支出 */
  .home-summary-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    align-items: stretch;
  }

  .home-summary-grid > .card {
    min-width: 0;
    min-height: 112px;
    margin-bottom: var(--space-4);
    padding: 12px;
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) 14px;
    align-items: center;
    column-gap: 8px;
    cursor: pointer;
    transition: transform .15s ease, box-shadow .15s ease;
  }

  .home-summary-grid > .card:active {
    transform: scale(.98);
  }

  .home-summary-grid .unchecked-card {
    background: var(--color-yellow-soft);
  }

  .summary-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--color-surface);
    color: var(--color-coffee);
    font-size: 19px;
  }

  .summary-card-content {
    display: flex;
    min-width: 0;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
  }

  .summary-title {
    color: var(--color-text);
    font-size: 14px;
    font-weight: 750;
    line-height: 1.35;
  }

  .summary-number {
    color: var(--color-danger);
    font-size: 25px;
    font-weight: 800;
    line-height: 1.25;
    white-space: nowrap;
  }

  .today-expense-card .summary-number {
    color: var(--color-coffee-dark);
    font-size: clamp(17px, 3.8vw, 23px);
  }

  .today-date {
    color: var(--color-muted);
    font-size: 11px;
    line-height: 1.2;
  }

  .summary-arrow {
    justify-self: end;
    color: var(--color-coffee);
    font-size: 25px;
    line-height: 1;
  }

  /* =================================
   支出グラフ・内訳
   ================================= */

  .expense-card h2 {
    margin-bottom: 16px;
  }

  /* 円グラフと内訳を左右に配置 */
  .expense-overview {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  /* 円グラフ */
  .chart-placeholder {
    position: relative;
    width: 100%;
    height: 190px;
    min-width: 0;
  }

  .chart-placeholder :deep(canvas) {
    width: 100% !important;
    height: 100% !important;
  }

  /* 費目一覧 */
  .expense-summary-list {
    min-width: 0;
  }

  .expense-summary-item {
    min-width: 0;
    padding: 7px 0;
    border-bottom: 1px solid var(--color-border);
  }

  .expense-summary-item:last-child {
    border-bottom: none;
  }

  /* 展開行の共通動作・基本形はBase.css。ここでは支出一覧固有の余白だけ指定 */
  .expense-summary-item .large-row {
    gap: 6px;
    padding: 5px 2px;
  }

  .expense-summary-item .dot {
    flex-shrink: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .expense-summary-item .large-name {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .expense-summary-item .expense-arrow {
    flex-basis: 14px;
    font-size: 21px;
  }

  .expense-summary-amount {
    margin-top: 3px;
    padding-left: 42px;
    text-align: right;
  }

  .expense-summary-amount .amount {
    font-size: 13px;
    white-space: nowrap;
  }

  /* 小項目 */
  .expense-summary-item .sub-wrapper {
    margin-top: 7px;
    padding-left: 12px;
  }

  .expense-summary-item .sub-row {
    gap: 5px;
    padding: 5px 0;
    font-size: 11px;
  }

  .expense-summary-item .sub-name {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .expense-summary-item .sub-amount {
    flex-shrink: 0;
    font-size: 11px;
    white-space: nowrap;
  }


  

  /* =================================
    口座残高：Home専用レイアウト
    共通デザインはBase.cssを使用
    ================================= */

  .account-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .account-card-header h2 {
    margin-bottom: var(--space-3);
  }

  .account-count {
    color: var(--color-muted);
    font-size: 12px;
  }

  .account-list {
    width: 100%;
  }

  .account-group {
    border-bottom: 1px solid var(--color-border);
  }

  .account-group:last-child {
    border-bottom: none;
  }

  /* 口座一覧 */
  .account-row {
    min-height: 52px;
    padding: 8px 0;
  }

  .account-icon {
    display: flex;
    flex: 0 0 34px;
    align-items: center;
    justify-content: center;
    height: 34px;
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-coffee);
    font-size: 18px;
  }

  .account-name {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    font-weight: 650;
  }

  .account-amount {
    flex-shrink: 0;
    font-size: 15px;
    white-space: nowrap;
  }

  /* 展開明細 */
  .account-detail {
    margin: 0 0 var(--space-2) 42px;
  }

  .account-detail-name {
    font-size: 13px;
    font-weight: 600;
  }

  .account-detail-amount {
    font-size: 13px;
  }

  /* 残高確定 */
  .balance-confirm-action {
    margin-top: var(--space-3);
  }

  .balance-confirm-btn {
    display: flex;
    width: 100%;
    justify-content: space-between;
    margin-bottom: 0;
  }


    /* 狭いスマホ */
  @media (max-width: 360px) {

    /* 未確認・今日の支出 */
    .home-summary-grid {
      gap: 7px;
    }

    .home-summary-grid > .card {
      padding: 9px;
    }

    /* 月間収支 */
    .monthly-item {
      padding: 6px 2px;
    }

    /* 支出グラフ */
    .expense-overview {
      grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
      gap: 7px;
    }

    .chart-placeholder {
      height: 155px;
    }

    .expense-summary-item .large-name {
      font-size: 11px;
    }

    .expense-summary-amount .amount {
      font-size: 12px;
    }
  }
</style>
