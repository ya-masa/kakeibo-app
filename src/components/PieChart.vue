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
            '#FF9F40'
          ]
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      layout: {
        padding: { right: 30 }
      },
      plugins: {
        legend: {
          position: 'right',
          labels: {
            maxWidth: 200,
            boxWidth: 14,
            padding: 20,
            font: {
              size: 12
            }
          }
        }
      }
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


