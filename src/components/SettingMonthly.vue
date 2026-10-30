
<template>
  <div class="settings-wrapper">

    <!-- 定期設定一覧 -->
    <div class="card monthly-card">
      <div class="section-heading">
        <div>
          <h2>定期収支の設定</h2>
          <p class="section-description">
            毎月または指定した月に登録する収支を管理します。
          </p>
        </div>
      </div>

      <div class="item-area">
        <div
          v-for="(item, index) in monthlyData"
          :key="item.no || `new-${index}`"
          class="item-list"
        >
          <!-- 一覧行 -->
          <div class="item-row">
            <span class="item-No">{{ item.no || '新規' }}</span>
            <span class="item-day">{{ item.day }}日</span>
            <span class="item-name">{{ item.name || '名称未設定' }}</span>

            <button
              type="button"
              class="toggle-btn"
              :aria-label="openedCode === item.no ? '設定を閉じる' : '設定を開く'"
              @click="toggle(item)"
            >
              {{ openedCode === item.no ? '－' : '＋' }}
            </button>
          </div>

          <!-- 展開フォーム -->
          <div
            v-if="openedCode === item.no"
            class="monthly-form"
          >
            <div class="form-section-title">基本情報</div>

            <div class="form-field">
              <label class="form-label">名前</label>
              <input
                v-model="form.name"
                class="input-field"
                type="text"
                placeholder="定期収支の名前"
              />
            </div>

            <div class="form-field">
              <label class="form-label">実行日</label>
              <div class="day-input">
                <select v-model="form.day" class="select-field">
                  <option
                    v-for="d in 31"
                    :key="d"
                    :value="d"
                  >
                    {{ d }}
                  </option>
                </select>
                <span>日</span>
              </div>
            </div>

            <div class="form-section-title">金額・科目</div>

            <div class="form-field">
              <label class="form-label">科目1</label>
              <select v-model="form.kamoku1" class="select-field">
                <option
                  v-for="k in listAllKouza"
                  :key="k.code"
                  :value="k.code"
                >
                  {{ k.daikoumoku }}_{{ k.shoukoumoku }}
                </option>
              </select>
            </div>

            <div class="form-field">
              <label class="form-label">金額</label>
              <div class="amount-input-wrap">
                <input
                  v-model="form.kingaku"
                  type="number"
                  class="input-field input-number"
                  placeholder="金額"
                />
                <span class="amount-unit">円</span>
              </div>
            </div>
            <div class="form-field">
              <label class="form-label">科目2</label>
              <select v-model="form.kamoku2" class="select-field">
                <option
                  v-for="k in listAllKouza"
                  :key="k.code"
                  :value="k.code"
                >
                  {{ k.daikoumoku }}_{{ k.shoukoumoku }}
                </option>
              </select>
            </div>

            <div class="form-field">
              <label class="form-label">店・相手先</label>
              <input
                v-model="form.aite"
                type="text"
                class="input-field"
                placeholder="店名・相手先"
              />
            </div>

            <div class="form-field">
              <label class="form-label">内容</label>
              <input
                v-model="form.naiyo"
                type="text"
                class="input-field"
                placeholder="内容・メモ"
              />
            </div>

            <div class="form-section-title">実行スケジュール</div>

            <div class="form-field">
              <label class="form-label">頻度</label>
              <select
                v-model="form.hindo"
                class="select-field"
                @change="hindoUpdate(form.hindo)"
              >
                <option value="毎月">毎月</option>
                <option value="選択月">選択月</option>
              </select>
            </div>

            <div class="form-field">
              <label class="form-label">実行月</label>

              <div class="month-check">
                <label
                  v-for="m in 12"
                  :key="m"
                  class="month-option"
                >
                  <input
                    type="checkbox"
                    v-model="form.month[m]"
                    :disabled="form.hindo === '毎月'"
                  />
                  <span>{{ m }}月</span>
                </label>
              </div>

              <p class="month-description">
                {{ form.hindo === '毎月'
                  ? '毎月実行します。'
                  : '実行する月にチェックを入れてください。'
                }}
              </p>
            </div>

            <div class="form-actions">
              <button
                type="button"
                class="btn btn-md update-button"
                @click="update(item)"
              >
                更新
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 新規追加 -->
      <button
        type="button"
        class="btn btn-md add-button"
        @click="addNew"
      >
        ＋ 新規追加
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { GAS_URL } from '@/constants/index.js'
import loadingStore from '@/stores/loadingStore'

