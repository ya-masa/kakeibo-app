<template>
  <div class="container">
    <h1>{{ props.mode === 'edit' ? '家計簿修正' : '家計簿入力' }}</h1>

    <!-- タブ -->
    <div class="tabs">
      <button 
        v-for="t in tabs" 
        :key="t.value"
        class="tab-btn"
        :class="{ active: currentTab === t.value }"
        @click="changeTab(t.value)"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 支出 -->
    <div class="tab-card" v-if="currentTab === 'expense'">
      <ExpenseForm 
        :listShishutsu="listShishutsu"
        :listHouhou="listKouza"
        :listCodeShops="listCodeShops"
        :mode="props.mode"
        :form="localForm"
        @submit="emitSubmit"
        @delete="emitDelete"
      />
    </div>

    <!-- 収入 -->
    <div class="tab-card" v-if="currentTab === 'income'">
      <IncomeForm 
        :listSyunyu="listSyunyu"
        :listHouhou="listKouza"
        :listCodeShops="listCodeShops"
        :mode="props.mode"
        :form="localForm"
        @submit="emitSubmit"
        @delete="emitDelete"
      />
    </div>

    <!-- 振替 -->
    <div class="tab-card" v-if="currentTab === 'transfer'">
      <TransferForm 
        :listKouza="listAllKouza"
        :listCodeShops="listCodeShops"
        :mode="props.mode"
        :type="localForm.type || props.type"
        :form="localForm"
        @submit="emitSubmit"
        @delete="emitDelete"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { GAS_URL } from '@/constants/index.js'
import loadingStore from "@/stores/loadingStore"
import ExpenseForm from '@/components/ExpenseForm.vue'
import IncomeForm from '@/components/IncomeForm.vue'
import TransferForm from '@/components/TransferForm.vue'
import AppLinks from '@/components/AppLinks.vue'

/* props */
const props = defineProps({
  mode: { type: String, default: "add" },
  form: { type: Object, default: null },
  groupTab: { type: String, default: "expense" },
  type: { type: String, default: "" },

  // 照合明細からの新規登録用
  reconciliationData: {
    type: Object,
    default: null
  }
})

/* emit */
const emit = defineEmits(["submit", "delete"])

/* タブ定義 */
const tabs = [
  { label: '支出入力', value: 'expense' },
  { label: '収入入力', value: 'income' },
  { label: '振替入力', value: 'transfer' }
]

/* localForm（初期値） */
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const localForm = ref({
  rowNo: "",
  type: "",
  date: today(),
  kamoku1: "",
  kamoku2: "",
  kingaku1: "",
  kingaku2: "",
  naiyo: "",
  aite: "",
  kakunin: false
})

/* データ */
const listShishutsu = ref([])
const listSyunyu = ref([])
const listKouza = ref([])
const listAllKouza =ref([])
const listCodeShops = ref([])

/* GASから一覧データ取得 */
onMounted(async () => {
  const res = await fetch(`${GAS_URL}?list=ALLLIST`)
  const all = await res.json()

  // 非表示（TRUE）を除外し、表示順の数字で並べる
  const visible = all
    .filter(i => String(i.hihyouji).toUpperCase() !== "TRUE")
    .sort((a, b) => {
      const orderA = Number(a.hihyouji)
      const orderB = Number(b.hihyouji)

      // 数字でない値は最後に並べる
      const aHasOrder = Number.isFinite(orderA)
      const bHasOrder = Number.isFinite(orderB)

      if (aHasOrder && bHasOrder) return orderA - orderB
      if (aHasOrder) return -1
      if (bHasOrder) return 1
      return 0
    })

  listShishutsu.value = visible.filter(i => i.group?.startsWith("5_支出"))
  listSyunyu.value = visible.filter(i => i.group?.startsWith("4_収入"))
  listKouza.value = visible.filter(i =>
    i.group?.startsWith("1_資産") || i.group?.startsWith("2_負債")
  )
  listAllKouza.value = visible
  listCodeShops.value = visible.filter(i => Array.isArray(i.shops))

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        loadingStore.globalLoading.value = false
      }, 500)
    })
  })
})

/* タブ（編集時は固定） */
const currentTab = ref("expense")

watch(
  () => props.groupTab,
  (v) => {
    if (props.mode === "edit" && v) {
      currentTab.value = v
    }
  },
  { immediate: true }
)

