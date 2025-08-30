<template>
  <div class="dynamic-form-fields">
    <div v-for="group in formDefinition.groups" :key="group.name" class="field-group">
      <div v-for="field in group.fields" :key="field.name" class="field-item">
        <!-- 输入框 -->
        <n-form-item 
          v-if="field.type === 'input'"
          :label="field.label"
          :path="field.name"
        >
          <n-input
            v-model:value="localValue[field.name]"
            :placeholder="field.placeholder"
            :status="getFieldStatus(field.name)"
            @blur="validateField(field)"
          />
          <template #feedback>
            <div class="field-help">
              <span v-if="field.help" class="help-text">{{ field.help }}</span>
              <span v-if="getFieldMessage(field.name)" class="error-text">
                {{ getFieldMessage(field.name) }}
              </span>
            </div>
          </template>
        </n-form-item>

        <!-- 文本域 -->
        <n-form-item 
          v-else-if="field.type === 'textarea'"
          :label="field.label"
          :path="field.name"
        >
          <n-input
            v-model:value="localValue[field.name]"
            type="textarea"
            :placeholder="field.placeholder"
            :rows="3"
            :status="getFieldStatus(field.name)"
            @blur="validateField(field)"
          />
          <template #feedback>
            <div class="field-help">
              <span v-if="field.help" class="help-text">{{ field.help }}</span>
              <span v-if="getFieldMessage(field.name)" class="error-text">
                {{ getFieldMessage(field.name) }}
              </span>
            </div>
          </template>
        </n-form-item>

        <!-- 选择器 -->
        <n-form-item 
          v-else-if="field.type === 'select'"
          :label="field.label"
          :path="field.name"
        >
          <n-select
            v-model:value="localValue[field.name]"
            :options="field.options"
            :placeholder="field.placeholder || '请选择'"
            clearable
            @update:value="validateField(field)"
          />
          <template #feedback>
            <div class="field-help">
              <span v-if="field.help" class="help-text">{{ field.help }}</span>
              <span v-if="getFieldMessage(field.name)" class="error-text">
                {{ getFieldMessage(field.name) }}
              </span>
            </div>
          </template>
        </n-form-item>

        <!-- 开关 -->
        <n-form-item 
          v-else-if="field.type === 'switch'"
          :label="field.label"
          :path="field.name"
        >
          <div class="switch-field">
            <n-switch
              v-model:value="localValue[field.name]"
              @update:value="validateField(field)"
            />
            <span v-if="field.help" class="switch-help">{{ field.help }}</span>
          </div>
        </n-form-item>

        <!-- 资源滑块 -->
        <n-form-item 
          v-else-if="field.type === 'resource-slider'"
          :label="field.label"
          :path="field.name"
        >
          <ResourceSlider
            v-model:value="localValue[field.name]"
            :options="getResourceOptions(field)"
            :label="field.label"
            @update:modelValue="validateField(field)"
          />
          <template #feedback>
            <div class="field-help">
              <span v-if="field.help" class="help-text">{{ field.help }}</span>
              <span v-if="getFieldMessage(field.name)" class="error-text">
                {{ getFieldMessage(field.name) }}
              </span>
            </div>
          </template>
        </n-form-item>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { TemplateFormDefinition, FormField } from '@/types/middleware'
import ResourceSlider from './ResourceSlider.vue'

interface Props {
  modelValue: Record<string, any>
  formDefinition: TemplateFormDefinition
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
  'validate': [valid: boolean]
}>()

const localValue = ref<Record<string, any>>({})
const fieldErrors = ref<Record<string, string>>({})
const fieldWarnings = ref<Record<string, string>>({})

// 初始化表单数据
const initializeFormData = () => {
  const initialData = { ...props.modelValue }
  
  // 为每个字段设置默认值
  props.formDefinition.groups.forEach(group => {
    group.fields.forEach(field => {
      if (!(field.name in initialData) && field.default !== undefined) {
        initialData[field.name] = field.default
      }
    })
  })
  
  localValue.value = initialData
}

