<template>
  <main class="reconciliation-page">
    <header class="page-header">
      <div>
        <h1>データ照合</h1>
        <p>家計簿の仕訳と銀行・カードの明細を照合します。</p>
      </div>

      <button
        class="button button-secondary"
        :disabled="loading"
        @click="loadTargets"
      >
        {{ loading ? "読込中..." : "再読み込み" }}
      </button>
    </header>

    <!-- エラー・メッセージ -->
    <p v-if="errorMessage" class="message error">
      {{ errorMessage }}
    </p>

    <p v-if="successMessage" class="message success">
      {{ successMessage }}
    </p>

    <!-- 口座・カード選択 -->
    <section class="panel">
      <h2>照合する口座・カード</h2>

      <div class="filter-row">
        <label>
          口座・カード
          <select
            v-model="selectedAccountCode"
            @change="loadTargets"
          >
            <option value="">選択してください</option>

            <option
              v-for="account in accounts"
              :key="account.code"
              :value="String(account.code)"
            >
              {{ account.name }}（{{ account.code }}）
            </option>
          </select>
        </label>

        <label>
          照合状態
          <select v-model="selectedStatus">
            <option value="すべて">すべて</option>
            <option value="未照合">未照合</option>
            <option value="照合済み">照合済み</option>
            <option value="要確認">要確認</option>
            <option value="不一致">不一致</option>
            <option value="対象外">対象外</option>
          </select>
        </label>

        <label class="search-field">
          キーワード
          <input
            v-model.trim="keyword"
            type="search"
            placeholder="店・内容・固有ID"
          />
        </label>
      </div>
    </section>

    <!-- 進捗カード -->
    <section class="summary-grid">
      <article class="summary-card">
        <span>表示対象</span>
        <strong>{{ filteredTargets.length }}</strong>
        <small>件</small>
      </article>

      <article class="summary-card">
        <span>未照合</span>
        <strong>{{ countByStatus("未照合") }}</strong>
        <small>件</small>
      </article>

      <article class="summary-card">
        <span>要確認</span>
        <strong>{{ countByStatus("要確認") }}</strong>
        <small>件</small>
      </article>

      <article class="summary-card">
        <span>照合済み</span>
        <strong>{{ countByStatus("照合済み") }}</strong>
        <small>件</small>
      </article>
    </section>

    <!-- CSV取込 -->
    <section class="panel">
      <div class="section-header">
        <div>
          <h2>明細CSVの取込</h2>
          <p>
            CSVを取り込み、家計簿の仕訳との一致を確認します。
          </p>
        </div>
      </div>

      <div class="csv-row">
        <input
          ref="csvInput"
          type="file"
          accept=".csv,text/csv"
          :disabled="!selectedAccountCode"
          @change="onCsvSelected"
        />

        <button
          class="button button-primary"
          disabled
          title="GAS側のCSV取込APIを実装後に有効化します"
        >
          CSV取込（準備中）
        </button>
      </div>

      <p v-if="selectedFile" class="file-name">
        選択中：{{ selectedFile.name }}
      </p>
      <p class="help-text">
        現在は画面のみです。CSVの解析・保存・重複チェックは
        GAS側の取込処理と接続した後に有効になります。
      </p>
    </section>

    <!-- 仕訳一覧 -->
    <section class="panel">
      <div class="section-header">
        <div>
          <h2>照合対象の仕訳</h2>
          <p>
            金額は家計簿に保存されている符号のまま表示します。
          </p>
        </div>

        <span class="result-count">
          {{ filteredTargets.length }} 件
        </span>
      </div>

      <div v-if="!selectedAccountCode" class="empty-state">
        口座・カードを選択してください。
      </div>

      <div v-else-if="loading" class="empty-state">
        データを読み込んでいます……
      </div>

      <div
        v-else-if="filteredTargets.length === 0"
        class="empty-state"
      >
        該当する仕訳がありません。
      </div>

      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>日付</th>
              <th>科目</th>
              <th>店</th>
              <th>内容</th>
              <th class="number-cell">金額</th>
              <th>照合結果</th>
              <th>確認日時</th>
              <th>固有ID</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="item in filteredTargets"
              :key="`${item.id}-${item.rowNo}`"
            >
              <td>{{ item.date }}</td>

              <td>
                <div>{{ item.large }}</div>
                <small>{{ item.small }}</small>
              </td>

              <td>{{ item.shop }}</td>
              <td class="content-cell">{{ item.content }}</td>

              <td class="number-cell" :class="amountClass(item.amount)">
                {{ formatAmount(item.amount) }}
              </td>

              <td>
                <span
                  class="status-badge"
                  :class="statusClass(item.status)"
                >
                  {{ item.status }}
                </span>
              </td>

              <td>{{ item.checkedAt || "—" }}</td>

              <td class="id-cell">{{ item.id }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";


const accounts = ref([]);
const targets = ref([]);

const selectedAccountCode = ref("");
const selectedStatus = ref("すべて");
const keyword = ref("");

const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

const csvInput = ref(null);
const selectedFile = ref(null);

/**
 * GASからJSONを取得する。
 */
async function fetchGas(params) {
  if (!GAS_URL || GAS_URL === "YOUR_GAS_WEB_APP_URL") {
    throw new Error("GAS_URLを設定してください。");
  }

  const url = new URL(GAS_URL);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`GASへの接続に失敗しました（HTTP ${response.status}）。`);
  }

  const data = await response.json();

  if (data?.error) {
    throw new Error(data.details || data.error);
  }

  return data;
}

/**
 * 口座・カード一覧を取得する。
 */
