
<template>
  <main class="balance-confirm-page">
    <header class="page-header">
      <button
        type="button"
        class="back-button"
        @click="goBack"
      >
        ‹ 戻る
      </button>

      <h1 class="page-title">
        <Wallet :size="25" :stroke-width="2.2" aria-hidden="true" />
        <span>残高の確定</span>
      </h1>
      <p class="page-description">
        指定した日付の残高を確定し、その後の残高計算の基準にします。
      </p>
    </header>

    <!-- メッセージ -->
    <div
      v-if="errorMessage"
      class="message error-message"
      role="alert"
    >
      {{ errorMessage }}
    </div>

    <div
      v-if="successMessage"
      class="message success-message"
      role="status"
    >
      {{ successMessage }}
    </div>

    <!-- 口座選択 -->
    <section class="card">
      <h2>口座を選択</h2>

      <label
        for="account-select"
        class="field-label label-with-icon"
      >
        <Wallet :size="17" aria-hidden="true" />
        <span>口座・カード</span>
      </label>

      <select
        id="account-select"
        v-model="selectedAccountCode"
        class="select-field form-control"
        :disabled="loadingAccounts || saving"
        @change="onAccountChange"
      >
        <option value="">
          口座・カードを選択
        </option>

        <option
          v-for="account in accounts"
          :key="account.code"
          :value="String(account.code)"
        >
          {{ account.name }}（{{ account.code }}）
        </option>
      </select>

      <p
        v-if="loadingAccounts"
        class="message sub-message"
      >
        口座一覧を読み込み中…
      </p>
    </section>

    <!-- 登録・更新フォーム -->
    <section
      ref="formSection"
      class="card"
    >
      <h2>
        {{ editingPairId ? "確定残高の更新" : "確定残高を登録" }}
      </h2>

      <p
        v-if="!selectedAccountCode"
        class="empty-message"
      >
        先に口座を選択してください。
      </p>

      <form
        v-else
        class="balance-form"
        @submit.prevent="saveBalanceConfirm"
      >
        <!-- 確定日 -->
        <div class="form-field">
          <label
            for="confirm-date"
            class="field-label label-with-icon"
          >
            <CalendarDays :size="17" aria-hidden="true" />
            <span>確定日</span>
          </label>

          <input
            id="confirm-date"
            v-model="form.date"
            type="date"
            class="input-field form-control"
            aria-label="確定日を選択"
            required
            :disabled="saving"
          />

          <p class="field-note">
            残高を確認した日付を選択してください。
          </p>
        </div>

        <!-- 確定残高 -->
        <div class="form-field">
          <label
            for="confirm-balance"
            class="field-label label-with-icon"
          >
            <JapaneseYen :size="17" aria-hidden="true" />
            <span>確定残高</span>
          </label>

          <div class="amount-input-wrap">
            <input
              id="confirm-balance"
              v-model="form.confirmedBalance"
              type="number"
              step="1"
              inputmode="numeric"
              class="input-field form-control amount-input"
              placeholder="金額を入力（例：125000）"
              required
              :disabled="saving"
            />
            <span class="amount-unit">円</span>
          </div>

          <p class="field-note">
            0円も登録できます。実際に確認した残高を入力してください。
          </p>
        </div>

        <!-- メモ -->
        <div class="form-field">
          <label
            for="confirm-memo"
            class="field-label label-with-icon"
          >
            <NotebookPen :size="17" aria-hidden="true" />
            <span>メモ（任意）</span>
          </label>

          <textarea
            id="confirm-memo"
            v-model="form.memo"
            class="textarea-field form-control memo-input"
            rows="2"
            maxlength="500"
            placeholder="残高確認時のメモを入力（任意）"
            :disabled="saving"
          />
        </div>

        <!-- 登録・更新ボタン -->
        <div class="form-actions">
          <button
            type="submit"
            class="btn primary-button"
            :disabled="saving"
          >
            {{
              saving
                ? "処理中…"
                : editingPairId
                  ? "更新する"
                  : "残高を確定する"
            }}
          </button>

          <button
            v-if="editingPairId"
            type="button"
            class="cancel-btn secondary-button"
            :disabled="saving"
            @click="cancelEdit"
          >
            キャンセル
          </button>
        </div>
      </form>
    </section>

    <!-- 登録済み一覧 -->
    <section class="card">
      <div class="list-header">
        <div>
          <h2>確定履歴</h2>
          <p class="sub-message">
            {{
              selectedAccountCode
                ? "選択中の口座の確定履歴です。"
                : "口座を選択すると履歴が表示されます。"
            }}
          </p>
        </div>

        <button
          v-if="selectedAccountCode"
          type="button"
          class="btn refresh-button"
          :disabled="loadingList || saving"
          @click="loadConfirmList"
        >
          再読み込み
        </button>
      </div>

      <div
        v-if="loadingList"
        class="message loading-message"
      >
        確定履歴を読み込み中…
      </div>

      <div
        v-else-if="!selectedAccountCode"
        class="empty-message"
      >
        口座を選択してください。
      </div>

      <div
        v-else-if="confirmList.length === 0"
        class="empty-message"
      >
        この口座の確定履歴はありません。
      </div>

      <div
        v-else
        class="confirm-list"
      >
        <article
          v-for="item in confirmList"
          :key="item.pairId"
          class="confirm-item"
        >
          <div class="confirm-item-main">
            <div class="confirm-date">
              {{ formatDate(item.date) }}
            </div>

            <div class="confirm-amount">
              {{ formatAmount(item.confirmedBalance) }}円
            </div>

            <p
              v-if="item.memo"
              class="confirm-memo"
            >
              {{ item.memo }}
            </p>
          </div>

          <div class="confirm-item-actions">
            <button
              type="button"
              class="btn edit-button"
              :disabled="saving || deletingPairId === item.pairId"
              @click="startEdit(item)"
            >
              編集
            </button>

            <button
              type="button"
              class="btn-red delete-button"
              :disabled="saving || deletingPairId === item.pairId"
              @click="deleteConfirm(item)"
            >
              {{
                deletingPairId === item.pairId
                  ? "削除中…"
                  : "削除"
              }}
            </button>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import {
  Wallet,
  CalendarDays,
  JapaneseYen,
  NotebookPen
} from "lucide-vue-next";
import { GAS_URL } from "@/constants/index.js";