const isInitializing = ref(true)
const listAllKouza = ref([])
const monthlyData = ref([])

const openedCode = ref(null)

const form = ref({
  no: '',
  name: '',
  day: '',
  kamoku1: '',
  kingaku: 0,
  kamoku2: '',
  aite: '',
  naiyo: '',
  hindo: '選択月',
  month: {
    1: false, 2: false, 3: false, 4: false,
    5: false, 6: false, 7: false, 8: false,
    9: false, 10: false, 11: false, 12: false
  }
})

/* ＋を押したときの展開処理 */
const toggle = (item) => {
  if (openedCode.value === item.no) {
    openedCode.value = null
    return
  }

  openedCode.value = item.no

  form.value.no = item.no
  form.value.name = item.name
  form.value.day = item.day
  form.value.kamoku1 = item.kamokuCD1
  form.value.kingaku = item.amount
  form.value.kamoku2 = item.kamokuCD2
  form.value.aite = item.aite
  form.value.naiyo = item.naiyo
  form.value.hindo = item.hindo

  // GAS の m01〜m12 → チェックボックス true/false
  for (let m = 1; m <= 12; m++) {
    const key = `m${String(m).padStart(2, '0')}`
    form.value.month[m] = item[key] === '〇'
  }

  // 頻度が毎月なら全部チェック
  if (form.value.hindo === '毎月') {
    for (let m = 1; m <= 12; m++) {
      form.value.month[m] = true
    }
  }
}

/* GASからデータ取得 */
onMounted(async () => {
  try {
    const res1 = await fetch(`${GAS_URL}?list=ALLLIST`)
    listAllKouza.value = await res1.json()

    const res2 = await fetch(`${GAS_URL}?list=Monthly`)
    monthlyData.value = await res2.json()

    isInitializing.value = false
  } catch (e) {
    console.error('月次設定の取得に失敗しました:', e)
    alert('月次設定の取得に失敗しました。')
  } finally {
    loadingStore.globalLoading.value = false
  }
})

/* 科目コードが存在しない場合の補正 */
watch(
  () => listAllKouza.value,
  () => {
    if (!listAllKouza.value.some(i => i.code === form.value.kamoku1)) {
      form.value.kamoku1 = listAllKouza.value[0]?.code || ''
    }

    if (!listAllKouza.value.some(i => i.code === form.value.kamoku2)) {
      form.value.kamoku2 = listAllKouza.value[0]?.code || ''
    }
  }
)

/*
 * 頻度変更時の処理
 * 毎月：全チェック ON
 * 選択月：全チェック OFF
 *
 * 既存データを展開したときの月別設定は
 * toggle() で読み込むため、ここでは監視しない。
 */
const hindoUpdate = (item) => {
  if (item === '毎月') {
    for (let m = 1; m <= 12; m++) {
      form.value.month[m] = true
    }
  } else if (item === '選択月') {
    for (let m = 1; m <= 12; m++) {
      form.value.month[m] = false
    }
  }
}

/* 新規追加ボタン押下時の処理 */
const addNew = () => {
  const newItem = {
    no: '',
    name: '',
    day: '',
    kamokuCD1: '',
    amount: 0,
    kamokuCD2: '',
    aite: '',
    naiyo: '',
    hindo: '選択月',
    m01: '', m02: '', m03: '', m04: '',
    m05: '', m06: '', m07: '', m08: '',
    m09: '', m10: '', m11: '', m12: ''
  }

  monthlyData.value.push(newItem)

  // 新規行を展開
  openedCode.value = newItem.no

  form.value.no = ''
  form.value.name = ''
  form.value.day = ''
  form.value.kamoku1 = ''
  form.value.kingaku = 0
  form.value.kamoku2 = ''
  form.value.aite = ''
  form.value.naiyo = ''
  form.value.hindo = '選択月'

  for (let m = 1; m <= 12; m++) {
    form.value.month[m] = false
  }
}

