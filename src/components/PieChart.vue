<script setup>
import { ref, onMounted, watch } from 'vue'
import { Chart, PieController, ArcElement, Tooltip, Legend } from 'chart.js'

Chart.register(PieController, ArcElement, Tooltip, Legend)

const props = defineProps({
  labels: Array,
  values: Array
})

const emit = defineEmits(['update:colors'])

const canvasRef = ref(null)
let chartInstance = null

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
  // props がまだ来てない時は描画しない
  if (!props.labels || !props.values) return
  if (!Array.isArray(props.labels) || !Array.isArray(props.values)) return
  if (props.labels.length === 0 || props.values.length === 0) return

  if (!canvasRef.value) return

  if (chartInstance) chartInstance.destroy()

  const isMobile = window.innerWidth < 600

  const colors = generateColors(props.labels.length)

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

  emit('update:colors', colors)
}

onMounted(drawChart)
watch(() => [props.labels, props.values], drawChart)
</script>

<template>
  <canvas ref="canvasRef"></canvas>
</template>



