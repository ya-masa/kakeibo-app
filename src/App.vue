<script setup>
  import { ref } from 'vue'
  import { globalLoading } from '@/stores/loadingStore'
  import LoadingIcon from '@/components/LoadingIcon.vue'
  import { House, Search, Plus, WalletCards, Settings } from "lucide-vue-next";

</script>

<template>
  <div class="loading-area">
    <LoadingIcon :show="globalLoading" />
  </div>
  <div class="app">
    <router-view class="has-footer" />

    <nav class="footer-nav">
      <router-link to="/home" class="nav-item" :class="{ active: $route.path === '/home' }">
        <span class="icon"><House /></span>
        <span>ホーム</span>
      </router-link>    

      <router-link to="/list" class="nav-item" :class="{ active: $route.path === '/list' }">
        <span class="icon"><Search /></span>
        <span>検索</span>
      </router-link>

      <router-link to="/add" class="nav-item" :class="{ active: $route.path === '/add' }">
        <span class="icon"><Plus /></span>
        <span>入力</span>
      </router-link>

      <router-link to="/reconciliation" class="nav-item" :class="{ active: $route.path === '/reconciliation' }">
        <span class="icon"><WalletCards /></span>
        <span>照合</span>
      </router-link>

      <router-link to="/setting" class="nav-item" :class="{ active: $route.path === '/setting' }">
        <span class="icon"><Settings /></span>
        <span>設定</span>
      </router-link>
    </nav>
  </div>
</template>