const router = useRouter();

const accounts = ref([]);
const selectedAccountCode = ref("");

const confirmList = ref([]);

const loadingAccounts = ref(false);
const loadingList = ref(false);
const saving = ref(false);
const deletingPairId = ref("");

const errorMessage = ref("");
const successMessage = ref("");

const editingPairId = ref("");
const formSection = ref(null);

const form = reactive({
  date: getTodayString(),
  confirmedBalance: "",
  memo: ""
});


/**
 * 今日の日付をYYYY-MM-DD形式で取得する。
 */
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


/**
 * GASのGET APIを呼び出す。
 * 既存のAPIと同じく、クエリパラメータで指定する。
 */
async function fetchGas(params) {
  if (!GAS_URL || GAS_URL === "YOUR_GAS_WEB_APP_URL") {
    throw new Error("GAS_URLが設定されていません。");
  }

  const url = new URL(GAS_URL);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(
      `GASへの接続に失敗しました（HTTP ${response.status}）。`
    );
  }

  const responseText = await response.text();

  let result;

  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(
      "GASからJSON以外の応答が返りました。デプロイ先を確認してください。"
    );
  }

  if (result?.error) {
    throw new Error(result.details || result.error);
  }

  return result;
}


/**
 * GASのPOST APIを呼び出す。
 * 既存APIと同じくURLSearchParamsでmodeとpayloadを送信する。
 */
async function postGas(mode, payload) {
  if (!GAS_URL || GAS_URL === "YOUR_GAS_WEB_APP_URL") {
    throw new Error("GAS_URLが設定されていません。");
  }

  const body = new URLSearchParams({
    mode: mode,
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
      "GASからJSON以外の応答が返りました。doPostとデプロイ先を確認してください。"
    );
  }

  if (!response.ok || result.success !== true) {
    throw new Error(
      result.message ||
      result.error ||
      `GASの処理に失敗しました（HTTP ${response.status}）。`
    );
  }

  return result;
}


/**
 * 口座・カード一覧を取得する。
 */
async function loadAccounts() {
  loadingAccounts.value = true;
  errorMessage.value = "";

  try {
    const data = await fetchGas({
      list: "reconciliationAccounts"
    });

    if (!Array.isArray(data)) {
      throw new Error("口座一覧のデータ形式が正しくありません。");
    }

    accounts.value = data
      .map(item => {
        const code = Number(
          item.accountCode ??
          item.code ??
          item.kamokuCode
        );

        const name = String(
          item.accountName ??
          item.name ??
          item.kamokuName ??
          item.small ??
          item.syoKamokuName ??
          ""
        );

        return {
          code,
          name
        };
      })
      .filter(item =>
        Number.isInteger(item.code) &&
        item.code >= 100 &&
        item.code <= 299
      );

  } catch (error) {
    errorMessage.value =
      `口座一覧の取得に失敗しました：${error.message}`;
  } finally {
    loadingAccounts.value = false;
  }
}


/**
 * 口座選択時の処理。
 */
async function onAccountChange() {
  errorMessage.value = "";
  successMessage.value = "";

  cancelEdit();
  await loadConfirmList();
}


/**
 * 選択中の口座の確定履歴を取得する。
 */
