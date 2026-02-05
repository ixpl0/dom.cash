<template>
  <div class="space-y-3">
    <select
      v-model="selectedType"
      class="select select-bordered w-full"
      data-testid="recurrence-type-select"
    >
      <option value="none">
        {{ noneLabel }}
      </option>
      <option value="interval">
        {{ intervalLabel }}
      </option>
      <option value="weekdays">
        {{ weekdaysLabel }}
      </option>
      <option value="dayOfMonth">
        {{ dayOfMonthLabel }}
      </option>
    </select>

    <div
      v-if="selectedType === 'interval'"
      class="flex items-center gap-2"
    >
      <input
        v-model.number="intervalValue"
        type="number"
        min="1"
        max="365"
        class="input input-bordered w-24"
        data-testid="recurrence-interval-value"
      >
      <select
        v-model="intervalUnit"
        class="select select-bordered flex-1"
        data-testid="recurrence-interval-unit"
      >
        <option value="day">
          {{ unitDayLabel }}
        </option>
        <option value="week">
          {{ unitWeekLabel }}
        </option>
        <option value="month">
          {{ unitMonthLabel }}
        </option>
        <option value="year">
          {{ unitYearLabel }}
        </option>
      </select>
    </div>

    <div
      v-if="selectedType === 'weekdays'"
      class="flex flex-wrap gap-2"
    >
      <label
        v-for="{ day, jsIndex } in weekdaysWithIndex"
        :key="jsIndex"
        class="flex items-center gap-1 cursor-pointer"
        :data-testid="`recurrence-weekday-${jsIndex}`"
      >
        <input
          type="checkbox"
          class="checkbox checkbox-sm"
          :checked="selectedWeekdays.includes(jsIndex)"
          :data-testid="`recurrence-weekday-checkbox-${jsIndex}`"
          @change="toggleWeekday(jsIndex)"
        >
        <span class="text-sm">{{ day }}</span>
      </label>
    </div>

    <div
      v-if="selectedType === 'dayOfMonth'"
      class="flex items-center gap-2"
    >
      <span>{{ dayOfMonthPrefix }}</span>
      <input
        v-model.number="dayOfMonthValue"
        type="number"
        min="1"
        max="31"
        class="input input-bordered w-20"
        data-testid="recurrence-day-of-month"
      >
      <span>{{ dayOfMonthSuffix }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IntervalUnit, RecurrencePattern } from '~~/shared/types/recurrence'

interface Props {
  modelValue: RecurrencePattern | null
  noneLabel: string
  intervalLabel: string
  weekdaysLabel: string
  dayOfMonthLabel: string
  unitDayLabel: string
  unitWeekLabel: string
  unitMonthLabel: string
  unitYearLabel: string
  weekdayNames: string[]
  dayOfMonthPrefix: string
  dayOfMonthSuffix: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: RecurrencePattern | null]
}>()

const selectedType = ref<'none' | 'interval' | 'weekdays' | 'dayOfMonth'>('none')
const intervalValue = ref(1)
const intervalUnit = ref<IntervalUnit>('day')
const selectedWeekdays = ref<number[]>([])
const dayOfMonthValue = ref(1)

const weekdaysWithIndex = computed(() => {
  const mondayFirstOrder = [1, 2, 3, 4, 5, 6, 0]
  return mondayFirstOrder.map((jsIndex, i) => ({
    day: props.weekdayNames[i] ?? '',
    jsIndex,
  }))
})

const arraysEqual = (a: number[], b: number[]) => {
  if (a.length !== b.length) {
    return false
  }
  return a.every((val, i) => val === b[i])
}

const initializeFromValue = (value: RecurrencePattern | null) => {
  if (!value) {
    if (selectedType.value !== 'none') {
      selectedType.value = 'none'
    }
    return
  }

  switch (value.type) {
    case 'interval': {
      if (selectedType.value !== 'interval') {
        selectedType.value = 'interval'
      }
      if (intervalValue.value !== value.value) {
        intervalValue.value = value.value
      }
      if (intervalUnit.value !== value.unit) {
        intervalUnit.value = value.unit
      }
      break
    }
    case 'weekdays': {
      if (selectedType.value !== 'weekdays') {
        selectedType.value = 'weekdays'
      }
      const sortedDays = [...value.days].sort((a, b) => a - b)
      if (!arraysEqual(selectedWeekdays.value, sortedDays)) {
        selectedWeekdays.value = sortedDays
      }
      break
    }
    case 'dayOfMonth': {
      if (selectedType.value !== 'dayOfMonth') {
        selectedType.value = 'dayOfMonth'
      }
      if (dayOfMonthValue.value !== value.day) {
        dayOfMonthValue.value = value.day
      }
      break
    }
  }
}

initializeFromValue(props.modelValue)

const toggleWeekday = (dayIndex: number) => {
  if (selectedWeekdays.value.includes(dayIndex)) {
    selectedWeekdays.value = selectedWeekdays.value.filter(d => d !== dayIndex)
  }
  else {
    selectedWeekdays.value = [...selectedWeekdays.value, dayIndex]
  }
}

const emitValue = () => {
  if (selectedType.value === 'none') {
    emit('update:modelValue', null)
    return
  }

  if (selectedType.value === 'interval') {
    emit('update:modelValue', {
      type: 'interval',
      unit: intervalUnit.value,
      value: intervalValue.value,
    })
    return
  }

  if (selectedType.value === 'weekdays') {
    emit('update:modelValue', {
      type: 'weekdays',
      days: [...selectedWeekdays.value].sort((a, b) => a - b),
    })
    return
  }

  if (selectedType.value === 'dayOfMonth') {
    emit('update:modelValue', {
      type: 'dayOfMonth',
      day: dayOfMonthValue.value,
    })
  }
}

watch(selectedType, emitValue)
watch(intervalValue, emitValue)
watch(intervalUnit, emitValue)
watch(selectedWeekdays, emitValue, { deep: true })
watch(dayOfMonthValue, emitValue)

watch(() => props.modelValue, (newValue) => {
  initializeFromValue(newValue)
}, { deep: true })
</script>
