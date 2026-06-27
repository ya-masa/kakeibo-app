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
  if (!canvasRef.value) return

  if (chartInstance) chartInstance.destroy()

  const isMobile = window.innerWidth < 600

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
        padding: { right: 10 }
      },
      plugins: {
        legend: {
          position: isMobile ? 'bottom' : 'right',
          labels: {
            maxWidth: isMobile ? 300 : 250,
            boxWidth: 14,
            padding: 10,
            font: {
              size: isMobile ? 11 : 12
            }
          }
        }
      }
    }
  })
}

onMounted(drawChart)
watch(() => [props.labels, props.values], drawChart)
</script>


<template>
  <canvas ref="canvasRef"></canvas>
</template>


