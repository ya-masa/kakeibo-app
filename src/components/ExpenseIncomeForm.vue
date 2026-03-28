<template>
  <form @submit.prevent="submitForm">
    <div class="row">
      <label>日付</label>
      <input type="date" v-model="localForm.date" />
    </div>

    <div class="row">
      <label>科目</label>
      <select v-model="localForm.kamoku1">
        <option 
          v-for="item in props.listKamoku"
          :key="item.code"
          :value="item.code"
        >
          {{ item.daikoumoku }}_{{ item.shoukoumoku }}
        </option>
      </select>
    </div>

    <div class="row">
      <label>口座</label>
      <select v-model="localForm.kamoku2">
        <option 
          v-for="item in props.listHouhou" 
          :key="item.code" 
          :value="item.code"
        >
          {{ item.shoukoumoku }}
        </option>
      </select>
    </div>

    <div class="row">
      <label>相手</label>
      <input type="text" v-model="localForm.aite" list="shopList" />
      <datalist id="shopList">
        <option v-for="s in shops" :key="s" :value="s" />
      </datalist>
    </div>

    <div class="row">
      <label>金額</label>
      <input type="number" v-model="localForm.kingaku1" />
    </div>

    <div class="row">
      <label>内容</label>
      <input type="text" v-model="localForm.naiyo" />
    </div>

    <div class="row">
      <label>残高確認</label>
      <div class="radio-group">
        <label><input type="radio" value="true" v-model="localForm.kakunin" /> 確認済み</label>
        <label><input type="radio" value="false" v-model="localForm.kakunin" /> 未確認</label>
      </div>
    </div>
    <!-- ローディング -->
    <div class="loading-area">
      <LoadingIcon :show="loading" />
    </div>
    <!-- 追加 or 修正 -->
    <button class="save-btn" type="submit" :disabled="isLoading">
      {{ props.mode === 'edit' ? '修正' : '追加' }}
    </button>

    <!-- 削除（修正モードのみ） -->
    <button 
      v-if="props.mode === 'edit'" 
      class="delete-btn" 
      type="button"
      @click="emit('delete', props.form.rowNo)"
    >
      削除
    </button>

    <LoadingIcon :show="globalLoading" v-show="globalLoading" />
  </form>
</template>

<script setup>
import { ref, computed ,onMounted} from 'vue'
import loadingStore from "@/stores/loadingStore"
import LoadingIcon from './LoadingIcon.vue'

  const props = defineProps({
    listKamoku: { type: Array, default: () => [] },
    listHouhou: { type: Array, default: () => [] },
    listCodeShops: { type: Array, default: () => [] },
    mode: { type: String, default: "add" },   // add / edit
    form: { type: Object, default: null }     // 修正時のデータ
  })

  const emit = defineEmits(["submit", "delete"])

  // ---------------------------
  // 初期値（追加 or 修正）
  // ---------------------------
    const today = new Date().toISOString().slice(0, 10)

  const localForm = ref({
    rowNo: props.form?.rowNo || "",
    date: props.form?.date || today,
    kamoku1: props.form?.kamoku1 || "",
    kamoku2: props.form?.kamoku2 || "",
    aite: props.form?.aite || "",
    kingaku1: props.form?.kingaku1 || "",
    naiyo: props.form?.naiyo || "",
    kakunin: props.form?.kakunin || "false"
  })


  // ---------------------------
  // 相手の店リスト
  // ---------------------------
  const shops = computed(() => {
    if (!props.listCodeShops?.length) return []

    if (!localForm.value.kamoku1) {
      return props.listCodeShops.flatMap(i => i.shops)
    }

    const item = props.listCodeShops.find(i => i.code === localForm.value.kamoku1)
    return item?.shops || []
  })
onMounted(() => {
  requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    // ここでローディングを消す（長めにしたいなら調整）
    setTimeout(() => {
      loadingStore.globalLoading.value = false
    }, 500) // ← ここを好きな時間にできる
    })
  })
})
const isLoading = ref(false)
// ---------------------------
// 送信（追加 or 修正）
// ---------------------------
const submitForm = async () => {
  try {
    isLoading.value = true

    console.log("送信:", localForm.value)
    emit("submit", { ...localForm.value })
  } finally {
    isLoading.value = false
  }
}
</script>

<style>
.row {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.row label {
  width: 160px; 
  font-size: 14px;
  font-weight: 500;
}

.row input,
.row select {
  flex: 1;
  height:44px;
  padding:10px 12px;
  font-size:16px;
}

.row input[type="Number"]{
  text-align: right;
}
.radio-group {
  display: flex;
  gap: 20px;
}

.save-btn {
  width: 100%;
  padding: 12px;
  background: #4caf50;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

.delete-btn {
  width: 100%;
  padding: 12px;
  background: #e53935;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  margin-top: 10px;
  cursor: pointer;
}
/* デフォルトのラジオボタンを消す */
input[type="radio"] {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  width: 20px;   /* 好きなサイズに変更 */
  height: 20px;  /* 好きなサイズに変更 */
  border: 2px solid #555;
  border-radius: 50%;
  display: inline-block;
  position: relative;
  cursor: pointer;
}

/* チェックされたときの中の丸 */
input[type="radio"]:checked::before {
  content: "";
  width: 12px;   /* 内側の丸のサイズ */
  height: 12px;
  background: #007bff;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>



