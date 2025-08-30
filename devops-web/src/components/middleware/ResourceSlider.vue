<template>
  <div class="resource-slider">
    <div class="slider-header">
      <span class="slider-label">{{ label }}</span>
      <span class="slider-value">{{ displayValue }}</span>
    </div>

    <n-slider
      v-model:value="sliderValue"
      :min="0"
      :max="maxValue"
      :step="1"
      :marks="marks"
      :tooltip="false"
      @update:value="handleSliderChange"
    />

    <div class="slider-labels">
      <span 
        v-for="(option, index) in options" 
        :key="index"
        class="label-item"
        :class="{ active: index === sliderValue }"
      >
        {{ option }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  modelValue: string
  options: string[]
  label: string
  unit?: string
}

const props = withDefaults(defineProps<Props>(), {
  unit: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const sliderValue = ref(0)

const maxValue = computed(() => props.options.length - 1)

const displayValue = computed(() => {
  const value = props.options[sliderValue.value] || props.options[0]
  return props.unit ? `${value} ${props.unit}` : value
})

const marks = computed(() => {
  const result: Record<number, string> = {}
  props.options.forEach((option, index) => {
    // 只在关键位置显示标记
    if (index === 0 || index === props.options.length - 1 || index % 2 === 0) {
      result[index] = ''
    }
  })
  return result
})

const handleSliderChange = (value: number) => {
  const selectedValue = props.options[value]
  emit('update:modelValue', selectedValue)
}

// 监听外部值变化，更新滑块位置
watch(() => props.modelValue, (newValue) => {
  const index = props.options.indexOf(newValue)
  if (index !== -1) {
    sliderValue.value = index
  }
}, { immediate: true })
</script>

<style scoped>
.resource-slider {
  width: 100%;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.slider-label {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.slider-value {
  font-size: 14px;
  color: #1890ff;
  font-weight: 600;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding: 0 4px;
}

.label-item {
  font-size: 11px;
  color: #999;
  transition: all 0.2s ease;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 2px;
}

.label-item.active {
  color: #1890ff;
  background: rgba(24, 144, 255, 0.1);
  font-weight: 500;
}

.label-item:hover {
  color: #1890ff;
}

@media (max-width: 768px) {
  .slider-labels {
    flex-wrap: wrap;
    gap: 4px;
    justify-content: flex-start;
  }
  
  .label-item {
    font-size: 10px;
  }
}
</style>
