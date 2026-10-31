<template>
  <div class="settings-wrapper">

    <div class="card">
      <div class="item-area">
        <div class="menu-icon">
          <CalendarClock :size="24" />
        </div>

        <div class="menu-text">
          <div class="menu-title">
            定期収支設定
          </div>
          <div class="menu-description">
            毎月・指定月に発生する収入や支出を設定します。
          </div>
        </div>

        <div
          v-for="item in monthlyData"
          :key="item.no"
          class="item-list"
        >
          <div class="item-row">
            <span class="item-No">{{ item.no }}</span>
            <span class="item-day">{{ item.day }}日</span>
            <span class="item-name">{{ item.name }}</span>
            <button class="toggle-btn" @click="toggle(item)">{{ openedCode === item.no ? '－' : '＋' }}</button>
          </div>
        
          <!-- 展開フォーム -->
          <div v-if="openedCode === item.no" class="card">

            <label class="form-label">名前</label>
            <input v-model="form.name" class="input-field"/>

            <label class="form-label">日</label>
            <select v-model="form.day" class="select-field">
              <option v-for="d in 31" :key="d" :value="d">{{ d }}</option>
            </select>

            <label class="form-label monthly-transfer-label">
              <CirclePlus :size="17" :stroke-width="2.5" />
              増える科目
            </label>
            <select v-model="form.kamoku1" class="select-field">
              <option disabled value="">増える科目を選択してください</option>
              <option
                v-for="k in listAllKouza"
                :key="k.code"
                :value="k.code"
              >
                {{ k.daikoumoku }}_{{ k.shoukoumoku }}
              </option>
            </select>

            <label class="form-label monthly-transfer-label">
              <CirclePlus :size="17" :stroke-width="2.5" />
              金額プラス
            </label>
            <div class="monthly-amount-wrap">
              <input
                type="number"
                v-model="form.kingaku"
                class="input-field input-number"
                placeholder="プラス金額を入力してください"
              />
              <span>円</span>
            </div>

            <label class="form-label monthly-transfer-label">
              <CircleMinus :size="17" :stroke-width="2.5" />
              減る科目
            </label>
            <select v-model="form.kamoku2" class="select-field">
              <option disabled value="">減る科目を選択してください</option>
              <option
                v-for="k in listAllKouza"
                :key="k.code"
                :value="k.code"
              >
                {{ k.daikoumoku }}_{{ k.shoukoumoku }}
              </option>
            </select>

            <label class="form-label monthly-transfer-label">
              <CircleMinus :size="17" :stroke-width="2.5" />
              金額マイナス
            </label>
            <div class="monthly-amount-wrap">
              <input
                type="number"
                v-model="kingakuMinus"
                class="input-field input-number"
                placeholder="マイナス金額を入力してください"
              />
              <span>円</span>
            </div>

            <label class="form-label">店</label>
            <input v-model="form.aite" class="textarea-field"/>

            <label class="form-label">内容</label>
            <input v-model="form.naiyo" class="textarea-field"/>

            <label class="form-label">頻度</label>
            <select v-model="form.hindo" class="select-field" @change="hindoUpdate(form.hindo)">
              <option value="毎月">毎月</option>
              <option value="選択月">選択月</option>
            </select>

            <label class="form-label">実行月</label>
            <div class="month-check">
              <label v-for="m in 12" :key="m">
                <input type="checkbox" v-model="form.month[m]" /> {{ m }}月
              </label>
            </div>
            <button class="btn-red" @click="update(item)">
              更新
            </button>
          </div>
        </div>
      </div>
      <button class="btn" @click="addNew">
        新規追加
      </button>
    </div>

  </div>
</template>




<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { CirclePlus, CircleMinus } from 'lucide-vue-next'
import { GAS_URL } from '@/constants/index.js'
import loadingStore from "@/stores/loadingStore"

const isInitializing = ref(true)
const listAllKouza = ref([])
const monthlyData = ref([])

const openedCode = ref(null)

const form = ref({
  no: "",
  name: "",
  day: "",
  kamoku1: "",
  kingaku: 0,
  kamoku2: "",
  aite: "",
  naiyo: "",
  hindo: '選択月',
  month: {
    1:false,2:false,3:false,4:false,5:false,6:false,
    7:false,8:false,9:false,10:false,11:false,12:false
  }
})

const kingakuMinus = computed({
  get: () => form.value.kingaku === "" || form.value.kingaku === null
    ? ""
    : -Math.abs(Number(form.value.kingaku) || 0),
  set: (value) => {
    form.value.kingaku = value === "" || value === null
      ? ""
      : Math.abs(Number(value) || 0)
  }
})

