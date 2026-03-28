<template>
  <form @submit.prevent="submitForm">
    <div class="row">
      <label>日付</label>
      <input type="date" v-model="localForm.date" />
    </div>

    <div class="row">
      <label>科目1</label>
      <select v-model="localForm.kamoku1">
        <option 
          v-for="item in props.listKouza"
          :key="item.code"
          :value="item.code"
        >
          {{ item.shoukoumoku }}
        </option>
      </select>
    </div>

    <div class="row">
      <label>金額1</label>
      <input type="number" v-model="localForm.kingaku1" />
    </div>

    <div class="row">
      <label>科目2</label>
      <select v-model="localForm.kamoku2">
        <option 
          v-for="item in props.listKouza"
          :key="item.code"
          :value="item.code"
        >
          {{ item.shoukoumoku }}
        </option>
      </select>
    </div>

    <div class="row">
      <label>金額2</label>
      <input type="number" v-model="localForm.kingaku2" />
    </div>

    <div class="row">
      <label>相手</label>
      <input type="text" v-model="localForm.aite" list="shopList" />
      <datalist id="shopList">
        <option v-for="s in shops" :key="s" :value="s" />
      </datalist>
    </div>

    <div class="row">
      <label>内容</label>
      <input type="text" v-model="localForm.naiyo" />
    </div>

    <div class="row">
      <label>残高確認</label>
      <div class="radio-group">
      <label>
        <input type="radio" value="true" v-model="localForm.kakunin">
        確認済み
      </label>
      <label>
        <input type="radio" value="false" v-model="localForm.kakunin">
        未確認
      </label>
      </div>
    </div>
    <!-- ローディング -->
    <div class="loading-area">
      <LoadingIcon :show="isLoading" />
    </div>
    <LoadingIcon :show="globalLoading" v-show="globalLoading"/>
    <!-- ボタン（追加 or 修正） -->
    <button class="save-btn" type="submit" :disabled="isLoading">
      {{ props.mode === 'edit' ? '修正' : '追加' }}
    </button>

    <!-- 削除ボタン（修正モードのみ） -->
    <button 
      v-if="props.mode === 'edit'" 
      class="delete-btn" 
      type="button":disabled="isLoading"
      @click="localForm?.value?.rowNo && emit('delete', localForm.value.rowNo)"
    >
      削除
    </button>
  </form>
</template>

<script setup>
import { ref, computed, watch ,onMounted} from 'vue'
import LoadingIcon from './LoadingIcon.vue'
import loadingStore from "@/stores/loadingStore"

  const props = defineProps({
    listKouza: { type: Array, default: () => [] },
    listCodeShops: { type: Array, default: () => [] },
    mode: { type: String, default: "add" },
    form: { type: Object, default: null }
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
    kingaku1: props.form?.kingaku1 || "",
    kingaku2: props.form?.kingaku2 || "",
    aite: props.form?.aite || "",
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

  // ---------------------------
  // 金額の自動反転（無限ループ防止）
  // ---------------------------
  let updating = false

  watch(() => localForm.value.kingaku1, (val) => {
    if (updating) return
    updating = true
    localForm.value.kingaku2 = val ? -Number(val) : ""
    updating = false
  })

  watch(() => localForm.value.kingaku2, (val) => {
    if (updating) return
    updating = true
    localForm.value.kingaku1 = val ? -Number(val) : ""
    updating = false
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
const isLoading=ref(false)
// ---------------------------
// 送信（追加 or 修正）
// ---------------------------
const submitForm = async () => {
    isLoading.value = true
  try {
    emit("submit", { ...localForm.value })
  } finally {
  }
}
</script>

<style>
.row {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  background-color: #f7f3ee;
}

.row label {
  width: 100px; 
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

.save-btn {
  width: 100%;
  padding: 12px;
  background: #c8a27e;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

.delete-btn {
  width: 100%;
  padding: 12px;
  background: #f47270;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  margin-top: 10px;
  cursor: pointer;
}

.save-btn:hover {
  background: #6b4f3f;
}

.delete-btn:hover {
  background: #d32f2f;
}

/*ラジオボタンの設定 */
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
  background: #6b4f3f;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>


