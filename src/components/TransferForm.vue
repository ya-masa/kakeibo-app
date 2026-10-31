<template>
  <form class ="card" @submit.prevent="submitForm">
    <div class="row">
      <label class="form-label">日付</label>
      <input type="date" v-model="localForm.date" class="input-field" />
      <!-- 曜日は表示しない -->
      <span v-if="false">（{{ weekday }}）</span>
    </div>

    <div class="row">
      <label class="form-label">増える科目</label>
      <select v-model="localForm.kamoku1" class="select-field">
        <option 
          v-for="item in props.listKouza"
          :key="item.code"
          :value="String(item.code)"
        >
          {{ item.daikoumoku }}_{{ item.shoukoumoku }}
        </option>
      </select>
    </div>

    <div class="row">
      <label class="form-label">金額プラス</label>
      <div class="amount-input-wrap">
        <input type="number" v-model="localForm.kingaku1" class="input-field input-number" />
        <span class="amount-unit">円</span>
      </div>
    </div>

    <div class="row">
      <label class="form-label">減る科目</label>
      <select v-model="localForm.kamoku2" class="select-field">
        <option 
          v-for="item in props.listKouza"
          :key="item.code"
          :value="String(item.code)"
        >
          {{ item.daikoumoku }}_{{ item.shoukoumoku }}
        </option>
      </select>
    </div>

    <div class="row">
      <label class="form-label">金額マイナス</label>
      <div class="amount-input-wrap">
        <input type="number" v-model="localForm.kingaku2" class="input-field input-number" />
        <span class="amount-unit">円</span>
      </div>
    </div>

    <div class="row">
      <label class="form-label">相手</label>
      <input type="text" v-model="localForm.aite" list="shopList" class="input-field"
 />
      <datalist id="shopList">
        <option v-for="s in shops" :key="s" :value="s" />
      </datalist>
    </div>

    <div class="row">
      <label class="form-label">内容</label>
      <input type="text" v-model="localForm.naiyo" class="input-field"
/>
    </div>

    <div class="row">
      <label class="form-label">支払い確認</label>
      <div class="radio-group">
      <label>
        <input type="radio" value="true" v-model="localForm.kakunin">
        支払い確認済み
      </label>
      <label>
        <input type="radio" value="false" v-model="localForm.kakunin">
        支払い未確認
      </label>
      </div>
    </div>
    <!-- ローディング -->
    <div class="loading-area">
      <LoadingIcon :show="isLoading" />
    </div>
    <LoadingIcon :show="globalLoading" v-show="globalLoading"/>
    <!-- ボタン（追加 or 修正） -->
    <button class="btn-lg btn" type="submit" :disabled="isLoading">
      {{ props.mode === 'edit' ? '修正' : '追加' }}
    </button>

    <!-- 削除ボタン（修正モードのみ） -->
    <button 
      class="btn-lg btn-red"
      v-if="props.mode === 'edit'"  
      type="button":disabled="isLoading"
      @click="emit('delete', localForm.value.id)"
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
  console.log("propsData:",props.form)                      //振替
  const localForm = ref({
    rowNo: props.form?.rowNo || "",
    id: props.form?.id || "",
    mode:props.form?.mode || "add",
    type:"transfer",
    date: props.form?.date || today,
    kamoku1: props.form?.kamoku1 || 700,
    kamoku2: props.form?.kamoku2 || 700,
    kingaku1: props.form?.kingaku1,
    kingaku2: props.form?.kingaku2,
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
    localForm.value.kingaku2 = val ? -val: ""
    updating = false
  })

  watch(() => localForm.value.kingaku2, (val) => {
    if (updating) return
    updating = true
    localForm.value.kingaku1 = val ? -val: ""
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
    console.log("localForm:",localForm.value)   
  try {
    emit("submit", { ...localForm.value })
  } finally {
  }
}


</script>

<style scoped>
.amount-input-wrap {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: 8px;
}
.amount-input-wrap .input-field {
  flex: 1;
  min-width: 0;
  margin-bottom: 0;
}
.amount-unit {
  flex: 0 0 auto;
  color: var(--color-muted);
  font-size: 14px;
  font-weight: 700;
}

.radio-group {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

/* ラジオボタン：中央に●を表示 */
input[type="radio"] {
  appearance: none;
  -webkit-appearance: none;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  margin: 0;
  border: 1px solid var(--color-text);
  border-radius: 50%;
  background-color: white;
  display: inline-grid;
  place-content: center;
  cursor: pointer;
}

/* 選択時に中央へ大きな●を表示 */
input[type="radio"]::before {
  content: "";
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: var(--color-text);
  transform: scale(0);
  transition: transform 120ms ease-in-out;
}

input[type="radio"]:checked::before {
  transform: scale(1);
}

input[type="radio"]:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 1px;
}

input[type="radio"]:checked {
  border: 1px solid var(--color-text);
  background: transparent;
}

input[type="radio"]:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 1px;
}

/*@media (max-width: 400px) {
  .row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}*/
</style>