/* ＋を押したときの展開処理 */
const toggle = (item) => {
  openedCode.value = openedCode.value === item.no ? null : item.no

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
    const key = `m${String(m).padStart(2, "0")}`
    form.value.month[m] = item[key] === "〇"
  }

  // 頻度が毎月なら全部チェック
  if (form.value.hindo === "毎月") {
    for (let m = 1; m <= 12; m++) {
      form.value.month[m] = true
    }
  }
}

/* GASからデータ取得 */
onMounted(async () => {
  const res1 = await fetch(`${GAS_URL}?list=ALLLIST`)
  listAllKouza.value = await res1.json()

  const res2 = await fetch(`${GAS_URL}?list=Monthly`)
  monthlyData.value = await res2.json()
  console.log("isInitializing:",isInitializing.value )
  isInitializing.value = false
  
  console.log("isInitializing:",isInitializing.value )
  loadingStore.globalLoading.value = false
})

  /* 科目コードが存在しない場合の補正 */
  watch(() => listAllKouza.value, () => {
    if (form.value.kamoku1 && !listAllKouza.value.some(i => String(i.code) === String(form.value.kamoku1))) {
      form.value.kamoku1 = listAllKouza.value[0]?.code || ""
    }
    if (form.value.kamoku2 && !listAllKouza.value.some(i => String(i.code) === String(form.value.kamoku2))) {
      form.value.kamoku2 = listAllKouza.value[0]?.code || ""
    }
  })

  /* 毎月選択時、全部の月にチェックはいる
  　　選択月　選択時　全部の月のチェック消える　 */
  watch(() => form.value.hindo, (newVal) => {
    
    console.log("isInitializing:",isInitializing.value )
    if (isInitializing.value) return

    if (newVal === "毎月") {
      // 全チェック ON
      for (let m = 1; m <= 12; m++) {
        form.value.month[m] = true
      }
    } else if (newVal === "選択月") {
      // 全チェック OFF
      for (let m = 1; m <= 12; m++) {
        form.value.month[m] = false
      }
    }
  })

  /* 新規追加ボタン押したときの処理 */
  const addNew = () => {
    // 新規行の仮No（GAS側で本Noを採番するなら "" のままでOK）
    const newItem = {
      no: "",
      name: "",
      day: "",
      kamokuCD1: "",
      amount: 0,
      kamokuCD2: "",
      aite: "",
      naiyo: "",
      hindo:'選択月',
      m01: "", m02: "", m03: "", m04: "", m05: "", m06: "",
      m07: "", m08: "", m09: "", m10: "", m11: "", m12: ""
    }

    // MonthlyData に追加
    monthlyData.value.push(newItem)

    // 展開する
    openedCode.value = newItem.no

    // フォームに反映
    form.value.no = ""
    form.value.name = ""
    form.value.day = ""
    form.value.kamoku1 = ""
    form.value.kingaku = ""
    form.value.kamoku2 = ""
    form.value.aite = ""
    form.value.naiyo = ""
    form.value.hindo = "選択月"

    for (let m = 1; m <= 12; m++) {
      form.value.month[m] = false
    }
  }
const hindoUpdate= async (item) => {
    if (item === "毎月") {
      // 全チェック ON
      for (let m = 1; m <= 12; m++) {
        form.value.month[m] = true
      }
    } else if (item === "選択月") {
      // 全チェック OFF
      for (let m = 1; m <= 12; m++) {
        form.value.month[m] = false
      }
    }
}
/* 更新処理 */
const update = async (item) => {
  loadingStore.globalLoading.value = true

  try {
    const payload = new URLSearchParams()

    const mode = item.no ? "MonthlyUpdate" : "MonthlyAdd"
    payload.append("mode", mode)
    payload.append("no", form.value.no)
    payload.append("name", form.value.name)
    payload.append("day", form.value.day)
    payload.append("kamoku1", form.value.kamoku1)
    payload.append("kingaku", form.value.kingaku)
    payload.append("kamoku2", form.value.kamoku2)
    payload.append("aite", form.value.aite)
    payload.append("naiyo", form.value.naiyo)
    payload.append("hindo", form.value.hindo)

    for (let m = 1; m <= 12; m++) {
      payload.append(`month${m}`, form.value.month[m] ? "〇" : "")
    }

    const res = await fetch(`${GAS_URL}?mode=${mode}`, {
      method: "POST",
      body: payload
    })
    console.log("form:",form.value)
    const result = await res.json()
    alert(result.message)

    // GAS側で新しいNoが返ってきたら反映
    isInitializing.value = true
    const res2 = await fetch(`${GAS_URL}?list=Monthly`)
    monthlyData.value = await res2.json()
    isInitializing.value = false
    
    console.log("isInitializing:",isInitializing.value )

  } catch (e) {
    alert("更新に失敗しました: " + e.message)
  }

  loadingStore.globalLoading.value = false
}

