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
          @change="onCsvSelected"
        />

        <p v-if="selectedFile">
          選択ファイル：{{ selectedFile.name }}
        </p>

        <p v-if="csvEncoding">
          文字コード：{{ csvEncoding }}
        </p>

        <button
          type="button"
          :disabled="!selectedFile || uploadingCsv"
          @click="importCsv"
        >
          {{ uploadingCsv ? "取り込み中…" : "CSVを取り込む" }}
        </button>

        <div v-if="csvPreview.length">
          <p>取り込み予定：{{ csvRows.length }}件（先頭5件を表示）</p>

          <div
            v-for="(item, index) in csvPreview"
            :key="index"
          >
            {{ item.date }} ／ {{ item.place }} ／
            {{ formatAmount(item.amount) }}
          </div>
        </div>      </div>

      <p v-if="selectedFile" class="file-name">
        選択中：{{ selectedFile.name }}
      </p>
      <p class="help-text">
        現在は画面のみです。CSVの解析・保存・重複チェックは
        GAS側の取込処理と接続した後に有効になります。
      </p>
    </section>

    <!-- 照合確定前の確認画面 -->
    <section
      v-if="selectedCandidate"
      ref="confirmSection"
      class="card reconciliation-confirm"
    >
      <h2>照合内容の確認</h2>

      <p>
        CSV明細と家計簿の取引が正しい組み合わせか確認してください。
      </p>

      <div class="confirm-comparison">
        <article class="confirm-card">
          <h3>CSV明細</h3>

          <p>
            <strong>利用先：</strong>
            {{ selectedCandidate.statement.place || "利用先不明" }}
          </p>

          <p>
            <strong>利用日：</strong>
            {{ selectedCandidate.statement.date }}
          </p>

          <p>
            <strong>利用金額：</strong>
            {{ formatAmount(selectedCandidate.statement.amount) }}
          </p>

          <p>
            <strong>支払金額：</strong>
            {{ formatAmount(selectedCandidate.statement.paymentAmount) }}
          </p>

          <p v-if="selectedCandidate.statement.content">
            <strong>利用内容：</strong>
            {{ selectedCandidate.statement.content }}
          </p>

          <p>
            <strong>支払区分：</strong>
            {{ selectedCandidate.statement.paymentType || "未設定" }}
          </p>
        </article>

        <article class="confirm-card">
          <h3>家計簿の取引</h3>

          <p>
            <strong>店：</strong>
            {{ selectedCandidate.candidate.shop || "店名なし" }}
          </p>

          <p>
            <strong>日付：</strong>
            {{ selectedCandidate.candidate.date }}
          </p>

          <p>
            <strong>金額：</strong>
            {{ formatAmount(selectedCandidate.candidate.amount) }}
          </p>

          <p>
            <strong>家計簿固有ID：</strong>
            {{ selectedCandidate.candidate.id }}
          </p>

          <p>
            <strong>日付差：</strong>
            {{ selectedCandidate.candidate.dateDifference }}日
          </p>
        </article>
      </div>

      <p class="confirm-warning">
        確定すると、CSV明細と家計簿の取引が照合済みになります。
        内容を確認してから確定してください。
      </p>

      <div class="confirm-actions">
        <button
          type="button"
          @click="cancelEposReconciliation"
          :disabled="confirmingReconciliation"
        >
          候補一覧に戻る
        </button>

        <button
          type="button"
          @click="confirmEposReconciliation"
          :disabled="confirmingReconciliation"
        >
          {{
            confirmingReconciliation
              ? "保存中…"
              : "照合を確定"
          }}
        </button>
      </div>
    </section>

    <!-- 照合候補の表示 -->
    <section
      v-if="!selectedCandidate"
      class="reconciliation-candidates"
    >
    <h2>エポスカード照合候補</h2>

      <p v-if="!selectedAccountCode">
        口座・カードを選択してください。
      </p>

      <template v-else-if="[201, 202].includes(Number(selectedAccountCode))">
        <div class="candidate-summary">
          <button type="button" @click="candidateFilter = 'すべて'">
            すべて {{ eposCandidates.length }}
          </button>

          <button type="button" @click="candidateFilter = '一致候補'">
            一致候補 {{ candidateCount('一致候補') }}
          </button>

          <button type="button" @click="candidateFilter = '要確認'">
            要確認 {{ candidateCount('要確認') }}
          </button>

          <button type="button" @click="candidateFilter = '未対応'">
            未対応 {{ candidateCount('未対応') }}
          </button>

          <button
            type="button"
            @click="loadEposCandidates"
            :disabled="loadingCandidates"
          >
            {{ loadingCandidates ? "更新中…" : "再読み込み" }}
          </button>
        </div>

        <p v-if="loadingCandidates">照合候補を読み込んでいます…</p>

        <p v-else-if="filteredEposCandidates.length === 0">
          表示する照合候補はありません。
        </p>

        <article
          v-for="item in filteredEposCandidates"
          :key="item.statementId"
          class="candidate-card"
        >
          <div class="candidate-heading">
            <strong>{{ item.place || "利用先不明" }}</strong>
            <span class="candidate-status">{{ item.status }}</span>
          </div>

          <p>
            利用日：{{ item.date }}
          </p>

          <p>
            利用金額：{{ formatAmount(item.amount) }}
          </p>

          <p>
            支払金額：{{ formatAmount(item.paymentAmount) }}
          </p>

          <p v-if="item.content">
            利用内容：{{ item.content }}
          </p>

          <div v-if="item.candidates?.length">
            <h3>家計簿側の候補</h3>

            <div
              v-for="candidate in item.candidates"
              :key="`${item.statementId}-${candidate.rowNo}`"
              class="ledger-candidate"
            >
              <p>
                {{ candidate.date }} ／
                {{ candidate.shop || candidate.content || "店名なし" }}
              </p>

              <p>
                金額：{{ formatAmount(candidate.amount) }}
              </p>

              <p>
                日付差：{{ candidate.dateDifference }}日
              </p>

              <p>
                家計簿ID：{{ candidate.id }}
              </p>
              <button
                type="button"
                @click="selectEposCandidate(item, candidate)"
              >
                この取引と照合
              </button>
            </div>
          </div>
          <p v-else>
            対応する家計簿データの候補は見つかりませんでした。
          </p>
        </article>
      </template>
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
              <th>操作</th>
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
              <td>
                <button
                  v-if="item.status === '照合済み'"
                  type="button"
                  :disabled="cancellingReconciliation"
                  @click="cancelConfirmedReconciliation(item)"
                >
                  {{
                    cancellingReconciliation
                      ? "解除中…"
                      : "照合解除"
                  }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { GAS_URL } from "@/constants/index.js"


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

const eposCandidates = ref([]);
const loadingCandidates = ref(false);
const candidateFilter = ref("すべて");

// 照合確定用
const selectedCandidate = ref(null);
const confirmingReconciliation = ref(false);

//照合取消用
const cancellingReconciliation = ref(false);

//表示位置
const confirmSection = ref(null);

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
    console.log("data=",data);
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
watch(selectedAccountCode, async () => {
  selectedFile.value = null;
  csvRows.value = [];
  csvPreview.value = [];
  csvEncoding.value = "";
  eposCandidates.value = [];

  if (csvInput.value) {
    csvInput.value.value = "";
  }

  if ([201, 202].includes(Number(selectedAccountCode.value))) {
    await loadEposCandidates();
  }
});


onMounted(async () => {
  await loadAccounts();
});

const uploadingCsv = ref(false);
const csvRows = ref([]);
const csvPreview = ref([]);
const csvEncoding = ref("");

function parseCsvText(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === "") {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some(v => v.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some(v => v.trim() !== "")) rows.push(row);
  }

  return rows;
}

