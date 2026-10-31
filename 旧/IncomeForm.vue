

<template>
  <form class="card input-form" @submit.prevent="submitForm">

    <!-- 日付 -->
    <div class="row form-row">
      <label for="income-date" class="form-label field-label">
        <CalendarDays />
        <span>日付</span>
      </label>
      <input
        id="income-date"
        type="date"
        v-model="localForm.date"
        class="input-field"
        aria-label="取引日を選択"
      />
      <span v-if="weekday">（{{ weekday }}）</span>
    </div>

    <!-- 科目 -->
    <div class="row form-row">
      <label for="income-category" class="form-label field-label">
        <Tags />
        <span>科目</span>
      </label>
      <select
        id="income-category"
        v-model="localForm.kamoku2"
        class="select-field"
      >
        <option value="" disabled>科目を選択</option>
        <option
          v-for="item in props.listSyunyu"
          :key="item.code"
          :value="item.code"
        >
          {{ item.daikoumoku }}_{{ item.shoukoumoku }}
        </option>
      </select>
    </div>

    <!-- 口座 -->
    <div class="row form-row">
      <label for="income-account" class="form-label field-label">
        <Wallet />
        <span>口座</span>
      </label>
      <select
        id="income-account"
        v-model="localForm.kamoku1"
        class="select-field"
      >
        <option value="" disabled>口座を選択</option>
        <option
          v-for="item in props.listHouhou"
          :key="item.code"
          :value="item.code"
        >
          {{ item.shoukoumoku }}
        </option>
      </select>
    </div>

    <!-- 相手 -->
    <div class="row form-row">
      <label for="income-shop" class="form-label field-label">
        <Store />
        <span>相手</span>
      </label>
      <input
        id="income-shop"
        type="text"
        v-model="localForm.aite"
        list="incomeShopList"
        class="input-field"
        placeholder="振込元・相手を入力"
      />
      <datalist id="incomeShopList">
        <option v-for="s in shops" :key="s" :value="s" />
      </datalist>
    </div>

    <!-- 金額 -->
    <div class="row form-row">
      <label for="income-amount" class="form-label field-label">
        <JapaneseYen />
        <span>金額</span>
      </label>
      <input
        id="income-amount"
        class="input-field input-number"
        type="number"
        inputmode="numeric"
        v-model="localForm.kingaku1"
        placeholder="収入金額を入力"
      />
    </div>

    <!-- 内容 -->
    <div class="row form-row">
      <label for="income-description" class="form-label field-label">
        <NotebookPen />
        <span>内容</span>
      </label>
      <input
        id="income-description"
        type="text"
        v-model="localForm.naiyo"
        class="input-field"
        placeholder="収入の内容・メモを入力"
      />
    </div>

    <!-- 支払い確認 -->
    <div class="row form-row">
      <label class="form-label field-label">
        <ClipboardCheck />
        <span>入金確認</span>
      </label>
      <div class="radio-group">
        <label>
          <input type="radio" value="true" v-model="localForm.kakunin" />
          入金確認済み
        </label>
        <label>
          <input type="radio" value="false" v-model="localForm.kakunin" />
          入金未確認
        </label>
      </div>
    </div>

    <!-- ローディング -->
    <div class="loading-area">
      <LoadingIcon :show="isLoading" />
    </div>

    <!-- 追加 or 修正 -->
    <div class="form-actions">
      <button class="btn-lg btn" type="submit" :disabled="isLoading">
        {{ props.mode === 'edit' ? '修正' : '追加' }}
      </button>

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
import {
  CalendarDays,
  Tags,
  Wallet,
  Store,
  JapaneseYen,
  NotebookPen,
  ClipboardCheck
} from 'lucide-vue-next'
import loadingStore from "@/stores/loadingStore"
import LoadingIcon from './LoadingIcon.vue'

const props = defineProps({
  listSyunyu: { type: Array, default: () => [] },
  listHouhou: { type: Array, default: () => [] },
  listCodeShops: { type: Array, default: () => [] },
  mode: { type: String, default: "add" },
  form: { type: Object, default: null }
})

const emit = defineEmits(["submit", "delete"])

const today = new Date().toISOString().slice(0, 10)

console.log("listSyunyu:", props.listSyunyu)
console.log("listHouhou:", props.listHouhou)
console.log("listCodeShops:", props.listCodeShops)

const localForm = ref({
  id: props.form?.id || "",
  rowNo: props.form?.rowNo || "",
  type: 'income',
  mode: props.form?.mode || "add",
  date: props.date
    ? new Date(props.date).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" })
    : today,
  kamoku1: Math.floor(props.form?.kamoku2) || 700,
  kamoku2: Math.floor(props.form?.kamoku1) || 700,
  aite: props.form?.aite || "",
  kingaku1: Math.floor(props.form?.kingaku1) || 0,
  naiyo: props.form?.naiyo || "",
  kakunin: props.form?.kakunin || "false"
})

watch(() => props.listShishutsu, () => {
  console.log(props.listShishutsu)

  if (!props.listShishutsu.some(i => i.code === localForm.value.kamoku2)) {
    localForm.value.kamoku2 = localForm.value.kamoku2 || 700
    console.log("kamoku2" + props.value.kamoku2)
  }
})

watch(() => props.listHouhou, () => {
  console.log(props.listHouhou)

  if (!props.listHouhou.some(i => i.code === localForm.value.kamoku1)) {
    localForm.value.kamoku1 = localForm.value.kamoku1 || 700
    console.log("kamoku1" + props.value.kamoku1)
  }
})

watch(
  () => props.form,
  (newForm) => {
    if (!newForm) return

    console.log("watch=", newForm)

    localForm.value = {
      rowNo: newForm.rowNo || "",
      id: newForm.id || "",
      type: 'income',
      mode: newForm.form?.mode || "add",
      date: newForm.date
        ? new Date(newForm.date).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" })
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

// 相手の店リスト
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

const globalLoading = loadingStore.globalLoading

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

// 送信
const submitForm = async () => {
  console.log("localForm:", localForm.value)
  isLoading.value = true

  try {
    emit("submit", { ...localForm.value })
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.field-label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.field-label svg {
  width: 17px;
  height: 17px;
  flex: 0 0 17px;
  color: var(--color-coffee);
  stroke-width: 2;
}

.form-row > .input-field,
.form-row > .select-field {
  flex: 1 1 0;
  min-width: 0;
}

@media (max-width: 420px) {
  .field-label {
    align-self: flex-start;
  }

  .form-row > .input-field,
  .form-row > .select-field {
    width: 100%;
    flex: 0 1 auto;
  }
}
</style>