</script>






<style scoped>
.settings-wrapper {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-sizing: border-box;
  color: var(--color-brown-dark, #4b382d);
}

/*.card {
  width: 100%;
  box-sizing: border-box;
  padding: 16px;
  border: 1px solid var(--color-border, #e3d7cb);
  border-radius: 14px;
  background: var(--color-surface, #fffdf9);
  box-shadow: 0 2px 8px rgb(75 56 45 / 5%);
}
*/
.item-area {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 10px;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 10px 12px;
  box-sizing: border-box;
  border: 1px solid var(--color-border, #e3d7cb);
  border-radius: 10px;
  background: var(--color-background, #faf6f0);
}

.item-No {
  flex: 0 0 32px;
  color: var(--color-coffee, #6b4f3f);
  font-size: 13px;
  text-align: center;
}

.item-day {
  flex: 0 0 auto;
  min-width: 42px;
  color: var(--color-coffee, #6b4f3f);
  font-size: 14px;
  white-space: nowrap;
}

.item-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 15px;
  font-weight: 600;
}

/*.toggle-btn {
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border, #d9c8b8);
  border-radius: 50%;
  background: var(--color-beige, #eee2d4);
  color: var(--color-coffee, #6b4f3f);
  font-size: 21px;
  line-height: 1;
  cursor: pointer;
}*/

.form-label {
  display: block;
  margin: 14px 0 6px;
  color: var(--color-brown-dark, #4b382d);
  font-size: 14px;
  font-weight: 600;
}

/*.input-field,
.select-field,
.textarea-field {
  display: block;
  width: 100%;
  min-height: 42px;
  padding: 9px 11px;
  box-sizing: border-box;
  border: 1px solid var(--color-border, #d9c8b8);
  border-radius: 8px;
  background: #fff;
  color: var(--color-brown-dark, #4b382d);
  font: inherit;
}

.input-field:focus,
.select-field:focus,
.textarea-field:focus {
  outline: 2px solid var(--color-beige, #d9c3ac);
  outline-offset: 1px;
  border-color: var(--color-coffee, #6b4f3f);
}

.input-number {
  text-align: right;
}
*/
.month-check {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px 8px;
  margin: 8px 0 18px;
  padding: 12px;
  border-radius: 10px;
  background: var(--color-background, #faf6f0);
}

.month-check label {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: 14px;
  white-space: nowrap;
}

.month-check input[type="checkbox"] {
  width: 17px;
  height: 17px;
  margin: 0;
  accent-color: var(--color-coffee, #6b4f3f);
}

/*.btn,
.btn-red {
  display: block;
  width: 100%;
  min-height: 44px;
  margin-top: 14px;
  padding: 11px 16px;
  border: 1px solid var(--color-coffee, #6b4f3f);
  border-radius: 9px;
  background: var(--color-coffee, #6b4f3f);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.btn-red {
  background: var(--color-beige, #eee2d4);
  color: var(--color-brown-dark, #4b382d);
  border-color: var(--color-border, #d9c8b8);
}

.btn:active,
.btn-red:active,
.toggle-btn:active {
  transform: translateY(1px);
}*/

.monthly-transfer-label {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 8px;
}

.monthly-transfer-label :deep(svg) {
  flex: 0 0 auto;
  color: var(--color-coffee);
}

.monthly-amount-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.monthly-amount-wrap .input-field {
  flex: 1;
  min-width: 0;
  margin-bottom: 0;
}

.monthly-amount-wrap > span {
  flex: 0 0 auto;
  color: var(--color-muted);
  font-size: 14px;
  font-weight: 700;
}

@media (max-width: 480px) {
  .settings-wrapper {
    padding: 10px;
  }

  .card {
    padding: 12px;
  }

  .item-row {
    gap: 7px;
    padding: 9px;
  }

  .item-No {
    flex-basis: 24px;
  }

  .item-day {
    min-width: 36px;
    font-size: 13px;
  }

  .item-name {
    font-size: 14px;
  }

  .month-check {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px 6px;
    padding: 10px;
  }
}

@media (max-width: 340px) {
  .month-check {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>