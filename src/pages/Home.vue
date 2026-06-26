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

<script>
import loadingStore from '../stores/loadingStore'

export default {
  name: "Home",

  data() {
    return {
      showExpense: false,
      showBalance: false,
      monthly: {
        income: 120000,
        expense: 85000
      },
      expenseSummary: [
        { name: "食費", amount: 30000 },
        { name: "日用品", amount: 8000 },
        { name: "交通", amount: 5000 }
      ],
      expenseSubSummary: [
        { name: "外食", amount: 12000 },
        { name: "スーパー", amount: 18000 },
        { name: "ドラッグストア", amount: 8000 }
      ],
      accounts: [
        { name: "財布", amount: 12000 },
        { name: "銀行", amount: 85000 },
        { name: "カード", amount: -3000 }
      ],
      accountSubs: [
        { name: "銀行（普通）", amount: 50000 },
        { name: "銀行（貯蓄）", amount: 35000 },
        { name: "カード（未払い）", amount: -3000 }
      ]
    }
  },

  mounted() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          loadingStore.globalLoading.value = false
        }, 500)
      })
    })
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