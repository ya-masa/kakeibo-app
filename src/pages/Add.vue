<template>
  <Input
    mode="add"
    @submit="addItem"
  />
</template>


<script setup>
import Input from "@/pages/Input.vue"
import { onMounted } from "vue"
import { GAS_URL } from "@/constants/index.js"
import loadingStore from "@/stores/loadingStore"

onMounted(async () => {
    requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // ここでローディングを消す（長めにしたいなら調整）
      setTimeout(() => {
        loadingStore.globalLoading.value = false
      }, 250) // ← ここを好きな時間にできる
    })
  })

})
const addItem = async (formData) => {
  loadingStore.globalLoading.value=true
  try{
    const iso = String(formData.date)
    const dateOnly = iso.split("T")[0]  // ← これが超重要
    const payload = new URLSearchParams()
    payload.append("mode", "add")
    payload.append("date",dateOnly)
    payload.append("kamoku1",formData.kamoku1)
    payload.append("kamoku2",formData.kamoku2)
    payload.append("kingaku1",formData.kingaku1)
    payload.append("kingaku2",-formData.kingaku1)
    payload.append("naiyo",formData.naiyo)
    payload.append("aite",formData.aite)
    payload.append("kakunin",formData.kakunin)

    console.log("送信データ:", payload)
    const res = await fetch(GAS_URL, {
      method: "POST",
      body: payload   // ← headers も JSON.stringify も不要
    })
    
    const result = await res.json()
    alert(result.message)
    window.location.href = "/list"

  } catch (e) {
    alert("追加を失敗しました"+e.message)
  }

    loadingStore.globalLoading.value=false
}

</script>

