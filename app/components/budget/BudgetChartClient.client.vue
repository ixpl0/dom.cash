<template>
  <VChart
    :option="option"
    class="w-full h-full min-h-96"
    :autoresize="true"
    @legend-select-changed="handleLegendSelectChanged"
  />
</template>

<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  DataZoomComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import type { ChartOption } from '~/composables/shared/useChartConfig'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  DataZoomComponent,
])

defineOptions({
  components: {
    VChart,
  },
})

interface Props {
  option: ChartOption
}

interface Emits {
  legendSelectChanged: [selected: Record<string, boolean>]
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const handleLegendSelectChanged = (event: { selected: Record<string, boolean> }) => {
  emit('legendSelectChanged', event.selected)
}
</script>
