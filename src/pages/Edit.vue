<template>
  <div v-if="form">
    <Input
      mode="edit"
      :form="form"
      :groupTab="activeTab"
      @submit="updateItem"
      @delete="deleteItem"
    />
  </div>
</template>


<script setup>
import { ref, onMounted, isShallow } from "vue"
import { useRoute } from "vue-router"
import Input from "@/pages/Input.vue"
import { GAS_URL } from "@/constants/index.js"
import loadingStore from "@/stores/loadingStore"

const route = useRoute()
const rowNo = route.query.rowNo

const form = ref(null)
const activeTab = ref("expense")

// ---------------------------
// ① GASから詳細データ取得
// ---------------------------
onMounted(async () => {
  const res = await fetch(`${GAS_URL}?list=detail&rowNo=${rowNo}`)
  const data = await res.json()

  form.value = data

  if (data.type?.includes("income")) {
    activeTab.value = "income"
  } else if (data.type?.includes("transfer")) {
    activeTab.value = "transfer"
  } else {
    activeTab.value = "expense"
  }
    requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // ここでローディングを消す（長めにしたいなら調整）
      setTimeout(() => {
        loadingStore.globalLoading.value = false
      }, 250) // ← ここを好きな時間にできる
    })
  })

})

// ---------------------------
// ② 修正
// ---------------------------
const updateItem = async (formData) => {
  loadingStore.globalLoading.value=true
  try {
    const iso = String(formData.date)
    const dateOnly = iso.split("T")[0]  // ← これが超重要
    const params = new URLSearchParams()
    params.append("mode", "rewrite")
    params.append("rowNo", rowNo)
    params.append("date",dateOnly)
    params.append("kamoku1",formData.kamoku1)
    params.append("kamoku2",formData.kamoku2)
    params.append("kingaku1",formData.kingaku1)
    params.append("kingaku2",formData.kingaku2)
    params.append("naiyo",formData.naiyo)
    params.append("aite",formData.aite)
    params.append("kakunin",formData.kakunin)

    console.log("送信データ:", params)
    const res = await fetch(GAS_URL, {
      method: "POST",
      body: params   // ← headers も JSON.stringify も不要
    })
    
    const result = await res.json()

    alert(result.message)
    window.location.href = "/list"

  } catch (e) {
    alert("修正に失敗しました"+e.message)
  }
  loadingStore.globalLoading.value=false
}

// ---------------------------
// ③ 削除
// ---------------------------
const deleteItem = async () => {
  if (!confirm("本当に削除しますか")) return
    console.log("削除時 rowNo:", rowNo)
  try {
    loadingStore.globalLoading.value=true
    const params = new URLSearchParams()
    params.append("mode", "delete")
    params.append("rowNo", rowNo)

    const res = await fetch(GAS_URL, {
      method: "POST",
      body: params   // ← headers も JSON.stringify も不要
    })

    const result = await res.json()

    alert(result.message)
    window.location.href = "/list"

  } catch (e) {
    alert("削除に失敗しました"+e.message)
  }

    loadingStore.globalLoading.value = false
}
</script>

