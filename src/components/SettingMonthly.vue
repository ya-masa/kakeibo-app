<script setup>
import { ref, computed, onMounted } from 'vue'
import { GAS_URL } from '@/constants/index.js'
import loadingStore from "@/stores/loadingStore"

/* 口座一覧（ALLLIST） */
const listAllKouza = ref([])

/* monthly データ */
const monthlyData = ref([])

/* 展開中の行 No */
const openedCode = ref(null)

/* 編集フォーム */
const form = ref({
  No: "",
  name: "",
  day: "",
  kamoku1: "",
  kingaku: 0,
  kamoku2: "",
  aite: "",
  naiyo: "",
  hindo: "",
  month: {
    1:false,2:false,3:false,4:false,5:false,6:false,
    7:false,8:false,9:false,10:false,11:false,12:false
  }
})

/* 行を開く */
const toggle = (item) => {
  openedCode.value = openedCode.value === item.No ? null : item.No

  form.value.No = item.No
  form.value.name = item.name
  form.value.day = item.day
  form.value.kamoku1 = item.kamoku1
  form.value.kingaku = item.kingaku
  form.value.kamoku2 = item.kamoku2
  form.value.aite = item.aite
  form.value.naiyo = item.naiyo
  form.value.hindo = item.hindo

  for (let m = 1; m <= 12; m++){
    form.value.month[m] = item.month[m]
  }
}

/* カテゴリ化（科目CD1ごと） */
const categories = computed(() => {
  if (!monthlyData.value) return []

  return monthlyData.value.map(row => ({
    daikoumoku: row.kamoku1,
    items: [row]
  }))
})

/* GASからデータ取得 */
onMounted(async () => {

  // 口座一覧
  const res1 = await fetch(`${GAS_URL}?list=ALLLIST`)
  listAllKouza.value = await res1.json()

  // monthly
  const res2 = await fetch(`${GAS_URL}?list=Monthly`)
  monthlyData.value = await res2.json()

  loadingStore.globalLoading.value = false
})


watch(() => listAllKouza, () => {
    // 科目リストが更新されたら選択値を再調整
    if (!listAllKouza.some(i => i.code === localForm.value.kamoku2)) {
      localForm.value.kamoku2 = listAllKouza[0]?.code || ""
    }
    if (!listAllKouza.some(i => i.code === localForm.value.kamoku1)) {
      localForm.value.kamoku1 = listAllKouza[0]?.code || ""
    }
  })

/* 更新処理 */
const update = async (item) => {
  loadingStore.globalLoading.value = true;

  try {
    const payload = new URLSearchParams();

    payload.append("mode", "MonthlyUpdate");
    payload.append("No", form.value.No);
    payload.append("name", form.value.name);
    payload.append("day", form.value.day);
    payload.append("kamoku1", form.value.kamoku1);
    payload.append("kingaku", form.value.kingaku);
    payload.append("kamoku2", form.value.kamoku2);
    payload.append("aite", form.value.aite);
    payload.append("naiyo", form.value.naiyo);
    payload.append("hindo", form.value.hindo);

    for (let m = 1; m <= 12; m++){
      payload.append(`month${m}`, form.value.month[m] ? "〇" : "");
    }

    const res = await fetch(`${GAS_URL}?mode=MonthlyUpdate`, {
      method: "POST",
      body: payload
    });

    const result = await res.json();
    alert(result.message);

    item.dirty = false;

  } catch (e) {
    alert("更新に失敗しました: " + e.message);
  }

  loadingStore.globalLoading.value = false;
};
</script>


<template>
  <div class="settings-wrapper">

    <div
      v-for="category in categories"
      :key="category.daikoumoku"
      class="card"
    >
      <div class="item-area">

        <div
          v-for="(item, index) in category.items"
          :key="index"
          class="item-list"
        >

          <div class="item-row">
            <span class="item-No">{{ item.No }}</span>
            <span class="item-date">{{ item.day }}</span>
            <span class="item-name">{{ item.name }}</span>
            <button @click="toggle(item)">＋</button>
          </div>

          <div v-if="openedCode === item.No" class="info-area">

            <label>科目（増えるもの）</label>      
              <select v-model="localForm.kamoku1"  class="select-field">
                <option 
                  v-for="item in props.listAllKouza"
                  :key="item.code"
                  :value="item.code"
                >
                  {{item.daikoumoku }}_{{ item.shoukoumoku }}
                </option>
              </select>

            <label>金額</label>
            <input type="number" v-model="form.kingaku">

            <label>支払元（減るもの）</label>
              <select v-model="localForm.kamoku2"  class="select-field">
                <option 
                  v-for="item in props.listAllKouza"
                  :key="item.code"
                  :value="item.code"
                >
                  {{item.daikoumoku }}_{{ item.shoukoumoku }}
                </option>
              </select>

            <label>店（相手）</label>
            <input v-model="form.aite">

            <label>内容</label>
            <input v-model="form.naiyo">

            <label>毎月チェック</label>
            <div class="month-check">
              <label v-for="m in 12" :key="m">
                <input type="checkbox" v-model="form.month[m]"> {{m}}月
              </label>
            </div>

            <button class="update-btn" @click="update(item)">
              更新
            </button>

          </div>
        </div>
      </div>

      <button class="add-btn">
        新規追加
      </button>

    </div>
  </div>
</template>


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