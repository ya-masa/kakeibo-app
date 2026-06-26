<script setup>
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { computed } from 'vue'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps({
  labels: Array,
  values: Array
})

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
