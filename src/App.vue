<script setup>
  import { ref } from 'vue'
  import { globalLoading } from '@/stores/loadingStore'
  import LoadingIcon from '@/components/LoadingIcon.vue'
</script>

<template>
  <div class="loading-area">
    <LoadingIcon :show="globalLoading" />
  </div>
  <div class="app">
    <router-view class="has-footer" />

    <nav class="footer-nav">
      <router-link to="/home" class="nav-item" :class="{ active: $route.path === '/home' }">
        <span class="icon">🏠</span>
        <span>ホーム</span>
      </router-link>

      <router-link to="/list" class="nav-item" :class="{ active: $route.path === '/list' }">
        <span class="icon">🔍</span>
        <span>検索</span>
      </router-link>

      <router-link to="/add" class="nav-item" :class="{ active: $route.path === '/add' }">
        <span class="icon">➕</span>
        <span>入力</span>
      </router-link>

      <router-link to="/setting" class="nav-item" :class="{ active: $route.path === '/setting' }">
        <span class="icon">📊</span>
        <span>設定</span>
      </router-link>
    </nav>
  </div>
</template>

