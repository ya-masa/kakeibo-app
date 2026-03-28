<template>
  <div v-if="show" class="loader-wrapper">
    <div class="loader"></div>
  </div>
</template>

<script setup>
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.loader-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;

  display: flex;
  justify-content: center;
  align-items: center;

  background: rgba(255, 255, 255, 0.6); /* 優しい半透明 */
  z-index: 9999; /* 最前面に */

  display: inline-flex;
}

.loader {
  width: 48px;
  height: 48px;
  border: 4px solid #c8a27e; /* 薄いブラウン */
  border-top-color: #6b4f3f; /* 濃いブラウン */
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
