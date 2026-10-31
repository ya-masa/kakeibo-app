<template>
  <main class="reconciliation-page">
    <header class="page-header">
      <div>
        <h1>データ照合</h1>
        <p>家計簿の仕訳と銀行・カードの明細を照合します。</p>
      </div>

      <button
        class="cancel-btn button-secondary"
        :disabled="loading"
      >
        {{ loading ? "読込中..." : "再読み込み" }}
      </button>
    </header>

    <!-- エラー・メッセージ -->
    <p v-if="errorMessage" class="error errormessage">
      {{ errorMessage }}
    </p>

    <p v-if="successMessage" class="success successmessage">
      {{ successMessage }}
    </p>
    <!-- 照合モード切り替え -->
    <section class="panel">
      <h2>照合方法</h2>

      <div class="mode-switch">
        <button
          type="button"
          :class="['tab-btn', { 'active': reconciliationMode === 'csv' }]"
          @click="reconciliationMode = 'csv'"
        >
          CSV照合
        </button>

        <button
          type="button"
          :class="['tab-btn', { 'active': reconciliationMode === 'manual' }]"
          @click="reconciliationMode = 'manual'"
        >
          手照合
        </button>
      </div>
    </section>
    <!-- 口座・カード選択 -->
    <section class="card panel">
      <h2>照合する口座・カード</h2>
      <div class="filter-row">

        <label>
          口座・カード

          <select
            v-model="selectedAccountCode"
            class="select-field"
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
          <select
            v-model="selectedStatus"
            class="select-field"
            :class="statusFilterClass(selectedStatus)"
          >
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
            class="input-field"
            placeholder="店・内容・固有ID"
          />
        </label>
      </div>
    </section>

    <!-- 進捗カード -->
    <section class="summary-grid">
      <article class="card summary-card">
        <span>全仕訳</span>
        <strong>{{ targets.length }}</strong>
        <small>件</small>
      </article>

      <article class="card summary-card">
        <span>未照合</span>
        <strong>{{ countByStatus("未照合") }}</strong>
        <small>件</small>
      </article>

      <article class="card summary-card">
        <span>要確認</span>
        <strong>{{ countByStatus("要確認") }}</strong>
        <small>件</small>
      </article>

      <article class="card summary-card summary-card-done">
        <span>照合済み</span>
        <strong>{{ countByStatus("照合済み") }}</strong>
        <small>件</small>
      </article>

      <article class="card summary-card">
        <span>対象外</span>
        <strong>{{ countByStatus("対象外") }}</strong>
        <small>件</small>
      </article>
    </section>


    <!-- CSV取込 -->
    <section
      v-if="reconciliationMode === 'csv'"
      class="card panel"
    >
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
          class="input-field"
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
          class="btn-red"
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
        </div>      
      </div>

      <p v-if="selectedFile" class="file-name">
        選択中：{{ selectedFile.name }}
      </p>
      <p class="help-text">
        CSVの解析・保存・重複チェックは
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

      <div class="card confirm-comparison">
        <article class="card confirm-card">
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

        <article class="card confirm-card">
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
          type="button"class="cancel-btn"
          @click="cancelEposReconciliation"
          :disabled="confirmingReconciliation"
        >
          候補一覧に戻る
        </button>

        <button
          type="button"class="btn"
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
      v-if="
        !selectedCandidate &&
        [201, 202].includes(Number(selectedAccountCode))
      "
      class="card reconciliation-candidates"
    >
    <h2>エポスカード照合候補</h2>

      <p v-if="!selectedAccountCode">
        口座・カードを選択してください。
      </p>

      <template v-else-if="[201, 202].includes(Number(selectedAccountCode))">
        <div class="candidate-summary">
          <button type="button" class="tab-btn" @click="candidateFilter = 'すべて'">
            すべて {{ eposCandidates.length }}
          </button>

          <button type="button" class="tab-btn" @click="candidateFilter = '一致候補'">
            一致候補 {{ candidateCount('一致候補') }}
          </button>

          <button type="button" class="tab-btn" @click="candidateFilter = '要確認'">
            要確認 {{ candidateCount('要確認') }}
          </button>

          <button type="button" class="tab-btn" @click="candidateFilter = '未対応'">
            未対応 {{ candidateCount('未対応') }}
          </button>

          <button
            type="button" class="cancel-btn"
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
          class="card candidate-card"
        >
          <div class="candidate-heading">
            <span class="card candidate-status">{{ item.status }}</span>
          </div>
          <strong>{{ item.place || "利用先不明" }}</strong>
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
              class="card ledger-candidate"
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
                type="button" class="btn"
                @click="selectEposCandidate(item, candidate)"
              >
                この取引と照合
              </button>
            </div>
          </div>
          <button
            v-if="item.status === '未対応'"
            type="button" class="cancel-btn"
            @click="goToAddFromStatement(item)"
          >
            家計簿に入力
          </button>
          <p v-else>
            対応する家計簿データの候補は見つかりませんでした。
          </p>
        </article>
      </template>
    </section>


    <!-- 手照合用の確認カード -->
    <section
      v-if="reconciliationMode === 'manual'"
      class="card panel manual-reconciliation"
    >
      <div class="section-header">
        <div>
          <h2>手照合</h2>
          <p>レシートと家計簿の仕訳を見比べて確認します。</p>
        </div>
      </div>
      <!-- 手照合の絞り込みタブ -->
      <div class="manual-filter-tabs">
        <button
          type="button" class="tab-btn"
          :class="{ 'filter-selected': manualStatusFilter === 'すべて' }"
          @click="manualStatusFilter = 'すべて'"
        >
          すべて
          <span>{{ manualFilterCounts.all }}</span>
        </button>

        <button
          type="button" class="tab-btn"
          :class="{ 'filter-selected': manualStatusFilter === '未照合' }"
          @click="manualStatusFilter = '未照合'"
        >
          未照合
          <span>{{ manualFilterCounts.unmatched }}</span>
        </button>

        <button
          type="button" class="tab-btn"
          :class="{ 'filter-selected': manualStatusFilter === '照合済' }"
          @click="manualStatusFilter = '照合済'"
        >
          照合済
          <span>{{ manualFilterCounts.matched }}</span>
        </button>

        <button
          type="button" class="tab-btn"
          :class="{ 'filter-selected': manualStatusFilter === '重複登録' }"
          @click="manualStatusFilter = '重複登録'"
        >
          重複登録
          <span>{{ manualFilterCounts.duplicates }}</span>
        </button>
        <button
          type="button" class="tab-btn"
          :class="{ 'filter-selected': manualStatusFilter === '要確認' }"
          @click="manualStatusFilter = '要確認'"
        >
          要確認
          <span>{{ manualFilterCounts.review }}</span>
        </button>
      </div>

      <p v-if="!selectedAccountCode" class="empty-state">
        口座・カードを選択してください。
      </p>

      <p v-else-if="loading" class="empty-state">
        データを読み込んでいます……
      </p>

      <p v-else-if="filteredManualTargets.length === 0" class="empty-state">
        このタブに表示する仕訳がありません。
      </p>

      <div v-else class="manual-card-list">
        <article
          v-for="item in filteredManualTargets"
          :key="`manual-${item.id}-${item.rowNo}`"
          class="candidate-card manual-check-card"
        >
          <!-- ペア側の仕訳を左上に太字で表示 -->
          <div class="manual-card-heading">
            <strong class="manual-counterpart-title">
              {{ item.counterpart
                ? `${item.counterpart.large || '大項目なし'}‗${item.counterpart.small || '小項目なし'}`
                : 'ペア側の仕訳なし'
              }}
            </strong>

            <button
              type="button" class="cancel-btn"
              @click="goToEditFromManual(item)"
            >
              修正
            </button>
          </div>
          <div class="manual-check-details">
            <p>日付：{{ item.date }}</p>
            <p>金額：{{ formatAmount(item.amount) }}</p>
            <p>相手：{{ item.shop || '未登録' }}</p>
            <p v-if="item.content">内容：{{ item.content }}</p>
          </div>

          <p v-if="item.pairError" class="confirm-warning">
            {{ item.pairError }}
          </p>

          <p v-if="item.checkedAt">
            確認日時：{{ item.checkedAt }}
          </p>

          <!-- 一致確認 -->
          <label class="manual-check-label">
            <input
              type="checkbox"
              :checked="
                pendingManualChecks[String(item.id)]
                ?? (item.status === '照合済み')
              "
              :disabled="
                !!item.pairError || confirmingManualReconciliation
              "
              @change="onManualCheckChange($event, item)"
            />
            一致確認
          </label>

          <button
            :disabled="
              !!item.pairError ||
              confirmingManualReconciliation ||
              pendingManualChecks[String(item.id)] === undefined
            "
            @click="confirmManualReconciliation(item)"
            class="btn-red"
          >
            {{
              confirmingManualReconciliation
                ? "登録中…"
                : pendingManualChecks[String(item.id)]
                  ? "一致確認を登録"
                  : "照合解除"
            }}
          </button>
        </article>
      </div>
    </section>



    <!-- 仕訳一覧 -->
    <section class="card panel">
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
              :class="ledgerRowClass(item.status)"
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
                  type="button" class="btn-red"
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
  import { useRouter } from "vue-router"
  import loadingStore from "@/stores/loadingStore"

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

  //照合モード切替
  const reconciliationMode = ref("csv");

  //登録状態保存用
  const confirmingManualReconciliation = ref(false);

  // チェック状態を変更したが、まだ登録していない仕訳
  const pendingManualChecks = ref({});

  // 非同期リクエストの競合防止用
  let targetsRequestId = 0;
  let candidatesRequestId = 0;

  const router = useRouter()

  const goToAddFromStatement = (item) => {
    sessionStorage.setItem(
      "reconciliationData",
      JSON.stringify({
        mode:"csvadd",
        statementId: item.statementId,
        accountCode: item.accountCode,
        date: item.date,
        place: item.place,
        content: item.content,
        amount: item.amount,
        jump: "reconciliation"
      })
    )

    router.push("/add")
  }


  const goToEditFromManual = (item) => {
    router.push({
      path: "/edit",
      query: {
        rowNo: item.rowNo,
        id: item.id,
        jump: "reconciliation"
      }
    })
  }

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
    }
    finally{
      loadingStore.globalLoading.value = false
    }
  }

  watch(reconciliationMode, async () => {
    // 前のモードのデータを無効化
    ++targetsRequestId;
    ++candidatesRequestId;

    targets.value = [];
    eposCandidates.value = [];
    selectedCandidate.value = null;

    errorMessage.value = "";
    successMessage.value = "";

    await loadTargets();

    // CSV照合モードで、エポスカードを選択中なら候補を再取得
    if (
      reconciliationMode.value === "csv" &&
      [201, 202].includes(Number(selectedAccountCode.value))
    ) {
      await loadEposCandidates();
    }
  });

  /**
   * 選択した科目CDの照合対象を取得する。
   */
  async function loadTargets() {
    const requestId = ++targetsRequestId;
    const accountCode = String(selectedAccountCode.value || "");

    if (!accountCode) {
      targets.value = [];
      loading.value = false;
      return;
    }

    // 前の口座のデータを残さない
    targets.value = [];
    loading.value = true;
    errorMessage.value = "";
    successMessage.value = "";

    try {
      const data = await fetchGas({
        list: reconciliationMode.value === "manual"
          ? "manualReconciliationTargets"
          : "reconciliationTargets",
        accountCode
      });

      // 後から返ってきた古い応答は反映しない
      if (
        requestId !== targetsRequestId ||
        accountCode !== String(selectedAccountCode.value || "")
      ) {
        return;
      }

      if (!Array.isArray(data)) {
        throw new Error("照合対象のデータ形式が正しくありません。");
      }

      targets.value = data;
    } catch (error) {
      if (
        requestId !== targetsRequestId ||
        accountCode !== String(selectedAccountCode.value || "")
      ) {
        return;
      }

      targets.value = [];
      errorMessage.value =
        `照合対象の取得に失敗しました：${error.message}`;
    } finally {
      // 最新のリクエストだけがローディングを解除する
      if (requestId === targetsRequestId) {
        loading.value = false;
      }
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
       * 現在選択されている照合状態を示すクラス。
       */
      function statusFilterClass(status) {
        return {
          "filter-selected": selectedStatus.value === status
        };
      }

    /**
     * 仕訳行の状態に応じたクラスを返す。
     */
    function ledgerRowClass(status) {
      return {
        "ledger-row-done": status === "照合済み",
        "ledger-row-review": status === "要確認",
        "ledger-row-excluded": status === "対象外"
      };
    }


  /**
   * CSVファイルの選択状態だけを管理する。
   * 実際の取込処理はGAS API実装後に接続する。
   */
  watch(selectedAccountCode, async () => {
    // 口座変更前の処理が残っていても、古い応答を無効化する
    ++targetsRequestId;
    ++candidatesRequestId;

    targets.value = [];
    eposCandidates.value = [];
    selectedCandidate.value = null;

    selectedFile.value = null;
    csvRows.value = [];
    csvPreview.value = [];
    csvEncoding.value = "";

    candidateFilter.value = "すべて";

    errorMessage.value = "";
    successMessage.value = "";

    if (csvInput.value) {
      csvInput.value.value = "";
    }

    // 仕訳一覧を取得
    await loadTargets();

    // エポスカードの場合だけ照合候補を取得
    if (
      reconciliationMode.value === "csv" &&
      [201, 202].includes(Number(selectedAccountCode.value))
    ) {
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
      await loadEposCandidates();

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

  function onManualCheckChange(event, item) {
    if (confirmingManualReconciliation.value) return;

    const id = String(item.id);
    const checked = event.target.checked;
    const currentChecked = item.status === "照合済み";

    const next = { ...pendingManualChecks.value };

    // 元の状態に戻したら、未登録の変更を取り消す
    if (checked === currentChecked) {
      delete next[id];
    } else {
      next[id] = checked;
    }

    pendingManualChecks.value = next;
  }

  async function confirmManualReconciliation(item) {
    if (confirmingManualReconciliation.value) return;

    const id = String(item.id);
    const checked = pendingManualChecks.value[id];

    // 未変更の仕訳は送信しない
    if (checked === undefined) return;

    if (item.pairError) {
      errorMessage.value = item.pairError;
      return;
    }

    confirmingManualReconciliation.value = true;
    errorMessage.value = "";
    successMessage.value = "";

    try {
      const payload = {
        id,
        checked
      };

      const body = new URLSearchParams({
        mode: "confirmManualReconciliation",
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

      // 最新状態を取得
      await loadTargets();

      // 成功した仕訳の未登録変更をクリア
      const next = { ...pendingManualChecks.value };
      delete next[id];
      pendingManualChecks.value = next;

      successMessage.value =
        result.message ||
        (checked ? "一致確認を登録しました。" : "照合を解除しました。");

    } catch (error) {
      errorMessage.value =
        `照合の更新に失敗しました：${error.message}`;
    } finally {
      confirmingManualReconciliation.value = false;
    }
  }


  // 手照合専用の絞り込み状態
const manualStatusFilter = ref("すべて");

// 科目CDを文字列に統一
function normalizeSubjectCode(item) {
  return String(item?.accountCode ?? "").trim();
}

// 固有IDの9・10文字目が「00」か判定
function isInitialBalance(item) {
  const id = String(item?.id ?? "").trim();

  return id.length >= 10 && id.slice(8, 10) === "00";
}

// 手照合に表示できる仕訳
// ① ペア側の科目CDが499・599のものを除外
// ② 初期残高（固有IDの9・10文字目が00）を除外
const manualEligibleTargets = computed(() => {
  return targets.value.filter(item => {
    const counterpartCode = normalizeSubjectCode(
      item.counterpart
    );

    // ペア側が存在し、科目CDが499または599なら除外
    if (["499", "599"].includes(counterpartCode)) {
      return false;
    }

    // 初期残高は除外
    if (isInitialBalance(item)) {
      return false;
    }

    return true;
  });
});

// 手照合用の表示データ
const filteredManualTargets = computed(() => {
  const items = manualEligibleTargets.value;

  switch (manualStatusFilter.value) {
    case "未照合":
      return items.filter(item => item.status === "未照合");

    case "照合済":
      return items.filter(item => item.status === "照合済み");

    case "重複登録":
      return items.filter(
        item => manualDuplicateIds.value.has(String(item.id))
      );

    case "要確認":
      return items.filter(
        item => manualReviewIds.value.has(String(item.id))
      );

    default:
      return items;
  }
});

// タブの件数
const manualFilterCounts = computed(() => {
  const items = manualEligibleTargets.value;

  return {
    all: items.length,

    unmatched: items.filter(
      item => item.status === "未照合"
    ).length,

    matched: items.filter(
      item => item.status === "照合済み"
    ).length,

    duplicates: items.filter(
      item => manualDuplicateIds.value.has(String(item.id))
    ).length,

    review: items.filter(
      item => manualReviewIds.value.has(String(item.id))
    ).length
  };
});
// 自分とペア相手の科目CDを、順序に依存しない比較キーにする
function manualSubjectPairKey(item) {
  const ownCode = String(item.accountCode ?? "").trim();
  const counterpartCode = String(
    item.counterpart?.accountCode ?? ""
  ).trim();

  // ペア相手が特定できない仕訳は判定対象外
  if (!ownCode || !counterpartCode) return "";

  return [ownCode, counterpartCode].sort().join("|");
}

// 金額を数値に統一
function manualAmountKey(item) {
  const amount = Number(item.amount);
  return Number.isFinite(amount) ? amount : null;
}

// 日付を比較用の YYYY-MM-DD 形式に正規化
function normalizeManualDate(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  // YYYY-MM-DD、YYYY/MM/DD、YYYY年M月D日、日時付きISO文字列に対応
  const match = text.match(
    /^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})(?:日)?/
  );

  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, "0");
    const day = match[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return text;
}

// 店名を比較用に正規化
function normalizeManualShop(value) {
  return String(value ?? "").trim();
}

// 重複登録：日付・金額・科目CDの組み合わせ・店名が一致
const manualDuplicateIds = computed(() => {
  const groups = new Map();

  for (const item of manualEligibleTargets.value) {
    const date = normalizeManualDate(item.date);
    const subjectPair = manualSubjectPairKey(item);
    const shop = normalizeManualShop(item.shop);
    const amount = manualAmountKey(item);

    // 必須項目が不足している仕訳は対象外
    if (!date || !subjectPair || !shop || amount === null) {
      continue;
    }

    const key = [
      date,
      subjectPair,
      shop,
      amount
    ].join("||");

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(item);
  }

  const ids = new Set();

  for (const group of groups.values()) {
    if (group.length > 1) {
      group.forEach(item => {
        ids.add(String(item.id));
      });
    }
  }

  return ids;
});

// 要確認：日付・科目CDの組み合わせ・店名が一致し、金額が異なる
const manualReviewIds = computed(() => {
  const groups = new Map();

  for (const item of manualEligibleTargets.value) {
    const date = normalizeManualDate(item.date);
    const subjectPair = manualSubjectPairKey(item);
    const shop = normalizeManualShop(item.shop);
    const amount = manualAmountKey(item);

    // 必須項目が不足している仕訳は対象外
    if (!date || !subjectPair || !shop || amount === null) {
      continue;
    }

    const key = [
      date,
      subjectPair,
      shop
    ].join("||");

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(item);
  }

  const ids = new Set();

  for (const group of groups.values()) {
    const amounts = new Set(
      group.map(item => manualAmountKey(item))
    );

    if (group.length > 1 && amounts.size > 1) {
      group.forEach(item => {
        ids.add(String(item.id));
      });
    }
  }

  return ids;
});
</script>

<style scoped>
/* 照合画面：情報の優先順位を整理し、スマートフォンでは縦に間延びさせない */
.reconciliation-page {
  box-sizing: border-box;
  width: 100%;
  max-width: 1120px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 18px 16px 24px;
  color: var(--color-text, #30271f);
  background: var(--color-background, #f7f4ec);
}

.reconciliation-page *,
.reconciliation-page *::before,
.reconciliation-page *::after {
  box-sizing: border-box;
}

.page-header,
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.page-header { margin-bottom: 18px; }
.page-header > div { min-width: 0; }
.page-header h1 {
  margin: 0 0 4px;
  color: var(--color-coffee-dark, #4a2e1d);
  font-size: clamp(22px, 5vw, 27px);
  line-height: 1.3;
}
.page-header p,
.section-header p {
  margin: 0;
  color: var(--color-muted, #82776b);
  font-size: 13px;
  line-height: 1.5;
}

.reconciliation-page h2 {
  margin: 0 0 10px;
  color: var(--color-coffee-dark, #4a2e1d);
  font-size: 17px;
  line-height: 1.4;
}
.reconciliation-page h3 { margin: 0 0 8px; font-size: 15px; }
.reconciliation-page p {
  margin: 4px 0;
  color: var(--color-muted, #82776b);
  font-size: 13px;
  line-height: 1.5;
}

/* 共通カード */
.reconciliation-page .card {
  min-width: 0;
  margin: 0 auto 14px;
  padding: 16px;
  background: var(--color-surface, #fffefa);
  border: 1px solid var(--color-border, #e7e0d4);
  border-radius: 16px;
  box-shadow: var(--shadow-card, 0 2px 10px rgb(65 45 26 / 5%));
}
.reconciliation-page .panel { margin-bottom: 14px; }

/* 照合方法 */
.mode-switch {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.mode-switch button {
  flex: 1 1 0;
  min-width: 0;
  min-height: 44px;
  padding: 9px 12px;
  border: 1px solid var(--color-border, #e7e0d4);
  border-radius: 11px;
  background: var(--color-surface, #fffefa);
  color: var(--color-muted, #82776b);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
}
.mode-switch button.active {
  border-color: var(--color-yellow, #f5cf58);
  background: var(--color-yellow-soft, #fff4cd);
  color: var(--color-coffee-dark, #4a2e1d);
}

/* 絞り込み */
.filter-row {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr) minmax(0, 1fr);
  gap: 12px;
  margin-top: 12px;
}
.filter-row label {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
  color: var(--color-coffee, #65432d);
  font-size: 12px;
  font-weight: 700;
}
.filter-row select,
.filter-row input[type="search"] {
  display: block;
  width: 100%;
  min-width: 0;
  min-height: 44px;
  margin: 0;
  padding: 9px 11px;
  border: 1px solid var(--color-border-strong, #d8cdbb);
  border-radius: 10px;
  background: var(--color-surface-strong, #fff);
  color: var(--color-text, #30271f);
  font: inherit;
  font-size: 14px;
}
.filter-row input::placeholder { color: #9a9084; }

/* 進捗：スマホでは2列、最後の項目は横長にして孤立させない */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.reconciliation-page .summary-card {
  display: flex;
  min-height: 94px;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  margin: 0;
  padding: 12px;
}
.summary-card span,
.summary-card small {
  display: block;
  color: var(--color-muted, #82776b);
  font-size: 12px;
}
.summary-card strong {
  display: block;
  margin: 2px 0 0;
  color: var(--color-coffee-dark, #4a2e1d);
  font-size: 25px;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}
.reconciliation-page .summary-card-done {
  background: var(--color-success-bg, #eaf3ec);
  border-color: #cfe0d2;
}
.summary-card-done strong { color: var(--color-success, #47765a); }

/* CSV取込 */
.csv-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  margin-top: 12px;
}
.csv-row > input[type="file"] {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 44px;
  margin: 0;
  padding: 8px;
  border: 1px solid var(--color-border, #e7e0d4);
  border-radius: 10px;
  background: var(--color-surface-soft, #f3eee2);
  font-size: 13px;
}
.csv-row .btn-red {
  width: 100%;
  min-height: 46px;
  margin: 0;
}
.file-name { margin-top: 8px; color: var(--color-coffee, #65432d); overflow-wrap: anywhere; }
.help-text { margin-top: 10px !important; font-size: 12px !important; }
.result-count {
  flex: 0 0 auto;
  padding: 5px 9px;
  border-radius: 999px;
  background: var(--color-surface-soft, #f3eee2);
  color: var(--color-coffee, #65432d);
  font-size: 12px;
  font-weight: 700;
}

/* 候補・確認 */
.reconciliation-candidates { margin-top: 0; }
.candidate-summary { display: flex; flex-wrap: wrap; gap: 7px; margin: 10px 0; }
.candidate-summary button,
.manual-filter-tabs button {
  min-height: 36px;
  padding: 7px 11px;
  border: 1px solid var(--color-border, #e7e0d4);
  border-radius: 9px;
  background: var(--color-surface, #fffefa);
  color: var(--color-coffee, #65432d);
  font-size: 12px;
  font-weight: 650;
}
.candidate-card {
  margin: 10px 0 !important;
  padding: 13px !important;
  overflow-wrap: anywhere;
}
.candidate-heading,
.manual-card-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.candidate-status {
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--color-surface-soft, #f3eee2);
  color: var(--color-coffee, #65432d);
  font-size: 11px;
  font-weight: 700;
}
.ledger-candidate {
  margin-top: 9px !important;
  padding: 11px !important;
  background: var(--color-surface-soft, #f3eee2) !important;
}
.reconciliation-confirm { scroll-margin-top: 16px; }
.confirm-comparison {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.reconciliation-page .confirm-card {
  margin: 0;
  padding: 13px;
  background: var(--color-surface-soft, #f3eee2);
}
.confirm-warning {
  padding: 10px 12px;
  border: 1px solid #ead89c;
  border-radius: 10px;
  background: var(--color-yellow-soft, #fff4cd);
  color: var(--color-warning, #8b6500) !important;
}
.confirm-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }

/* 手照合 */
.manual-reconciliation { min-width: 0; }
.manual-filter-tabs {
  display: flex;
  gap: 7px;
  margin: 12px 0;
  overflow-x: auto;
  padding-bottom: 3px;
  -webkit-overflow-scrolling: touch;
}
.manual-filter-tabs button { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px; }
.manual-filter-tabs button.filter-selected {
  border-color: var(--color-yellow, #f5cf58);
  background: var(--color-yellow-soft, #fff4cd);
  color: var(--color-coffee-dark, #4a2e1d);
}
.manual-filter-tabs button span {
  display: inline-flex;
  min-width: 19px;
  height: 19px;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--color-surface-soft, #f3eee2);
  font-size: 11px;
}
.manual-card-list { display: grid; gap: 9px; }
.reconciliation-page .manual-check-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 13px;
}
.manual-counterpart-title { font-size: 14px; font-weight: 750; text-align: left; }
.manual-check-details { padding-left: 10px; border-left: 2px solid var(--color-border, #e7e0d4); }
.manual-check-details p { margin: 3px 0; }
.manual-check-label {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  color: var(--color-coffee-dark, #4a2e1d);
  font-weight: 700;
  cursor: pointer;
}
.manual-check-label input { width: 18px; height: 18px; accent-color: var(--color-success, #47765a); }

/* 仕訳一覧 */
.table-wrapper { width: 100%; margin-top: 10px; overflow-x: auto; }
.table-wrapper table { width: 100%; min-width: 900px; border-collapse: collapse; white-space: nowrap; font-size: 12px; }
.table-wrapper th,
.table-wrapper td { padding: 10px 9px; border-bottom: 1px solid var(--color-border, #e7e0d4); text-align: left; }
.table-wrapper th { background: var(--color-surface-soft, #f3eee2); color: var(--color-coffee, #65432d); font-weight: 750; }
.table-wrapper tbody tr.ledger-row-done { background: #f1f5ed; }
.table-wrapper tbody tr.ledger-row-review { background: #fbf5e9; }
.table-wrapper tbody tr.ledger-row-excluded { color: #77716b; background: #f2efeb; }
.content-cell { min-width: 150px; white-space: normal; overflow-wrap: anywhere; }
.number-cell { text-align: right !important; font-variant-numeric: tabular-nums; }
.amount-positive { color: var(--color-success, #47765a); }
.amount-negative { color: var(--color-danger, #b33d36); }
.id-cell { font-family: monospace; }
.status-badge { display: inline-flex; padding: 4px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
.status-unchecked { background: #eee7df; color: var(--color-muted, #82776b); }
.status-done { background: #e3eee3; color: var(--color-success, #47765a); }
.status-review { background: #f5ead5; color: var(--color-warning, #8b6500); }
.status-mismatch { background: #f6e2df; color: var(--color-danger, #b33d36); }
.status-excluded { background: #e9e4de; color: var(--color-muted, #82776b); }
.empty-state { padding: 22px 12px; color: var(--color-muted, #82776b); text-align: center; }

@media (max-width: 900px) {
  .summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .filter-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .filter-row .search-field { grid-column: 1 / -1; }
}

@media (max-width: 600px) {
  .reconciliation-page { padding: 14px 12px 20px; }
  .page-header { align-items: center; margin-bottom: 14px; }
  .page-header .button-secondary { flex: 0 0 auto; min-height: 38px; padding: 7px 10px; font-size: 12px; }
  .page-header p { max-width: 245px; font-size: 12px; }
  .reconciliation-page .card { padding: 13px; margin-bottom: 11px; border-radius: 14px; }
  .reconciliation-page .panel { margin-bottom: 11px; }
  .mode-switch { gap: 7px; }
  .mode-switch button { min-height: 42px; padding: 8px; font-size: 13px; }
  .filter-row { grid-template-columns: minmax(0, 1fr); gap: 9px; }
  .filter-row .search-field { grid-column: auto; }
  .filter-row label { gap: 4px; }
  .filter-row select,
  .filter-row input[type="search"] { min-height: 42px; }
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .reconciliation-page .summary-card { min-height: 78px; padding: 10px 11px; }
  .summary-card strong { font-size: 23px; }
  .reconciliation-page .summary-card:last-child {
    grid-column: 1 / -1;
    min-height: 58px;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 10px 13px;
  }
  .summary-card:last-child strong { margin: 0 auto 0 12px; }
  .summary-card:last-child small { margin-left: 5px; }
  .confirm-comparison { grid-template-columns: minmax(0, 1fr); }
  .confirm-actions button { flex: 1 1 100%; }
  .candidate-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .candidate-summary button { width: 100%; }
  .manual-filter-tabs { margin-right: -2px; }
}

@media (prefers-reduced-motion: reduce) {
  .reconciliation-page *,
  .reconciliation-page *::before,
  .reconciliation-page *::after { transition-duration: .01ms !important; }
}
</style>