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
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  DataZoomComponent,
  ToolboxComponent,
} from 'echarts/components'
import type { ComposeOption } from 'echarts/core'
import type { LineSeriesOption } from 'echarts/charts'
import type { GridComponentOption, LegendComponentOption, TooltipComponentOption, DataZoomComponentOption } from 'echarts/components'
import VChart from 'vue-echarts'

type ECOption = ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | TooltipComponentOption
  | DataZoomComponentOption
>

use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  DataZoomComponent,
  ToolboxComponent,
])

defineOptions({
  components: {
    VChart,
  },
})

interface Props {
  option: ECOption
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