async function loadConfirmList() {
  if (!selectedAccountCode.value) {
    confirmList.value = [];
    return;
  }

  loadingList.value = true;
  errorMessage.value = "";

  try {
    const data = await fetchGas({
      list: "balanceConfirmList",
      accountCode: selectedAccountCode.value
    });

    if (!Array.isArray(data)) {
      throw new Error("確定履歴のデータ形式が正しくありません。");
    }

    confirmList.value = data
      .map(item => ({
        ...item,
        pairId: String(item.pairId || ""),
        accountCode: Number(item.accountCode),
        date: normalizeDate(item.date),
        confirmedBalance: Number(item.confirmedBalance),
        memo: String(item.memo || "")
      }))
      .filter(item =>
        item.pairId &&
        Number.isFinite(item.confirmedBalance)
      );

  } catch (error) {
    confirmList.value = [];
    errorMessage.value =
      `確定履歴の取得に失敗しました：${error.message}`;
  } finally {
    loadingList.value = false;
  }
}


/**
 * 日付をYYYY-MM-DD形式にそろえる。
 */
function normalizeDate(value) {
  if (!value) return "";

  const text = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return text;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


/**
 * 新規登録または更新を実行する。
 */
async function saveBalanceConfirm() {
  if (saving.value) return;

  errorMessage.value = "";
  successMessage.value = "";

  if (!selectedAccountCode.value) {
    errorMessage.value = "口座を選択してください。";
    return;
  }

  if (!form.date) {
    errorMessage.value = "確定日を入力してください。";
    return;
  }

  if (
    form.confirmedBalance === "" ||
    form.confirmedBalance === null ||
    !Number.isFinite(Number(form.confirmedBalance))
  ) {
    errorMessage.value = "確定残高を正しく入力してください。";
    return;
  }

  const payload = {
    accountCode: Number(selectedAccountCode.value),
    date: form.date,
    confirmedBalance: Number(form.confirmedBalance),
    memo: form.memo.trim()
  };

  saving.value = true;

  try {
    if (editingPairId.value) {
      payload.pairId = editingPairId.value;

      await postGas("balanceConfirmUpdate", payload);

      successMessage.value = "確定残高を更新しました。";
    } else {
      await postGas("balanceConfirmAdd", payload);

      successMessage.value = "確定残高を登録しました。";
    }

    cancelEdit();
    await loadConfirmList();

  } catch (error) {
    errorMessage.value =
      `確定残高の保存に失敗しました：${error.message}`;
  } finally {
    saving.value = false;
  }
}


/**
 * 編集モードにする。
 * フォーム位置までスクロールする。
 */
async function startEdit(item) {
  errorMessage.value = "";
  successMessage.value = "";

  editingPairId.value = item.pairId;

  form.date = item.date;
  form.confirmedBalance = String(item.confirmedBalance);
  form.memo = item.memo || "";

  await nextTick();

  formSection.value?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


/**
 * 編集をキャンセルし、新規登録状態に戻す。
 */
function cancelEdit() {
  editingPairId.value = "";
  form.date = getTodayString();
  form.confirmedBalance = "";
  form.memo = "";
}


/**
 * 確定残高を削除する。
 * GAS側でペアIDに対応する2行を削除する。
 */
async function deleteConfirm(item) {
  if (saving.value || deletingPairId.value) return;

  const confirmed = window.confirm(
    "この確定残高を削除しますか？\n\n" +
    "関連する調整取引も削除され、口座残高と月初残高が再計算されます。\n\n" +
    "この操作は取り消せません。"
  );

  if (!confirmed) return;

  errorMessage.value = "";
  successMessage.value = "";
  deletingPairId.value = item.pairId;

  try {
    await postGas("balanceConfirmDelete", {
      pairId: item.pairId
    });

    if (editingPairId.value === item.pairId) {
      cancelEdit();
    }

    successMessage.value = "確定残高を削除しました。";

    await loadConfirmList();

  } catch (error) {
    errorMessage.value =
      `確定残高の削除に失敗しました：${error.message}`;
  } finally {
    deletingPairId.value = "";
  }
}


/**
 * 金額表示。
 */
function formatAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits: 0
  }).format(amount);
}


/**
 * 日付表示。
 */
function formatDate(value) {
  if (!value) return "日付不明";

  const parts = String(value).split("-");

  if (parts.length !== 3) {
    return String(value);
  }

  return `${parts[0]}/${Number(parts[1])}/${Number(parts[2])}`;
}


/**
 * 前の画面に戻る。
 */
function goBack() {
  router.back();
}


onMounted(async () => {
  await loadAccounts();
});
</script>

<style scoped>
/* =========================================
   残高確定画面
   共通色・余白・カード・入力欄はBase.cssを使用
========================================= */

