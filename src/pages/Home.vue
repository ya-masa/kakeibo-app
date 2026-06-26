<template>
  <div class="has-footer">

    <!-- 今月の収支 -->
    <section class="card">
      <h2>今月の収支</h2>
      <div class="row">
        <span>収入</span>
        <span>{{ monthly.income.toLocaleString() }} 円</span>
      </div>
      <div class="row">
        <span>支出</span>
        <span>{{ monthly.expense.toLocaleString() }} 円</span>
      </div>
      <div class="row total">
        <span>差額</span>
        <span>{{ (monthly.income - monthly.expense).toLocaleString() }} 円</span>
      </div>
    </section>

    <!-- 今月の支出 -->
    <section class="card">
      <div class="toggle-header" @click="showExpense = !showExpense">
        <h2>今月の支出</h2>
        <button class="toggle-btn">{{ showExpense ? '－' : '＋' }}</button>
      </div>

      <div class="chart-placeholder">円グラフが入る</div>

      <div v-for="item in expenseSummary" :key="item.name" class="row">
        <span>{{ item.name }}</span>
        <span>{{ item.amount.toLocaleString() }} 円</span>
      </div>

      <div v-if="showExpense" class="sub-list">
        <div v-for="sub in expenseSubSummary" :key="sub.name" class="row sub">
          <span>{{ sub.name }}</span>
          <span>{{ sub.amount.toLocaleString() }} 円</span>
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
        <span>{{ acc.amount.toLocaleString() }} 円</span>
      </div>

      <div v-if="showBalance" class="sub-list">
        <div v-for="sub in accountSubs" :key="sub.name" class="row sub">
          <span>{{ sub.name }}</span>
          <span>{{ sub.amount.toLocaleString() }} 円</span>
        </div>
      </div>
    </section>

  </div>
</template>

<script>
import { GAS_URL } from "@/constants/index.js"
import loadingStore from "../stores/loadingStore"

export default {
  name: "Home",

  data() {
    return {
      showExpense: false,
      showBalance: false,

      monthly: {
        income: 0,
        expense: 0
      },

      expenseSummary: [],
      expenseSubSummary: [],

      accounts: [],
      accountSubs: []
    }
  },

  async mounted() {
    // ローディング解除
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          loadingStore.globalLoading.value = false
        }, 500)
      })
    })

    // データ取得
    const all = await this.fetchAll()

    // 今月のデータに絞る
    const monthlyData = this.filterThisMonth(all)

    // 収入・支出集計
    this.calcMonthly(monthlyData)

    // 支出の大項目・小項目集計
    this.calcExpenseSummary(monthlyData)

    // 口座残高集計
    this.calcAccounts(all)
  },

  methods: {
    async fetchAll() {
      const res = await fetch(`${GAS_URL}?list=all`)
      return await res.json()
    },

    filterThisMonth(data) {
      const now = new Date()
      const y = now.getFullYear()
      const m = now.getMonth()

      return data.filter(item => {
        const d = new Date(item.date)
        return d.getFullYear() === y && d.getMonth() === m
      })
    },

    calcMonthly(data) {
      const income = data
        .filter(i => i.type === "収入")
        .reduce((sum, i) => sum + Number(i.amount), 0)

      const expense = data
        .filter(i => i.type === "支出")
        .reduce((sum, i) => sum + Number(i.amount), 0)

      this.monthly.income = income
      this.monthly.expense = expense
    },

    calcExpenseSummary(data) {
      const big = {}
      const small = {}

      data
        .filter(i => i.type === "支出")
        .forEach(i => {
          big[i.large] = (big[i.large] || 0) + Number(i.amount)
          small[i.small] = (small[i.small] || 0) + Number(i.amount)
        })

      this.expenseSummary = Object.entries(big).map(([name, amount]) => ({ name, amount }))
      this.expenseSubSummary = Object.entries(small).map(([name, amount]) => ({ name, amount }))
    },

    calcAccounts(data) {
      const big = {}
      const small = {}

      data.forEach(i => {
        big[i.accountLarge] = (big[i.accountLarge] || 0) + Number(i.amount2)
        small[i.accountSmall] = (small[i.accountSmall] || 0) + Number(i.amount2)
      })

      this.accounts = Object.entries(big).map(([name, amount]) => ({ name, amount }))
      this.accountSubs = Object.entries(small).map(([name, amount]) => ({ name, amount }))
    }
  }
}
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