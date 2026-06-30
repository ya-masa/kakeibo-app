<template>
  <form @submit.prevent="submitForm">
    <div class="row">
      <label class="form-lavel">日付</label>
      <input type="date" v-model="localForm.date" class="input-field" />
      <!-- 曜日は表示しない -->
      <span v-if="false">（{{ weekday }}）</span>
    </div>

    <div class="row">
      <label class="form-lavel">科目1</label>
      <select v-model="localForm.kamoku1" class="select-field">
        <option 
          v-for="item in props.listKouza"
          :key="item.code"
          :value="item.code"
        >
          {{ item.daikoumoku }}_{{ item.shoukoumoku }}
        </option>
      </select>
    </div>

    <div class="row">
      <label class="form-lavel">金額1</label>
      <input type="number" v-model="localForm.kingaku1" class="input-field input-number"
/>
    </div>

    <div class="row">
      <label class="form-lavel">科目2</label>
      <select v-model="localForm.kamoku2" class="select-field">
        <option 
          v-for="item in props.listKouza"
          :key="item.code"
          :value="item.code"
        >
          {{ item.daikoumoku }}_{{ item.shoukoumoku }}
        </option>
      </select>
    </div>

    <div class="row">
      <label class="form-lavel">金額2</label>
      <input type="number" v-model="localForm.kingaku2" class="input-field input-number"
 />
    </div>

    <div class="row">
      <label class="form-lavel">相手</label>
      <input type="text" v-model="localForm.aite" list="shopList" class="input-field"
 />
      <datalist id="shopList">
        <option v-for="s in shops" :key="s" :value="s" />
      </datalist>
    </div>

    <div class="row">
      <label class="form-lavel">内容</label>
      <input type="text" v-model="localForm.naiyo" class="input-field"
/>
    </div>

    <div class="row">
      <label class="form-lavel">残高確認</label>
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
    <button class="btn" type="submit" :disabled="isLoading">
      {{ props.mode === 'edit' ? '修正' : '追加' }}
    </button>

    <!-- 削除ボタン（修正モードのみ） -->
    <button 
      class="btn-red"
      v-if="props.mode === 'edit'"  
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
    var k1
    var k2
    console.log("propsData:",props.form)
    if(props.form?.kingaku2<0){       //収入
      k1=props.form?.kingaku1
      k2=props.form?.kingaku2
    }else if(props.form?.kingaku1<0){  //支出
      k1=props.form?.kingaku2
      k2=props.form?.kingaku1
    }else{                         //振替
      k1=props.form?.kingaku1
      k2=props.form?.kingaku2
    }
  const localForm = ref({
    rowNo: props.form?.rowNo || "",
    type:props.form?.type || "transfer",
    date: props.form?.date || today,
    kamoku1: props.form?.kamoku1 || "",
    kamoku2: props.form?.kamoku2 || "",
    kingaku1: k1 || "",
    kingaku2: k2 || "",
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

form{
  width:90%;
}

.row {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}

/*ラジオボタンの設定 */
/* デフォルトのラジオボタンを消す */
input[type="radio"] {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  width: 20px;   /* 好きなサイズに変更 */
  height: 20px;  /* 好きなサイズに変更 */
  border: 2px solid var(--dark-brown);
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
  background: var(--dark-brown);
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.radio-group {
  display: flex;
  gap: 16px;
  align-items: center;
}

@media (max-width: 375px) {
  .row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>


