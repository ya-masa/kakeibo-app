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

      <h1>残高の確定</h1>
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
        class="field-label"
      >
        口座・カード
      </label>

      <select
        id="account-select"
        v-model="selectedAccountCode"
        class="select-field form-control"
        :disabled="loadingAccounts || saving"
        @change="onAccountChange"
      >
        <option value="">
          口座を選択してください
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
        <div class="form-field">
          <label
            for="confirm-date"
            class="field-label"
          >
            確定日
          </label>

          <input
            id="confirm-date"
            v-model="form.date"
            type="date"
            class="input-field form-control"
            required
            :disabled="saving"
          />
        </div>

        <div class="form-field">
          <label
            for="confirm-balance"
            class="field-label"
          >
            確定残高
          </label>

          <div class="amount-input-wrap">
            <input
              id="confirm-balance"
              v-model="form.confirmedBalance"
              type="number"
              step="1"
              inputmode="numeric"
              class="input-field form-control amount-input"
              placeholder="例：125000"
              required
              :disabled="saving"
            />
            <span class="amount-unit">円</span>
          </div>

          <p class="field-note">
            0円も登録できます。実際に確認した残高を入力してください。
          </p>
        </div>

        <div class="form-field">
          <label
            for="confirm-memo"
            class="field-label"
          >
            メモ（任意）
          </label>

          <textarea
            id="confirm-memo"
            v-model="form.memo"
            class="textarea-field form-control memo-input"
            rows="2"
            maxlength="500"
            placeholder="残高確認のメモ"
            :disabled="saving"
          />
        </div>

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
.balance-confirm-page {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 20px 16px 40px;
  box-sizing: border-box;
  color: var(--color-text);
}

.page-header {
  margin-bottom: 20px;
}

.back-button {
  min-height: 36px;
  padding: 6px 10px 6px 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.back-button:hover {
  color: var(--color-text);
}

.page-header h1 {
  margin: 12px 0 8px;
  color: var(--color-text);
  font-size: 24px;
  font-weight: 700;
  line-height: 1.4;
}

.page-description {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.7;
}

/*.card {
  margin-bottom: 16px;
  padding: 20px;
  border: 1px solid var(--color-border, #e3d8cc);
  border-radius: 14px;
  background: #F7F4EF;
  box-shadow: 0 2px 7px rgb(75 54 39 / 5%);
}

.card h2 {
  margin: 0 0 18px;
  color: var(--color-brown-dark, #44352c);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.45;
}*/

.field-label {
  display: block;
  margin-bottom: 8px;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
}

.form-control {
  display: block;
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.form-control[type="date"] {
  display: block;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  padding: 10px 4px;
  font-size: 16px;
  line-height: 1.3;
  -webkit-appearance: none;
  appearance: none;
}

.form-control:focus {
  outline: none;
  border-color: var(--color-coffee, #6b4f3f);
  box-shadow: 0 0 0 3px rgb(107 79 63 / 14%);
}

.form-control:disabled {
  background: var(--color-background, #f5f0e8);
  color: var(--color-text-muted, #786b61);
  cursor: not-allowed;
}

.balance-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-field {
  min-width: 0;
}

.amount-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.amount-input {
  flex: 1;
  min-width: 0;
  text-align: right;
}

.amount-unit {
  flex-shrink: 0;
  color: var(--color-brown-dark, #44352c);
  font-size: 14px;
}

.field-note,
.sub-message {
  margin: 8px 0 0;
  color: var(--color-text-muted, #786b61);
  font-size: 12px;
  line-height: 1.6;
}

.memo-input {
  resize: vertical;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.primary-button,
.secondary-button,
.refresh-button,
.edit-button,
.delete-button {
  height: 40px;
  padding: 9px 16px;
  border-radius: 8px;
  line-height: 1.35;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
}


.primary-button:disabled,
.secondary-button:disabled,
.refresh-button:disabled,
.edit-button:disabled,
.delete-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.message {
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 9px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-line;
}

.list-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.list-header h2 {
  margin-bottom: 4px;
}

.list-header .sub-message {
  margin-top: 0;
}

.refresh-button {
  flex-shrink: 0;
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
  gap: 14px;
  padding: 16px 0;
  min-height: 34px;
}

.confirm-item-main {
  flex: 1;
  min-width: 0;
}

.confirm-date {
  margin-bottom: 5px;
  font-size: 13px;
}

.confirm-amount {
  font-size: 20px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.confirm-memo {
  margin: 7px 0 0;
  font-size: 12px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.confirm-item-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.empty-message,
.loading-message {
  padding: 18px 0;
  font-size: 14px;
  line-height: 1.6;
  text-align: center;
}

@media (max-width: 480px) {
  .balance-confirm-page {
    padding: 16px 12px 32px;
  }

  .page-header h1 {
    font-size: 22px;
  }

  .card {
    padding: 16px;
    border-radius: 12px;
  }

  .form-control[type="date"] {
    width: 100%;
    min-width: 0;
    max-width: 100%;
    padding: 10px 2px;
    font-size: 15px;
    letter-spacing: -0.3px;
  }

  .list-header {
    align-items: center;
  }

  .confirm-item {
    align-items: flex-start;
    gap: 10px;
  }

  .confirm-item-actions {
    flex-direction: column;
  }

  .confirm-item-actions button {
    min-width: 64px;
    padding: 8px 10px;
  }

  .confirm-amount {
    font-size: 18px;
  }
}

@media (max-width: 360px) {
  .list-header {
    align-items: flex-start;
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

  .primary-button,
  .secondary-button {
    width: 100%;
  }
}
</style>