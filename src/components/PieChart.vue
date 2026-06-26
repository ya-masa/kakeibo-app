<template>
  <Pie
    :data="chartData"
    :options="chartOptions"
    style="height: 100%; width: 100%;"
  />
</template>

<script setup>
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { computed } from 'vue'

ChartJS.register(ArcElement, Tooltip, Legend)
console.log("labels:", props.labels)
console.log("values:", props.values)

const props = defineProps({
    
  labels: Array,
  values: Array
})
// PieChart.vue の defineProps の直後
console.log("PieChart props.labels:", props.labels)
console.log("PieChart props.values:", props.values)

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      data: props.values,
      backgroundColor: [
        '#ff6384',
        '#36a2eb',
        '#ffcd56',
        '#4bc0c0',
        '#9966ff',
        '#ff9f40'
      ]
    }
  ]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false
}
</script>