.balance-confirm-page {
  width: 100%;
  max-width: var(--content-width);
  min-width: 0;
  margin: 0 auto;
  padding: 0 0 var(--space-4);
  color: var(--color-text);
}

.page-header {
  display: block;
  margin-bottom: var(--space-4);
}

.back-button {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 6px 10px 6px 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-coffee);
  font-size: 14px;
  font-weight: 650;
}

.back-button:hover {
  color: var(--color-coffee-dark);
}

.page-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: var(--space-2) 0 var(--space-2);
  color: var(--color-text);
  font-size: clamp(22px, 5vw, 28px);
  font-weight: 750;
  line-height: 1.3;
  letter-spacing: -.035em;
}

.page-title svg,
.label-with-icon svg {
  flex: 0 0 auto;
  color: var(--color-coffee);
}

.page-description {
  margin: 0;
  color: var(--color-muted);
  font-size: 13px;
  line-height: 1.65;
}

/* Base.cssの.cardを利用 */
.balance-confirm-page > .card {
  margin-bottom: var(--space-4);
}

/* ラベルとアイコン */
.field-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-2);
  color: var(--color-text);
  font-size: 13px;
  font-weight: 700;
}

.label-with-icon {
  white-space: nowrap;
}

.label-with-icon svg {
  width: 17px;
  height: 17px;
}

/* Base.cssのinput-field / select-field / textarea-fieldを基準にする */
.form-control {
  width: 100%;
  min-width: 0;
  margin-bottom: 0;
}

.form-control[type="date"] {
  padding-left: 10px;
  padding-right: 10px;
  font-size: 16px;
}

.form-control:disabled {
  background: var(--color-surface-soft);
  color: var(--color-muted);
  cursor: not-allowed;
}

.form-field {
  min-width: 0;
}

.balance-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.amount-input-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.amount-input {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.amount-unit {
  flex: 0 0 auto;
  color: var(--color-coffee);
  font-weight: 700;
}

.field-note,
.sub-message {
  margin: var(--space-2) 0 0;
  color: var(--color-muted);
  font-size: 12px;
  line-height: 1.6;
}

.memo-input {
  min-height: 88px;
  resize: vertical;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.form-actions > button {
  margin: 0;
}

.primary-button {
  flex: 1 1 220px;
  min-height: 48px;
}

.secondary-button {
  min-height: 48px;
}

/* メッセージ */
.message {
  margin: 0 0 var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-line;
}

.error-message {
  border: 1px solid #EBCBC5;
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

.success-message {
  border: 1px solid #C9DFCE;
  background: var(--color-success-bg);
  color: var(--color-success);
}

.sub-message {
  margin-top: var(--space-2);
}

/* 確定履歴 */
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.list-header h2 {
  margin-bottom: var(--space-1);
}

.list-header .sub-message {
  margin-top: 0;
}

.refresh-button {
  flex: 0 0 auto;
  min-height: 38px;
  margin: 0;
  padding: 8px 12px;
  font-size: 12px;
}

.confirm-list {
  display: flex;
  flex-direction: column;
}

.confirm-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-4) 0;
  border-bottom: 1px solid var(--color-border);
}

.confirm-item:last-child {
  border-bottom: 0;
}

.confirm-item-main {
  flex: 1 1 auto;
  min-width: 0;
}

.confirm-date {
  margin-bottom: var(--space-1);
  color: var(--color-muted);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.confirm-amount {
  color: var(--color-coffee-dark);
  font-size: 20px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.confirm-memo {
  margin: var(--space-2) 0 0;
  color: var(--color-muted);
  font-size: 12px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.confirm-item-actions {
  display: flex;
  flex: 0 0 auto;
  gap: var(--space-2);
}

.confirm-item-actions button {
  min-height: 38px;
  margin: 0;
  padding: 8px 12px;
  font-size: 13px;
}

.empty-message,
.loading-message {
  padding: var(--space-5) var(--space-2);
  color: var(--color-muted);
  font-size: 14px;
  line-height: 1.6;
  text-align: center;
}

@media (max-width: 420px) {
  .balance-confirm-page {
    padding-bottom: var(--space-3);
  }

  .list-header {
    align-items: flex-start;
  }

  .confirm-item {
    align-items: flex-start;
    gap: var(--space-2);
  }

  .confirm-item-actions {
    flex-direction: column;
  }

  .confirm-item-actions button {
    min-width: 62px;
  }

  .confirm-amount {
    font-size: 18px;
  }
}

@media (max-width: 360px) {
  .list-header {
    flex-direction: column;
  }

  .confirm-item {
    flex-direction: column;
  }

  .confirm-item-actions {
    flex-direction: row;
    align-self: flex-end;
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions > button {
    width: 100%;
  }
}
</style>