async function loadAccounts() {
  errorMessage.value = "";

  try {
    const data = await fetchGas({
      list: "reconciliationAccounts"
    });

    if (!Array.isArray(data)) {
      throw new Error("口座・カード一覧の形式が正しくありません。");
    }

    accounts.value = data;
  } catch (error) {
    errorMessage.value =
      `口座・カード一覧の取得に失敗しました：${error.message}`;
  }
}

/**
 * 選択した科目CDの照合対象を取得する。
 */
async function loadTargets() {
  if (!selectedAccountCode.value) {
    targets.value = [];
    return;
  }

  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const data = await fetchGas({
      list: "reconciliationTargets",
      accountCode: selectedAccountCode.value
    });

    if (!Array.isArray(data)) {
      throw new Error("照合対象のデータ形式が正しくありません。");
    }

    targets.value = data;
  } catch (error) {
    targets.value = [];
    errorMessage.value =
      `照合対象の取得に失敗しました：${error.message}`;
  } finally {
    loading.value = false;
  }
}

/**
 * 表示用の絞り込み。
 * 状態の絞り込みはVue側で行う。
 */
const filteredTargets = computed(() => {
  const search = keyword.value.toLowerCase();

  return targets.value.filter((item) => {
    if (
      selectedStatus.value !== "すべて" &&
      item.status !== selectedStatus.value
    ) {
      return false;
    }

    if (!search) {
      return true;
    }

    const text = [
      item.shop,
      item.content,
      item.id,
      item.large,
      item.small
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(search);
  });
});

/**
 * 状態別の件数。
 */
function countByStatus(status) {
  return targets.value.filter((item) => item.status === status).length;
}

/**
 * 金額は符号を変えずに表示。
 */
function formatAmount(amount) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);
}

function amountClass(amount) {
  if (amount > 0) return "amount-positive";
  if (amount < 0) return "amount-negative";
  return "";
}

function statusClass(status) {
  return {
    "status-unchecked": status === "未照合",
    "status-done": status === "照合済み",
    "status-review": status === "要確認",
    "status-mismatch": status === "不一致",
    "status-excluded": status === "対象外"
  };
}

/**
 * CSVファイルの選択状態だけを管理する。
 * 実際の取込処理はGAS API実装後に接続する。
 */
function onCsvSelected(event) {
  selectedFile.value = event.target.files?.[0] || null;
}

watch(selectedAccountCode, () => {
  selectedFile.value = null;

  if (csvInput.value) {
    csvInput.value.value = "";
  }
});

onMounted(async () => {
  await loadAccounts();
});
</script>

<style scoped>
.reconciliation-page {
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px;
  color: #243044;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header,
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-header {
  margin-bottom: 24px;
}

h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

h2 {
  margin: 0 0 8px;
  font-size: 18px;
}

p {
  margin: 4px 0;
  color: #687386;
  font-size: 14px;
}

.panel {
  margin-bottom: 20px;
  padding: 20px;
  background: #fff;
  border: 1px solid #e0e6ee;
  border-radius: 12px;
}

.filter-row {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(160px, 0.7fr) minmax(220px, 1fr);
  gap: 16px;
  margin-top: 16px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

select,
input[type="search"] {
  width: 100%;
  min-height: 40px;
  padding: 8px 10px;
  border: 1px solid #cbd4df;
  border-radius: 6px;
  background: #fff;
  color: inherit;
  font: inherit;
}

.button {
  min-height: 40px;
  padding: 9px 16px;
  border: 1px solid #cbd4df;
  border-radius: 7px;
  background: #fff;
  cursor: pointer;
  font: inherit;
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.button-primary {
  border-color: #2463eb;
  background: #2463eb;
  color: #fff;
}

.button-secondary {
  background: #fff;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.summary-card {
  padding: 18px;
  background: #fff;
  border: 1px solid #e0e6ee;
  border-radius: 12px;
}

.summary-card span,
.summary-card small {
  display: block;
  color: #687386;
  font-size: 13px;
}

.summary-card strong {
  display: inline-block;
  margin: 10px 5px 4px 0;
  font-size: 30px;
}

.csv-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.file-name {
  margin-top: 12px;
  color: #243044;
}

.help-text {
  margin-top: 12px;
  font-size: 12px;
}

.result-count {
  color: #687386;
  font-size: 13px;
}

.table-wrapper {
  margin-top: 16px;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
  font-size: 13px;
}

th,
td {
  padding: 12px 10px;
  border-bottom: 1px solid #e8edf3;
  text-align: left;
}

th {
  background: #f7f9fc;
  color: #526075;
  font-weight: 600;
}

tbody tr:hover {
  background: #f8faff;
}

td small {
  color: #687386;
}

.content-cell {
  min-width: 160px;
  white-space: normal;
}

.number-cell {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.amount-positive {
  color: #087443;
}

.amount-negative {
  color: #c0392b;
}

.id-cell {
  font-family: monospace;
}

.status-badge {
  display: inline-block;
  padding: 4px 9px;
  border-radius: 20px;
  font-size: 12px;
}

.status-unchecked {
  background: #edf1f6;
  color: #526075;
}

.status-done {
  background: #dff6e9;
  color: #087443;
}

.status-review {
  background: #fff0cf;
  color: #8b5a00;
}

.status-mismatch {
  background: #ffe2e0;
  color: #a52822;
}

.status-excluded {
  background: #e8e8e8;
  color: #666;
}

.empty-state {
  padding: 40px 16px;
  color: #687386;
  text-align: center;
}

.message {
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 8px;
}

.error {
  background: #ffe9e7;
  color: #a52822;
}

.success {
  background: #e1f7e9;
  color: #087443;
}

@media (max-width: 800px) {
  .reconciliation-page {
    padding: 14px;
  }

  .filter-row {
    grid-template-columns: 1fr;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .page-header {
    align-items: flex-start;
  }
}
</style>