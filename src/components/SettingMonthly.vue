<template>
  <div class="settings-wrapper">

    <div class="card">
      <div class="item-area">

        <div
          v-for="item in monthlyData"
          :key="item.no"
          class="item-list"
        >
          <div class="item-row">
            <span class="item-No">{{ item.no }}</span>
            <span class="item-name">{{ item.name }}</span>
            <button @click="toggle(item)">＋</button>
          </div>

          <!-- 展開フォーム -->
          <div v-if="openedCode === item.no" class="info-area">

            <label class="form-label">名前</label>
            <input v-model="form.name" class="input-field"/>

            <label class="form-label">日</label>
            <select v-model="form.day" class="select-field">
              <option v-for="d in 31" :key="d" :value="d">{{ d }}</option>
            </select>

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

            <label class="form-label">金額</label>
            <input type="number" v-model="form.kingaku" class="input-field"/>

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
            <button class="update-btn" @click="update(item)">
              更新
            </button>
          </div>
        </div>
      </div>
      <button class="add-btn" @click="addNew">
        新規追加
      </button>
    </div>

  </div>
</template>




<script setup>
import { ref, onMounted, watch } from 'vue'
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
    if (!listAllKouza.value.some(i => i.code === form.value.kamoku1)) {
      form.value.kamoku1 = listAllKouza.value[0]?.code || ""
    }
    if (!listAllKouza.value.some(i => i.code === form.value.kamoku2)) {
      form.value.kamoku2 = listAllKouza.value[0]?.code || ""
    }
  })

  /* 毎月選択時、全部の月にチェックはいる
  　　選択月　選択時　全部の月のチェック消える　 */
  watch(form.value.hindo,(newVal) => {
    
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
    form.value.kingaku = 0
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
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* カード */
.card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  flex-direction: row;
}


.dirty {
  background-color: #ffe5e5; /* 薄い赤 */
  padding: 2px 4px;
  border-radius: 4px;
}

/* 小項目行 */
.item-area {
  display: flex;
  flex-direction: column;
  width:100%;
  gap: 10px;
}

.item-row ,.shop-row{
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-bottom: 10px;
  width:100%;
}

.item-list,.shop-area{
  display: flex;
  flex-direction: column;
  align-items: right;
  gap: 10px;
}

.shop-row input{
  width: 80%;
  margin-left:40px;
}
/* 削除ボタン */
.delete {
  padding: 6px 10px;
  border-radius: 6px;
  border: none;
  background: #ffdddd;
}

/* 追加ボタン */
.add-btn {
  margin-top: 10px;
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: #e0f0ff;
}

.add-btn:disabled {
  background: #ccc;
}

/*固定ヘッダー */
.header-save {
  position: sticky;
  top: 0;
  background: #fff;
  padding: 12px;
  z-index: 100;
  border-bottom: 1px solid #ddd;
}
.save-btn {
  width: 100%;
  padding: 12px;
  background: #66aaff;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
}
.item-code {
  width: 60px;
  display: inline-block;
  text-align: center;
  color: #555;
  font-size: 14px;
}
.item-input{
  width: 80%;
  display: inline-block;
  text-align: left;
  color: #555;
  font-size: 14px;
}

.dirty {
  color: red;
}


</style>