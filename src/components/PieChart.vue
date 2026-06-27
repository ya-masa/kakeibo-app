<script setup>
import { ref, onMounted, watch } from 'vue'
import { Chart, PieController, ArcElement, Tooltip, Legend } from 'chart.js'

Chart.register(PieController, ArcElement, Tooltip, Legend)

// props
const props = defineProps({
  labels: Array,
  values: Array
})

// 親へ色を渡す
const emit = defineEmits(['update:colors'])

// canvas
const canvasRef = ref(null)
let chartInstance = null

// 色を項目数に合わせて生成
function generateColors(count) {
  const baseColors = [
    '#FF6384',
    '#36A2EB',
    '#FFCE56',
    '#4BC0C0',
    '#9966FF',
    '#FF9F40',
    '#8BC34A',
    '#FF5722',
    '#9C27B0',
    '#03A9F4'
  ]
  return baseColors.slice(0, count)
}

function drawChart() {
  if (!canvasRef.value) return

  // 既存チャート破棄
  if (chartInstance) chartInstance.destroy()

  const isMobile = window.innerWidth < 600

  // labels の数に合わせて色を生成
  const colors = generateColors(props.labels.length)

  // Chart.js 描画
  chartInstance = new Chart(canvasRef.value.getContext('2d'), {
    type: 'pie',
    data: {
      labels: props.labels,
      datasets: [
        {
          data: props.values,
          backgroundColor: colors
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: isMobile ? 'bottom' : 'right',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 10,
            padding: 10
          }
        }
      }
    }
  })

  // 親へ色を渡す（順番も完全一致）
  emit('update:colors', colors)
}

onMounted(drawChart)
watch(() => [props.labels, props.values], drawChart)
</script>

<template>
  <canvas ref="canvasRef"></canvas>
</template>