/* 更新処理 */
const update = async (item) => {
  loadingStore.globalLoading.value = true

  try {
    const payload = new URLSearchParams()

    const mode = item.no ? 'MonthlyUpdate' : 'MonthlyAdd'

    payload.append('mode', mode)
    payload.append('no', form.value.no)
    payload.append('name', form.value.name)
    payload.append('day', form.value.day)
    payload.append('kamoku1', form.value.kamoku1)
    payload.append('kingaku', form.value.kingaku)
    payload.append('kamoku2', form.value.kamoku2)
    payload.append('aite', form.value.aite)
    payload.append('naiyo', form.value.naiyo)
    payload.append('hindo', form.value.hindo)

    for (let m = 1; m <= 12; m++) {
      payload.append(
        `month${m}`,
        form.value.month[m] ? '〇' : ''
      )
    }

    const res = await fetch(`${GAS_URL}?mode=${mode}`, {
      method: 'POST',
      body: payload
    })

    const result = await res.json()
    alert(result.message)

    // GAS側で新しいNoが返された後、一覧を再取得
    isInitializing.value = true

    const res2 = await fetch(`${GAS_URL}?list=Monthly`)
    monthlyData.value = await res2.json()

    isInitializing.value = false
    openedCode.value = null

  } catch (e) {
    alert('更新に失敗しました: ' + e.message)
  } finally {
    loadingStore.globalLoading.value = false
  }
}
</script>

<style scoped>
.settings-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: 100%;
  max-width: var(--content-width);
  min-width: 0;
  margin: 0 auto;
  padding: var(--space-2) 0;
}

/* メインカード */
.monthly-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* 見出し */
.section-heading {
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.section-heading h2 {
  margin: 0;
  color: var(--color-coffee-dark);
}

.section-description {
  margin: var(--space-1) 0 0;
  color: var(--color-muted);
  font-size: 12px;
}

/* 一覧 */
.item-area {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: var(--space-2);
}

.item-list {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: var(--space-2);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}

.item-list:last-child {
  border-bottom: 0;
}

/* 一覧行 */
.item-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-width: 0;
  min-height: 48px;
  padding: 6px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-soft);
}

.item-No {
  display: inline-flex;
  flex: 0 0 38px;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-muted);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.item-day {
  flex: 0 0 auto;
  min-width: 38px;
  color: var(--color-coffee);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.item-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 650;
}

/* 展開フォーム */
.monthly-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.form-section-title {
  margin-top: var(--space-2);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-coffee-dark);
  font-size: 14px;
  font-weight: 750;
}

.amount-input-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
}

.amount-input-wrap .input-field {
  flex: 1;
  min-width: 0;
  margin: 0;
}

.amount-unit {
  flex-shrink: 0;
  color: var(--color-muted);
  font-size: 14px;
  font-weight: 600;
}


.form-section-title:first-child {
  margin-top: 0;
}

.form-field {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.form-field .form-label {
  margin: var(--space-2) 0 var(--space-1);
}

.form-field .input-field,
.form-field .select-field {
  margin-bottom: 0;
}

/* 実行日 */
.day-input {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.day-input .select-field {
  width: 110px;
  margin: 0;
}

.day-input span {
  color: var(--color-muted);
  font-size: 14px;
}

/* 月選択 */
.month-check {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
  margin-top: var(--space-1);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-soft);
}

.month-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 0;
  min-height: 36px;
  padding: 4px;
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.month-option:has(input:checked) {
  background: var(--color-yellow-soft);
  color: var(--color-coffee-dark);
}

.month-option input[type="checkbox"] {
  width: 17px;
  height: 17px;
  margin: 0;
  accent-color: var(--color-coffee);
}

.month-option input:disabled {
  cursor: not-allowed;
}

.month-description {
  margin: var(--space-1) 0 0;
  color: var(--color-muted);
  font-size: 11px;
}

/* ボタン */
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-3);
}

.update-button {
  min-width: 110px;
  margin: 0;
}

.add-button {
  width: 100%;
  min-height: 46px;
  margin: var(--space-2) 0 0;
}

/* スマートフォン */
@media (max-width: 480px) {
  .monthly-form {
    padding: var(--space-3);
  }

  .month-check {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    padding: var(--space-2);
  }

  .item-row {
    gap: 6px;
    padding: 6px;
  }

  .item-No {
    flex-basis: 34px;
  }

  .item-day {
    min-width: 34px;
    font-size: 12px;
  }

  .item-name {
    font-size: 13px;
  }
}

@media (max-width: 340px) {
  .month-check {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