/* ★ props.form が入ったら localForm を上書き（修正モード） */
watch(
  () => props.form,
  (f) => {
    if (!f || Object.keys(f).length === 0) return
    const dateObj = new Date(f.date)
    const dateOnly = dateObj.toLocaleDateString("sv-SE", {timeZone: "Asia/Tokyo"})
    localForm.value = {
      rowNo: f.rowNo || "",
      id:f.id || "",
      type: f.type || "",
      date: dateOnly || today(),
      kamoku1: f.kamoku1 || "",
      kamoku2: f.kamoku2 || "",
      kingaku1: f.kingaku1 || 0,
      kingaku2: f.kingaku2 || 0,
      naiyo: f.naiyo || "",
      aite: f.aite || f.shop || "",
      kakunin: f.kakunin === true
    }
  },
  { immediate: true }
)

/* CSVからのデータを追加するときの処理 */

/* 照合明細からの新規登録 */
watch(
  () => props.reconciliationData,
  (data) => {
    if (!data) return

    const amount = Number(data.amount) || 0

    // 金額によって初期表示するタブを決める
    let tab = "transfer"

    if (amount < 0) {
      tab = "expense"
    } else if (amount > 0) {
      tab = "income"
    }

    currentTab.value = tab

    localForm.value = {
      rowNo: "",
      id: "",
      type: tab,
      date: data.date || today(),
      kamoku1: "",
      kamoku2: "",
      kingaku1: Math.abs(amount),
      kingaku2: "",
      naiyo: data.content || "",
      aite: data.place || "",
      kakunin: false,

      // 照合明細との関連付け
      statementId: data.statementId || "",
      accountCode: String(data.accountCode || "")
    }
  },
  { immediate: true }
)

/* タブ切り替え（編集時は不可） */
const changeTab = (tab) => {
  if (props.mode === "edit") return
  currentTab.value = tab
}

/* 子フォームからのイベントを親へ転送 */
const emitSubmit = (formData) => {
  console.log("送信データ:", formData)
  emit("submit", formData)
}

const emitDelete = (rowNo) => {
  console.log("削除:", rowNo)
  emit("delete", rowNo)
}

</script>



<style scoped>
.container {
  width: 100%;
  max-width: 620px;
  min-width: 0;
  margin: 0 auto;
  padding: 0 12px 20px;
  box-sizing: border-box;
  color: var(--color-coffee, #6b4f3f);
}

.container h1 {
  font-size: 24px;
  margin: 0 0 20px;
  text-align: center;
  font-weight: 600;
  color: var(--color-brown-dark, var(--color-coffee, #6b4f3f));
}

.tabs {
  display: flex;
  width: 100%;
  max-width: 600px;
  min-width: 0;
  margin: 0 auto;
  gap: 4px;
  box-sizing: border-box;
}

.tab-btn {
  flex: 1 1 0;
  min-width: 0;
  padding: 10px 4px;
  border: 1px solid var(--color-border, #eee7df);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  background: var(--color-surface-muted, #f5e8d8);
  color: var(--color-coffee, #6b4f3f);
  font: inherit;
  font-size: 14px;
  line-height: 1.35;
  overflow-wrap: anywhere;
  cursor: pointer;
}

.tab-btn.active {
  background: var(--color-greige-light, #f7f4ef);
  border-color: var(--color-border, #eee7df);
  font-weight: 600;
}

.tab-card {
  width: 100%;
  max-width: 600px;
  min-width: 0;
  box-sizing: border-box;
  margin: 0 auto;
  padding: 0 10px 16px;
  color: var(--color-coffee, #6b4f3f);
  background: var(--color-greige-light, #f7f4ef);
  border: 1px solid var(--color-border, #eee7df);
  border-top: none;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}

.tab-card :deep(*) {
  max-width: 100%;
  box-sizing: border-box;
}

@media (max-width: 400px) {
  .container {
    padding-right: 8px;
    padding-left: 8px;
  }

  .container h1 {
    font-size: 22px;
    margin-bottom: 16px;
  }

  .tabs {
    gap: 2px;
  }

  .tab-btn {
    padding: 9px 2px;
    font-size: 12px;
  }

  .tab-card {
    padding-right: 8px;
    padding-left: 8px;
  }
}
</style>


