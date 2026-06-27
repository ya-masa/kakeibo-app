<script setup>
import { ref, onMounted, watch } from 'vue'
import { Chart, PieController, ArcElement, Tooltip, Legend } from 'chart.js'

Chart.register(PieController, ArcElement, Tooltip, Legend)

const props = defineProps({
  labels: Array,
  values: Array
})

const canvasRef = ref(null)
let chartInstance = null

function drawChart() {
  if (!canvasRef.value) {
    console.log("canvas がまだ無いので待機")
    return
  }

  if (chartInstance) {
    chartInstance.destroy()
  }

  chartInstance = new Chart(canvasRef.value.getContext('2d'), {
    type: 'pie',
    data: {
      labels: props.labels,
      datasets: [
        {
          data: props.values,
          backgroundColor: [
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
        }
      ]
    }
  })
}

onMounted(() => {
  drawChart()
})

watch(() => [props.labels, props.values], () => {
  drawChart()
})
</script>

<template>
  <canvas ref="canvasRef"></canvas>
</template>