<template>
  <Input
    mode="add"
    :reconciliationData="reconciliationData"
    @submit="addItem"
  />
</template>

<script setup>
import Input from "@/pages/Input.vue"
import { onMounted, ref } from "vue"
import { GAS_URL } from "@/constants/index.js"
import loadingStore from "@/stores/loadingStore"
import { useRouter } from "vue-router"

const router = useRouter()

// 照合明細から受け取るデータ
const reconciliationData = ref(null)

onMounted(() => {
  // Reconciliation.vue から sessionStorage 経由で受け取る
  const saved = sessionStorage.getItem("reconciliationData")

  if (saved) {
    try {
      reconciliationData.value = JSON.parse(saved)
    } catch (e) {
      console.error("照合データの読み込みに失敗:", e)
      sessionStorage.removeItem("reconciliationData")
    }
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        loadingStore.globalLoading.value = false
      }, 250)
    })
  })
})

const addItem = async (formData) => {
  loadingStore.globalLoading.value = true

  try {
    const dateOnly = String(formData.date).split("T")[0]

    let k1
    let k2

    if (formData.type === "income") {
      k1 = formData.kingaku1
      k2 = -formData.kingaku1
    } else if (formData.type === "expense") {
      k1 = -formData.kingaku1
      k2 = formData.kingaku1
    } else {
      k1 = formData.kingaku1
      k2 = formData.kingaku2
    }

    const payload = new URLSearchParams()
    payload.append("mode", "add")
    payload.append("type", formData.type)
    payload.append("date", dateOnly)
    payload.append("kamoku1", formData.kamoku1)
    payload.append("kamoku2", formData.kamoku2)
    payload.append("kingaku1", k1)
    payload.append("kingaku2", k2)
    payload.append("naiyo", formData.naiyo)
    payload.append("aite", formData.aite)
    payload.append("kakunin", formData.kakunin)

    // 照合明細からの入力なら、元の明細情報も送る
    if (formData.statementId) {
      payload.append("statementId", formData.statementId)
      payload.append(
        "accountCode",
        String(formData.accountCode || "")
      )
    }

    const res = await fetch(GAS_URL, {
      method: "POST",
      body: payload
    })

    const result = await res.json()

    if (!res.ok || result.status === "error" || result.success === false) {
      throw new Error(result.message || result.error || "登録に失敗しました")
    }

    alert(result.message || "登録しました")

    // 登録成功後に照合データを消す
    if (formData.statementId) {
      sessionStorage.removeItem("reconciliationData")
      router.push("/reconciliation")
    } else {
      router.push("/list")
    }

  } catch (e) {
    alert("追加に失敗しました: " + e.message)
  } finally {
    loadingStore.globalLoading.value = false
  }
}
</script>