function decodeCsv(buffer) {
  const bytes = new Uint8Array(buffer);

  // UTF-8 BOMがあればUTF-8として読む
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xEF &&
    bytes[1] === 0xBB &&
    bytes[2] === 0xBF
  ) {
    return {
      text: new TextDecoder("utf-8").decode(bytes),
      encoding: "UTF-8"
    };
  }

  // まずUTF-8として厳密に判定
  try {
    return {
      text: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      encoding: "UTF-8"
    };
  } catch {
    return {
      text: new TextDecoder("shift_jis").decode(bytes),
      encoding: "Shift_JIS"
    };
  }
}

function parseEposAmount(value) {
  const normalized = String(value ?? "")
    .replace(/[,，￥¥\s]/g, "")
    .trim();

  if (!normalized) return null;

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function onCsvSelected(event) {
  selectedFile.value = event.target.files?.[0] || null;
  csvRows.value = [];
  csvPreview.value = [];
  csvEncoding.value = "";
  errorMessage.value = "";
  successMessage.value = "";

  if (selectedFile.value) {
    successMessage.value = "CSVを選択しました。内容を確認して取り込んでください。";
  }
}

function normalizeHeader(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\s/g, "")
    .trim();
}

async function prepareEposCsv() {
  if (!selectedFile.value) {
    throw new Error("CSVファイルを選択してください。");
  }

  const buffer = await selectedFile.value.arrayBuffer();
  const decoded = decodeCsv(buffer);
  const rows = parseCsvText(decoded.text);

  if (rows.length < 2) {
    throw new Error("CSVに明細がありません。");
  }

  const headers = rows[0].map(normalizeHeader);

  const findColumn = name =>
    headers.findIndex(h => h.includes(name));

  const indexes = {
    type: findColumn("種別"),
    date: findColumn("ご利用年月日"),
    place: findColumn("ご利用場所"),
    content: findColumn("ご利用内容"),
    amount: findColumn("ご利用金額"),
    paymentAmount: findColumn("お支払金額"),
    paymentType: findColumn("支払区分")
  };

  for (const [name, index] of Object.entries(indexes)) {
    if (index < 0) {
      throw new Error(`CSVに必要な列がありません：${name}`);
    }
  }

  const parsed = [];

  for (const row of rows.slice(1)) {
    const date = String(row[indexes.date] ?? "").trim();
    const type = String(row[indexes.type] ?? "").trim();

    // 合計行など、利用日がない行は除外
    if (!date || !/^\d{4}年\d{1,2}月\d{1,2}日$/.test(date)) {
      continue;
    }

    const amount = parseEposAmount(row[indexes.amount]);
    const paymentAmount = parseEposAmount(row[indexes.paymentAmount]);

    if (amount === null || paymentAmount === null) {
      throw new Error(`金額を読み取れません：${date} ${row[indexes.place] ?? ""}`);
    }

    parsed.push({
      type,
      date,
      place: String(row[indexes.place] ?? "").trim(),
      content: String(row[indexes.content] ?? "").trim(),
      amount,
      paymentAmount,
      paymentType: String(row[indexes.paymentType] ?? "").trim()
    });
  }

  if (parsed.length === 0) {
    throw new Error("取り込める利用明細がありません。CSVの形式を確認してください。");
  }

  csvRows.value = parsed;
  csvPreview.value = parsed.slice(0, 5);
  csvEncoding.value = decoded.encoding;

  return parsed;
}

