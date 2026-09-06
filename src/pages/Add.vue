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
import { useRouter } from 'vue-router'

const router = useRouter()

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
    var k1
    var k2
    if(400<=formData.kamoku2<500){       //収入
      k1=formData.kingaku1
      k2=-formData.kingaku1
    }else if(500<=formData.kamoku2<600){  //支出
      k1=-formData.kingaku1
      k2=formData.kingaku1
    }else{                         //振替
      k1=formData.kingaku1
      k2=formData.kingaku2
    }
    console.log("formData:",formData)
    const payload = new URLSearchParams()
    payload.append("mode", "add")
    payload.append("type", formData.type)
    payload.append("date",dateOnly)
    payload.append("kamoku1",formData.kamoku1)
    payload.append("kamoku2",formData.kamoku2)
    payload.append("kingaku1",k1)
    payload.append("kingaku2",k2)
    payload.append("naiyo",formData.naiyo)
    payload.append("aite",formData.aite)
    payload.append("kakunin",formData.kakunin)
    
    console.log("送信データpayload:", payload)
    const res = await fetch(GAS_URL, {
      method: "POST",
      body: payload   // ← headers も JSON.stringify も不要
    })
    const result = await res.json()
    alert(result.message)
    router.push('/list')

  } catch (e) {
    alert("追加を失敗しました"+e.message)
  }

    loadingStore.globalLoading.value=false
}

</script>

