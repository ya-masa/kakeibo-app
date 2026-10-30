
<template>
  <form class="card" @submit.prevent="submitForm">
    <div class="row form-row">
      <label class="form-label">日付</label>
      <input type="date" v-model="localForm.date" class="input-field" />
      <!-- 曜日があるときだけ表示 -->
      <span v-if="weekday">（{{ weekday }}）</span>
    </div>

    <div class="row form-row">
      <label class="form-label">科目</label>
      <select v-model="localForm.kamoku2" class="select-field">
        <option
          v-for="item in props.listShishutsu"
          :key="item.code"
          :value="item.code"
        >
          {{ item.daikoumoku }}_{{ item.shoukoumoku }}
        </option>
      </select>
    </div>

    <div class="row form-row">
      <label class="form-label">口座</label>
      <select v-model="localForm.kamoku1" class="select-field">
        <option
          v-for="item in props.listHouhou"
          :key="item.code"
          :value="item.code"
        >
          {{ item.shoukoumoku }}
        </option>
      </select>
    </div>

    <div class="row form-row">
      <label class="form-label">相手</label>
      <input
        type="text"
        v-model="localForm.aite"
        list="shopList"
        class="input-field"
      />
      <datalist id="shopList">
        <option v-for="s in shops" :key="s" :value="s" />
      </datalist>
    </div>

    <div class="row form-row">
      <label class="form-label">金額</label>
      <input
        class="input-field input-number"
        type="number"
        v-model="localForm.kingaku1"
      />
    </div>

    <div class="row form-row">
      <label class="form-label">内容</label>
      <input
        type="text"
        v-model="localForm.naiyo"
        class="input-field"
      />
    </div>

    <div class="row form-row">
      <label class="form-label">支払い確認</label>
      <div class="radio-group">
        <label>
          <input type="radio" value="true" v-model="localForm.kakunin" />
          支払い確認済み
        </label>
        <label>
          <input type="radio" value="false" v-model="localForm.kakunin" />
          支払い未確認
        </label>
      </div>
    </div>

    <!-- ローディング -->
    <div class="loading-area">
      <LoadingIcon :show="loading" />
    </div>

    <!-- 追加 or 修正 -->
    <div class="form-actions">
      <button class="btn-lg btn" type="submit" :disabled="isLoading">
        {{ props.mode === 'edit' ? '修正' : '追加' }}
      </button>

      <!-- 削除（修正モードのみ） -->
      <button
        class="btn-lg btn-red"
        v-if="props.mode === 'edit'"
        type="button"
        @click="emit('delete', props.form.id)"
      >
        削除
      </button>
    </div>

    <LoadingIcon :show="globalLoading" v-show="globalLoading" />
  </form>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import loadingStore from "@/stores/loadingStore"
import LoadingIcon from './LoadingIcon.vue'

const props = defineProps({
  listShishutsu: { type: Array, default: () => [] },
  listHouhou: { type: Array, default: () => [] },
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
  id: props.form?.id || "",
  type: 'expense',
  mode: props.form?.mode || "add",
  date: props.date
    ? new Date(props.date).toLocaleDateString("sv-SE", {
        timeZone: "Asia/Tokyo"
      })
    : today,
  kamoku1: String(props.form?.kamoku1) || 700,
  kamoku2: String(props.form?.kamoku2) || 700,
  aite: props.form?.aite || "",
  kingaku1: Math.abs(Number(props.form?.kingaku1)) || 0,
  naiyo: props.form?.naiyo || "",
  kakunin: props.form?.kakunin || "false"
})

// ---------------------------
// 科目・口座リストの更新監視
// ---------------------------
watch(() => props.listShishutsu, () => {
  if (!props.listShishutsu.some(i => i.code === localForm.value.kamoku2)) {
    localForm.value.kamoku2 = localForm.value.kamoku2 || 700
  }
})

watch(() => props.listHouhou, () => {
  if (!props.listHouhou.some(i => i.code === localForm.value.kamoku1)) {
    localForm.value.kamoku1 = localForm.value.kamoku1 || 700
  }
})

// ---------------------------
// 修正データの反映
// ---------------------------
watch(
  () => props.form,
  (newForm) => {
    if (!newForm) return

    localForm.value = {
      rowNo: newForm.rowNo || "",
      id: newForm.id || "",
      type: 'expense',
      mode: newForm.form?.mode || "add",
      date: newForm.date
        ? new Date(newForm.date).toLocaleDateString("sv-SE", {
            timeZone: "Asia/Tokyo"
          })
        : today,
      kamoku1: String(newForm.kamoku1) || 700,
      kamoku2: String(newForm.kamoku2) || 700,
      aite: newForm.aite || "",
      kingaku1: Math.abs(Number(newForm.kingaku1)) || 0,
      naiyo: newForm.naiyo || "",
      kakunin: String(newForm.kakunin ?? "false")
    }
  },
  { immediate: true }
)

// ---------------------------
// 相手の店リスト
// ---------------------------
const shops = computed(() => {
  if (!props.listCodeShops?.length) return []

  if (!localForm.value.kamoku1) {
    return props.listCodeShops.flatMap(i => i.shops)
  }

  const item = props.listCodeShops.find(
    i => i.code === localForm.value.kamoku2
  )

  return item?.shops || []
})

// ---------------------------
// 初期ローディング
// ---------------------------
onMounted(() => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        loadingStore.globalLoading.value = false
      }, 50)
    })
  })
})

const isLoading = ref(false)

// ---------------------------
// 送信（追加 or 修正）
// ---------------------------
const submitForm = async () => {
  isLoading.value = true
  console.log("localForm:", localForm.value)

  try {
    emit("submit", { ...localForm.value })
  } finally {
    isLoading.value = false
  }
}
</script>