async function importCsv() {
  errorMessage.value = "";
  successMessage.value = "";

  if (![201, 202].includes(Number(selectedAccountCode.value))) {
    errorMessage.value = "雅エポスカードまたは和くんエポスカードを選択してください。";
    return;
  }

  uploadingCsv.value = true;

  try {
    const rows = await prepareEposCsv();
    await loadEposCandidates();

    const payload = {
      accountCode: Number(selectedAccountCode.value),
      fileName: selectedFile.value.name,
      rows
    };

    const body = new URLSearchParams({
      mode: "importEposCsv",
      payload: JSON.stringify(payload)
    });

    const response = await fetch(GAS_URL, {
      method: "POST",
      body
    });

    const responseText = await response.text();
    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(
        "GASからJSON以外の応答が返りました。doPostの処理とデプロイを確認してください。"
      );
    }

    if (!response.ok || result.error || result.success !== true) {
      throw new Error(result.message || result.error || `HTTP ${response.status}`);
    }

    successMessage.value = result.message || "CSVを取り込みました。";
    await loadTargets();

    selectedFile.value = null;
    csvRows.value = [];
    csvPreview.value = [];

    if (csvInput.value) {
      csvInput.value.value = "";
    }
  } catch (error) {
    errorMessage.value = `CSV取り込みに失敗しました：${error.message}`;
  } finally {
    uploadingCsv.value = false;
  }
}

async function loadEposCandidates() {
  if (![201, 202].includes(Number(selectedAccountCode.value))) {
    eposCandidates.value = [];
    return;
  }

  loadingCandidates.value = true;
  errorMessage.value = "";

  try {
    const data = await fetchGas({
      list: "eposCandidates",
      accountCode: selectedAccountCode.value
    });

    if (!Array.isArray(data)) {
      throw new Error("照合候補のデータ形式が正しくありません。");
    }

    eposCandidates.value = data;
  } catch (error) {
    errorMessage.value =
      `照合候補の取得に失敗しました：${error.message}`;
    eposCandidates.value = [];
  } finally {
    loadingCandidates.value = false;
  }
}

const filteredEposCandidates = computed(() => {
  if (candidateFilter.value === "すべて") {
    return eposCandidates.value;
  }

  return eposCandidates.value.filter(
    item => item.status === candidateFilter.value
  );
});

function candidateCount(status) {
  return eposCandidates.value.filter(
    item => item.status === status
  ).length;
}

/**
 * 照合候補を選択し、確定前の確認画面を表示する。
 */