// 获取资源选项
const getResourceOptions = (field: FormField): string[] => {
  if (field.name.includes('memory')) {
    return ['512Mi', '1Gi', '2Gi', '4Gi', '8Gi', '16Gi']
  }
  if (field.name.includes('cpu')) {
    return ['100m', '200m', '500m', '1000m', '2000m', '4000m']
  }
  if (field.name.includes('storage')) {
    return ['1Gi', '5Gi', '10Gi', '20Gi', '50Gi', '100Gi']
  }
  return ['1', '2', '3', '4', '5']
}

// 字段验证
const validateField = (field: FormField) => {
  const value = localValue.value[field.name]
  let error = ''
  let warning = ''

  // 必填验证
  if (field.required && (!value || value === '')) {
    error = `${field.label}是必填项`
  }

  // 格式验证
  if (value && field.validation) {
    try {
      const regex = new RegExp(field.validation)
      if (!regex.test(value.toString())) {
        error = `${field.label}格式不正确`
      }
    } catch (e) {
      console.warn('验证正则表达式错误:', field.validation)
    }
  }

  // 特定字段的业务验证
  if (value && !error) {
    if (field.name.includes('memory')) {
      const memoryMB = parseMemory(value)
      if (memoryMB < 512) {
        warning = '内存过小可能影响性能'
      }
    }
    
    if (field.name.includes('password') && value.length < 8) {
      warning = '建议密码长度至少8位'
    }
  }

  // 更新错误和警告状态
  if (error) {
    fieldErrors.value[field.name] = error
    delete fieldWarnings.value[field.name]
  } else {
    delete fieldErrors.value[field.name]
    if (warning) {
      fieldWarnings.value[field.name] = warning
    } else {
      delete fieldWarnings.value[field.name]
    }
  }

  // 触发整体验证
  validateForm()
}

// 解析内存值
const parseMemory = (memoryStr: string): number => {
  if (typeof memoryStr !== 'string') return 0
  if (memoryStr.endsWith('Gi')) {
    return parseInt(memoryStr) * 1024
  }
  if (memoryStr.endsWith('Mi')) {
    return parseInt(memoryStr)
  }
  return 0
}

// 获取字段状态
const getFieldStatus = (fieldName: string) => {
  if (fieldErrors.value[fieldName]) return 'error'
  if (fieldWarnings.value[fieldName]) return 'warning'
  return undefined
}

// 获取字段消息
const getFieldMessage = (fieldName: string) => {
  return fieldErrors.value[fieldName] || fieldWarnings.value[fieldName] || ''
}

// 验证整个表单
const validateForm = () => {
  const hasErrors = Object.keys(fieldErrors.value).length > 0
  emit('validate', !hasErrors)
}

// 监听本地值变化，同步到父组件
watch(localValue, (newValue) => {
  emit('update:modelValue', { ...newValue })
}, { deep: true })

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
  localValue.value = { ...newValue }
}, { deep: true })

// 监听表单定义变化，重新初始化
watch(() => props.formDefinition, () => {
  initializeFormData()
}, { deep: true })

onMounted(() => {
  initializeFormData()
  
  // 初始验证
  props.formDefinition.groups.forEach(group => {
    group.fields.forEach(field => {
      validateField(field)
    })
  })
})
</script>

<style scoped>
.dynamic-form-fields {
  width: 100%;
}

.field-group {
  margin-bottom: 16px;
}

.field-item {
  margin-bottom: 16px;
}

.field-help {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.help-text {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

.error-text {
  font-size: 12px;
  color: #ff4d4f;
  line-height: 1.4;
}

.switch-field {
  display: flex;
  align-items: center;
  gap: 12px;
}

.switch-help {
  font-size: 14px;
  color: #666;
}

@media (max-width: 768px) {
  .field-item {
    margin-bottom: 20px;
  }
  
  .switch-field {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
