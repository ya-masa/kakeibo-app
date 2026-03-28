<template>
  <div>
    <AppLinks />
    <!-- この下にフィルタや一覧 -->
  </div>
  <div class="container">
    <h1>{{ props.mode === 'edit' ? '家計簿修正' : '家計簿入力' }}</h1>

    <!-- タブ -->
    <div class="tabs">
      <button 
        v-for="t in tabs" 
        :key="t.value"
        :class="{ active: currentTab === t.value }"
        @click="changeTab(t.value)"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 支出 -->
    <div v-if="currentTab === 'expense'">
      <ExpenseIncomeForm 
        :listKamoku="listShishutsu"
        :listHouhou="listKouza"
        :listCodeShops="listCodeShops"
        :mode="props.mode"
        :type="localForm.type || props.type"
        :form="localForm"
        @submit="emitSubmit"
        @delete="emitDelete"
      />
    </div>

    <!-- 収入 -->
    <div v-if="currentTab === 'income'">
      <ExpenseIncomeForm 
        :listKamoku="listShunyu"
        :listHouhou="listKouza"
        :listCodeShops="listCodeShops"
        :mode="props.mode"
        :type="localForm.type || props.type"
        :form="localForm"
        @submit="emitSubmit"
        @delete="emitDelete"
      />
    </div>

    <!-- 資金移動 -->
    <div v-if="currentTab === 'transfer'">
      <TransferForm 
        :listKouza="listKouza"
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
import ExpenseIncomeForm from '@/components/ExpenseIncomeForm.vue'
import TransferForm from '@/components/TransferForm.vue'
import AppLinks from '@/components/AppLinks.vue'

/* props */
const props = defineProps({
  mode: { type: String, default: "add" },
  form: { type: Object, default: null },
  groupTab: { type: String, default: "expense" },
  type: { type: String, default: "" }
})

/* emit */
const emit = defineEmits(["submit", "delete"])

/* タブ定義 */
const tabs = [
  { label: '支出入力', value: 'expense' },
  { label: '収入入力', value: 'income' },
  { label: '資金移動', value: 'transfer' }
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
const listShunyu = ref([])
const listKouza = ref([])
const listAllKouza =ref([])
const listCodeShops = ref([])

/* GASから一覧データ取得 */
onMounted(async () => {
  const res = await fetch(`${GAS_URL}?list=ALLLIST`)
  const all = await res.json()

  listShishutsu.value = all.filter(i => i.group?.startsWith("5_支出"))
  listShunyu.value = all.filter(i => i.group?.startsWith("4_収入"))
  listKouza.value = all.filter(i => 
    i.group?.startsWith("1_資産") || i.group?.startsWith("2_負債")
  )
  listAllKouza.value =all.value
  listCodeShops.value = all.filter(i => Array.isArray(i.shops))
    requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // ここでローディングを消す（長めにしたいなら調整）
      setTimeout(() => {
        loadingStore.globalLoading.value = false
      }, 500) // ← ここを好きな時間にできる
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

    const iso = String(f.date)
    const dateOnly = iso.split("T")[0]

    localForm.value = {
      rowNo: f.rowNo || "",
      type: f.type || "",
      date: dateOnly || today(),
      kamoku1: f.kamoku1 || "",
      kamoku2: f.kamoku2 || "",
      kingaku1: f.kingaku1 || "",
      kingaku2: f.kingaku2 || "",
      naiyo: f.naiyo || "",
      aite: f.aite || f.shop || "",
      kakunin: f.kakunin === true
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



<style>
/* あなたの CSS そのまま */
body {
  margin: 0;
  padding: 0;
  background: #f7f3ee;
  font-family: "Helvetica Neue", Arial, sans-serif;
  color: #333;
}

.container {
  max-width: 100%;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  font-size: 24px;
  margin-bottom: 20px;
  text-align: center;
  font-weight: 600;
}

.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
}

.tabs button {
  flex: 1;
  padding: 10px 0;
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
}
.tabs button.active {
  background: #c8a27e;
  color: #fff;
  border-color: #bc8e74;
}
.tabs button:hover {
  background: #6b4f3f;
}
</style>