async function selectEposCandidate(statement, candidate) {
  if (!statement || !candidate) {
    errorMessage.value = "照合対象を選択してください。";
    return;
  }

  if (![201, 202].includes(Number(statement.accountCode))) {
    errorMessage.value = "対象のカードを確認してください。";
    return;
  }

  if (Number(candidate.rowNo) < 2 || !candidate.id) {
    errorMessage.value = "家計簿の取引情報が正しくありません。";
    return;
  }

  if (
    statement.status === "一致候補" ||
    statement.status === "要確認"
  ) {
    selectedCandidate.value = { statement, candidate };
    errorMessage.value = "";
    successMessage.value = "";

    // 確認エリアが表示されたあとにスクロール
    await nextTick();

    confirmSection.value?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

/**
 * 確認画面を閉じる。
 */
function cancelEposReconciliation() {
  selectedCandidate.value = null;
}
/**
 * 照合確定リクエストをGASへ送信する。
 */
async function confirmEposReconciliation() {
  if (!selectedCandidate.value) {
    errorMessage.value = "照合する取引が選択されていません。";
    return;
  }

  const { statement, candidate } = selectedCandidate.value;

  if (![201, 202].includes(Number(statement.accountCode))) {
    errorMessage.value = "カードの科目CDが不正です。";
    return;
  }

  confirmingReconciliation.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const payload = {
      accountCode: Number(statement.accountCode),
      statementId: String(statement.statementId),
      ledgerId: String(candidate.id)
    };

    const body = new URLSearchParams({
      mode: "confirmEposReconciliation",
      payload: JSON.stringify(payload)
    });

    const response = await fetch(GAS_URL, {
      method: "POST",
      body
    });

    const responseText = await response.text();

    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(
        "GASからJSON以外の応答が返りました。デプロイ先とdoPostを確認してください。"
      );
    }

    if (!response.ok || result.success !== true) {
      throw new Error(
        result.message || result.error || `HTTP ${response.status}`
      );
    }

    selectedCandidate.value = null;

    successMessage.value = result.message || "照合を確定しました。";

    // 最新の状態を取得する
    await loadTargets();
    await loadEposCandidates();

  } catch (error) {
    errorMessage.value = `照合の確定に失敗しました：${error.message}`;
  } finally {
    confirmingReconciliation.value = false;
  }
}
async function cancelConfirmedReconciliation(item) {
  if (cancellingReconciliation.value) return;

  if (!item?.id || ![201, 202].includes(Number(selectedAccountCode.value))) {
    errorMessage.value = "解除対象の情報が正しくありません。";
    return;
  }

  const confirmed = window.confirm(
    `この取引の照合を解除しますか？\n\n` +
    `日付：${item.date}\n` +
    `店：${item.shop || "店名なし"}\n` +
    `金額：${formatAmount(item.amount)}\n\n` +
    `解除後は、再度照合が必要になります。`
  );

  if (!confirmed) return;

  cancellingReconciliation.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    // GAS側で家計簿IDに対応するCSV明細を特定する
    const payload = {
      accountCode: Number(selectedAccountCode.value),
      ledgerId: String(item.id)
    };

    const body = new URLSearchParams({
      mode: "cancelEposReconciliation",
      payload: JSON.stringify(payload)
    });

    const response = await fetch(GAS_URL, {
      method: "POST",
      body
    });

    const responseText = await response.text();
    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error("GASから正しいJSON応答が返りませんでした。");
    }

    if (!response.ok || result.success !== true) {
      throw new Error(
        result.message || result.error || `HTTP ${response.status}`
      );
    }

    successMessage.value = result.message || "照合を解除しました。";

    await loadTargets();
    await loadEposCandidates();

  } catch (error) {
    errorMessage.value = `照合解除に失敗しました：${error.message}`;
  } finally {
    cancellingReconciliation.value = false;
  }
}
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

/* CSV照合結果表示 */
.reconciliation-candidates {
  margin-top: 24px;
}

.candidate-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}

.candidate-summary button {
  padding: 10px 14px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: white;
  cursor: pointer;
}

.candidate-card {
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 14px;
  margin: 12px 0;
  overflow-wrap: anywhere;
}

.candidate-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
}

.candidate-status {
  padding: 4px 8px;
  border-radius: 6px;
  background: #eee;
  font-size: 0.9rem;
}

.ledger-candidate {
  margin-top: 10px;
  padding: 10px;
  background: #f6f6f6;
  border-radius: 8px;
}

/* スクロール位置を調整 */
.reconciliation-confirm {
  scroll-margin-top: 20px;
}

@media (max-width: 600px) {
  .candidate-summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .candidate-summary button {
    width: 100%;
  }

  .candidate-card {
    padding: 12px;
  }
}
</style>