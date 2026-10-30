
<template>
  <form class="card input-form" @submit.prevent="submitForm">

    <!-- 日付 -->
    <div class="row form-row">
      <label for="transfer-date" class="form-label field-label">
        <CalendarDays />
        <span>日付</span>
      </label>
      <input
        id="transfer-date"
        type="date"
        v-model="localForm.date"
        class="input-field"
        aria-label="移動日を選択"
      />
    </div>

    <!-- 増える科目 -->
    <div class="row form-row">
      <label for="transfer-in-account" class="form-label field-label">
        <Wallet />
        <span>増える科目</span>
      </label>
      <select
        id="transfer-in-account"
        v-model="localForm.kamoku1"
        class="select-field"
      >
        <option value="" disabled>増える口座を選択</option>
        <option
          v-for="item in props.listKouza"
          :key="item.code"
          :value="String(item.code)"
        >
          {{ item.daikoumoku }}_{{ item.shoukoumoku }}
        </option>
      </select>
    </div>

    <!-- 金額プラス -->
    <div class="row form-row">
      <label for="transfer-in-amount" class="form-label field-label">
        <TrendingUp />
        <span>金額プラス</span>
      </label>
      <input
        id="transfer-in-amount"
        type="number"
        inputmode="numeric"
        v-model="localForm.kingaku1"
        class="input-field input-number"
        placeholder="増える金額を入力"
      />
    </div>

    <!-- 減る科目 -->
    <div class="row form-row">
      <label for="transfer-out-account" class="form-label field-label">
        <Wallet />
        <span>減る科目</span>
      </label>
      <select
        id="transfer-out-account"
        v-model="localForm.kamoku2"
        class="select-field"
      >
        <option value="" disabled>減る口座を選択</option>
        <option
          v-for="item in props.listKouza"
          :key="item.code"
          :value="String(item.code)"
        >
          {{ item.daikoumoku }}_{{ item.shoukoumoku }}
        </option>
      </select>
    </div>

    <!-- 金額マイナス -->
    <div class="row form-row">
      <label for="transfer-out-amount" class="form-label field-label">
        <TrendingDown />
        <span>金額マイナス</span>
      </label>
      <input
        id="transfer-out-amount"
        type="number"
        inputmode="numeric"
        v-model="localForm.kingaku2"
        class="input-field input-number"
        placeholder="減る金額を入力"
      />
    </div>

    <!-- 相手 -->
    <div class="row form-row">
      <label for="transfer-shop" class="form-label field-label">
        <Store />
        <span>相手</span>
      </label>
      <input
        id="transfer-shop"
        type="text"
        v-model="localForm.aite"
        list="transferShopList"
        class="input-field"
        placeholder="振込先・相手を入力"
      />
      <datalist id="transferShopList">
        <option v-for="s in shops" :key="s" :value="s" />
      </datalist>
    </div>

    <!-- 内容 -->
    <div class="row form-row">
      <label for="transfer-description" class="form-label field-label">
        <NotebookPen />
        <span>内容</span>
      </label>
      <input
        id="transfer-description"
        type="text"
        v-model="localForm.naiyo"
        class="input-field"
        placeholder="資金移動の内容・メモを入力"
      />
    </div>

    <!-- 支払い確認 -->
    <div class="row form-row">
      <label class="form-label field-label">
        <ClipboardCheck />
        <span>移動確認</span>
      </label>
      <div class="radio-group">
        <label>
          <input
            type="radio"
            value="true"
            v-model="localForm.kakunin"
          />
          移動確認済み
        </label>
        <label>
          <input
            type="radio"
            value="false"
            v-model="localForm.kakunin"
          />
          移動未確認
        </label>
      </div>
    </div>

    <!-- ローディング -->
    <div class="loading-area">
      <LoadingIcon :show="isLoading" />
    </div>

    <LoadingIcon :show="globalLoading" v-show="globalLoading" />

    <!-- 追加 or 修正 -->
    <div class="form-actions">
      <button class="btn-lg btn" type="submit" :disabled="isLoading">
        {{ props.mode === 'edit' ? '修正' : '追加' }}
      </button>

      <button
        class="btn-lg btn-red"
        v-if="props.mode === 'edit'"
        type="button"
        :disabled="isLoading"
        @click="emit('delete', localForm.id)"
      >
        削除
      </button>
    </div>

  </form>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import {
  CalendarDays,
  Wallet,
  TrendingUp,
  TrendingDown,
  Store,
  NotebookPen,
  ClipboardCheck
} from 'lucide-vue-next'
import LoadingIcon from './LoadingIcon.vue'
import loadingStore from "@/stores/loadingStore"

const props = defineProps({
  listKouza: { type: Array, default: () => [] },
  listCodeShops: { type: Array, default: () => [] },
  mode: { type: String, default: "add" },
  form: { type: Object, default: null }
})

const emit = defineEmits(["submit", "delete"])

// 初期値
const today = new Date().toISOString().slice(0, 10)

console.log("propsData:", props.form)

const localForm = ref({
  rowNo: props.form?.rowNo || "",
  id: props.form?.id || "",
  mode: props.form?.mode || "add",
  type: "transfer",
  date: props.form?.date || today,
  kamoku1: props.form?.kamoku1 || 700,
  kamoku2: props.form?.kamoku2 || 700,
  kingaku1: props.form?.kingaku1,
  kingaku2: props.form?.kingaku2,
  aite: props.form?.aite || "",
  naiyo: props.form?.naiyo || "",
  kakunin: props.form?.kakunin || "false"
})

// 相手の店リスト
const shops = computed(() => {
  if (!props.listCodeShops?.length) return []

  if (!localForm.value.kamoku1) {
    return props.listCodeShops.flatMap(i => i.shops)
  }

  const item = props.listCodeShops.find(
    i => i.code === localForm.value.kamoku1
  )

  return item?.shops || []
})

// 金額の自動反転
let updating = false

watch(() => localForm.value.kingaku1, (val) => {
  if (updating) return

  updating = true
  localForm.value.kingaku2 = val ? -val : ""
  updating = false
})

watch(() => localForm.value.kingaku2, (val) => {
  if (updating) return

  updating = true
  localForm.value.kingaku1 = val ? -val : ""
  updating = false
})

const globalLoading = loadingStore.globalLoading

onMounted(() => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        loadingStore.globalLoading.value = false
      }, 500)
    })
  })
})

const isLoading = ref(false)

// 送信
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
