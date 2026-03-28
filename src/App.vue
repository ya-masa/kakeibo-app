<script setup>
  import { ref } from 'vue'
  import { globalLoading } from '@/stores/loadingStore'
  import LoadingIcon from '@/components/LoadingIcon.vue'
</script>

<template>
    <div class="loading-area">
      <LoadingIcon :show="globalLoading" />
    </div>
  <router-view />
</template>

