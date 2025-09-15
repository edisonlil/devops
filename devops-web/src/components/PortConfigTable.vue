<template>
  <div class="port-config-container">
    <!-- 端口配置项 -->
    <div
      v-for="(item, index) in portConfigs"
      :key="item.id"
      class="port-config-item"
    >
      <n-form-item :label="item.name">
        <div class="port-input-group">
          <!-- 类型选择 -->
          <n-select
            v-model="item.type"
            :options="typeOptions"
            size="small"
            style="width: 80px; margin-right: 8px;"
            @update:value="updateConfig"
          />
          
          <!-- 端口值输入 -->
          <div v-if="item.type === 'array'" class="array-inputs">
            <div
              v-for="(_, valueIndex) in item.value"
              :key="valueIndex"
              class="array-input-item"
            >
              <n-input
                v-model="item.value[valueIndex]"
                placeholder="端口值"
                @blur="updateConfig"
              />
              <n-button
                v-if="item.value.length > 1"
                size="small"
                text
                @click="removeArrayItem(index, valueIndex)"
                class="remove-btn"
              >
                <template #icon>
                  <n-icon><Remove /></n-icon>
                </template>
              </n-button>
            </div>
            <n-button
              size="small"
              text
              @click="addArrayItem(index)"
              class="add-btn"
            >
              <template #icon>
                <n-icon><Add /></n-icon>
              </template>
              添加
            </n-button>
          </div>
          
          <div v-else class="single-input">
            <n-input
              v-model="item.value"
              placeholder="端口值"
              @blur="updateConfig"
            />
          </div>
          
          <!-- 删除按钮 -->
          <n-button
            size="small"
            text
            @click="removePortConfig(index)"
            class="delete-btn"
          >
            <template #icon>
              <n-icon><Remove /></n-icon>
            </template>
          </n-button>
        </div>
        
        <template #feedback>
          <span style="font-size: 12px; color: #666;">
            {{ item.description }}
          </span>
        </template>
      </n-form-item>
    </div>

    <!-- 添加参数按钮 -->
    <div class="add-param-section">
      <n-button @click="addPortConfig" type="primary" ghost>
        <template #icon>
          <n-icon><Add /></n-icon>
        </template>
        添加参数
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Add, Remove } from '@vicons/ionicons5'

// 端口配置项接口
interface PortConfigItem {
  id: string
  name: string
  value: string | string[]
  type: 'string' | 'array'
  description: string
}

// Props
interface Props {
  modelValue?: {
    service_port?: string
    export_port?: string
  }
}

// Emits
interface Emits {
  (e: 'update:modelValue', value: { service_port?: string; export_port?: string }): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({})
})

const emit = defineEmits<Emits>()

// 响应式数据
const portConfigs = ref<PortConfigItem[]>([])

// 类型选项
const typeOptions = [
  { label: 'string', value: 'string' },
  { label: 'array', value: 'array' }
]

// 计算属性 - 生成端口配置字符串
const servicePortString = computed(() => {
  const serviceConfig = portConfigs.value.find(item => item.name.includes('应用端口'))
  if (!serviceConfig) return ''
  
  if (serviceConfig.type === 'array' && Array.isArray(serviceConfig.value)) {
    return serviceConfig.value.join(',')
  }
  return serviceConfig.value as string
})

const exportPortString = computed(() => {
  const exportConfig = portConfigs.value.find(item => item.name.includes('暴露端口'))
  if (!exportConfig) return ''
  
  if (exportConfig.type === 'array' && Array.isArray(exportConfig.value)) {
    return exportConfig.value.join(',')
  }
  return exportConfig.value as string
})

// 初始化默认配置
const initDefaultConfig = () => {
  portConfigs.value = [
    {
      id: '1',
      name: '应用端口1',
      value: '8080',
      type: 'string',
      description: '应用服务端口'
    },
    {
      id: '2',
      name: '暴露端口1',
      value: '30080',
      type: 'string',
      description: '暴露端口'
    }
  ]
}


// 添加端口配置
const addPortConfig = () => {
  const appPortCount = portConfigs.value.filter(item => item.name.includes('应用端口')).length
  const exportPortCount = portConfigs.value.filter(item => item.name.includes('暴露端口')).length
  const totalCount = portConfigs.value.length + 1
  
  // 交替添加应用端口和暴露端口
  const isAppPort = totalCount % 2 === 1
  const portType = isAppPort ? '应用端口' : '暴露端口'
  const portCount = isAppPort ? appPortCount + 1 : exportPortCount + 1
  
  const newConfig: PortConfigItem = {
    id: Date.now().toString(),
    name: `${portType}${portCount}`,
    value: isAppPort ? '8080' : '30080',
    type: 'string',
    description: isAppPort ? '应用服务端口' : '暴露端口'
  }
  portConfigs.value.push(newConfig)
  updateConfig()
}

// 删除端口配置
const removePortConfig = (index: number) => {
  portConfigs.value.splice(index, 1)
  updateConfig()
}

// 添加数组项
const addArrayItem = (index: number) => {
  const config = portConfigs.value[index]
  if (config.type === 'array' && Array.isArray(config.value)) {
    config.value.push('')
    updateConfig()
  }
}

// 删除数组项
const removeArrayItem = (index: number, valueIndex: number) => {
  const config = portConfigs.value[index]
  if (config.type === 'array' && Array.isArray(config.value)) {
    config.value.splice(valueIndex, 1)
    updateConfig()
  }
}

// 更新配置
const updateConfig = () => {
  const result = {
    service_port: servicePortString.value,
    export_port: exportPortString.value
  }
  emit('update:modelValue', result)
}

// 监听props变化，同步到内部状态
watch(() => props.modelValue, (newValue) => {
  if (newValue.service_port || newValue.export_port) {
    // 如果外部传入了配置，解析并更新内部状态
    if (newValue.service_port) {
      const serviceConfig = portConfigs.value.find(item => item.name.includes('应用端口'))
      if (serviceConfig) {
        const ports = newValue.service_port.split(',')
        if (ports.length > 1) {
          serviceConfig.type = 'array'
          serviceConfig.value = ports
        } else {
          serviceConfig.type = 'string'
          serviceConfig.value = ports[0]
        }
      }
    }
    
    if (newValue.export_port) {
      const exportConfig = portConfigs.value.find(item => item.name.includes('暴露端口'))
      if (exportConfig) {
        const ports = newValue.export_port.split(',')
        if (ports.length > 1) {
          exportConfig.type = 'array'
          exportConfig.value = ports
        } else {
          exportConfig.type = 'string'
          exportConfig.value = ports[0]
        }
      }
    }
  }
}, { deep: true, immediate: true })

// 初始化
initDefaultConfig()
</script>

<style scoped>
/* 保持原有的简洁样式 */

.port-config-item {
  margin-bottom: 16px;
}

.port-config-item:last-of-type {
  margin-bottom: 0;
}

.port-input-group {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
}

.array-inputs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 200px;
}

.array-input-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.single-input {
  flex: 1;
  min-width: 200px;
}

.add-btn {
  color: #3b82f6;
  align-self: flex-start;
}

.remove-btn {
  color: #ef4444;
}

.delete-btn {
  color: #ef4444;
  margin-left: 8px;
}

.add-param-section {
  margin-top: 16px;
  text-align: left;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .port-input-group {
    flex-direction: column;
    align-items: stretch;
  }
  
  .array-inputs,
  .single-input {
    min-width: auto;
    width: 100%;
  }
  
  .delete-btn {
    margin-left: 0;
    margin-top: 8px;
    align-self: flex-start;
  }
}
</style>
