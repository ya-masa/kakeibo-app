<template>
  <form @submit.prevent="submitForm">
    <div class="row">
      <label class="form-lavel">日付</label>
      <input type="date" v-model="localForm.date" class="input-field" />
      <!-- 曜日があるときだけ表示 -->
      <span v-if="weekday">（{{ weekday }}）</span>
    </div>

    <div class="row">
      <label  class="form-lavel">科目</label>
      <select v-model="localForm.kamoku2"  class="select-field">
        <option 
          v-for="item in props.listSyunyu"
          :key="item.code"
          :value="item.code"
        >
          {{ item.daikoumoku }}_{{ item.shoukoumoku }}
        </option>
      </select>
    </div>

    <div class="row">
      <label  class="form-lavel">口座</label>
      <select v-model="localForm.kamoku1"  class="select-field">
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
      <label  class="form-lavel">相手</label>
      <input type="text" v-model="localForm.aite" list="shopList"  class="input-field"/>
      <datalist id="shopList">
        <option v-for="s in shops" :key="s" :value="s" />
      </datalist>
    </div>

    <div class="row">
      <label  class="form-lavel">金額</label>
      <input class="input-field input-number" type="number" v-model="kingaku1" />
    </div>

    <div class="row">
      <label  class="form-lavel">内容</label>
      <input type="text" v-model="localForm.naiyo"  class="input-field"/>
    </div>

    <div class="row">
      <label  class="form-lavel">残高確認</label>
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
    <button class="btn" type="submit" :disabled="isLoading">
      {{ props.mode === 'edit' ? '修正' : '追加' }}
    </button>

    <!-- 削除（修正モードのみ） -->
    <button 
      class="btn-red"
      v-if="props.mode === 'edit'" 
      type="button"
      @click="emit('delete', props.form.rowNo)"
    >
      削除
    </button>

    <LoadingIcon :show="globalLoading" v-show="globalLoading" />
  </form>
</template>

<script setup>
import { ref, computed ,onMounted,watch} from 'vue'
import loadingStore from "@/stores/loadingStore"
import LoadingIcon from './LoadingIcon.vue'

  const props = defineProps({
    listShunyu: { type: Array, default: () => [] },
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
  console.log("listSyunyu:",listShunyu) 
  console.log("listHouhou:",listHouhou) 
  console.log("listCodeShops:",listCodeShops) 
  const localForm = ref({
    rowNo: props.form?.rowNo || "",
    type:"income",
    mode:props.form?.mode || "add",
    date: props.form?.date || today,
    kamoku1: Number(props.form?.kamoku2) || 700,
    kamoku2: Number(props.form?.kamoku1) || 700,
    aite: props.form?.aite || "",
    kingaku1: props.form?.kingaku1 || "",
    naiyo: props.form?.naiyo || "",
    kakunin: props.form?.kakunin || "false"
  })

  /* -----------------------------------------
    computed：kingaku1 を自動切替
  ----------------------------------------- */
  const kingaku1 = computed({
    get() {
      return localForm.value.kingaku1;
    },
    set(value){
      const num = Number(value) || 0;
      localForm.value.kingaku1 = num;
    }
  });


  watch(() => props.listKamoku, () => {
    // 科目リストが更新されたら選択値を再調整
    if (!props.listSyunyu.some(i => i.code === localForm.value.kamoku2)) {
      localForm.value.kamoku2 = props.listSyunyu[0]?.code || ""
    }
  })
  watch(() => props.listHouhou, () => {
    // 口座リストが更新されたら選択値を再調整
    if (!props.listHouhou.some(i => i.code === localForm.value.kamoku1)) {
      localForm.value.kamoku1 = props.listHouhou[0]?.code || ""
    }
  })

  // ---------------------------
  // 相手の店リスト
  // ---------------------------
  const shops = computed(() => {
    if (!props.listCodeShops?.length) return []

    if (!localForm.value.kamoku1) {
      return props.listCodeShops.flatMap(i => i.shops)
    }

    const item = props.listCodeShops.find(i => i.code === localForm.value.kamoku2)
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
    
    console.log("localForm:",localForm.value) 
    isLoading.value = true

    try {
      emit("submit", { ...localForm.value })
    } finally {
      isLoading.value = false
    }
  }
</script>

<style>
form{
  width:90%;
  margin:16px auto;
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.radio-group {
  display: flex;
  gap: 20px;
}

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

@media (max-width:375px){
  .row{
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>



