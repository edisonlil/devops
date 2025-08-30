<template>
  <n-card class="instance-card" hoverable>
    <div class="instance-header">
      <div class="instance-info">
        <div class="instance-name">
          <span class="name-text">{{ getInstanceIcon(instance.template) }} {{ instance.name }}</span>
          <n-tag size="small" :type="getStatusTagType(instance.status)">
            {{ getStatusText(instance.status) }}
          </n-tag>
        </div>
        <div class="instance-template">{{ instance.template }}</div>
      </div>
      <div class="instance-actions">
        <n-dropdown :options="actionOptions" @select="handleAction">
          <n-button size="small" quaternary>
            <template #icon>
              <n-icon><EllipsisVertical /></n-icon>
            </template>
          </n-button>
        </n-dropdown>
      </div>
    </div>

    <div class="instance-content">
      <!-- 资源使用情况 -->
      <div class="resource-section">
        <div class="resource-item">
          <div class="resource-label">CPU</div>
          <div class="resource-bar">
            <n-progress 
              type="line" 
              :percentage="cpuUsagePercentage" 
              :height="6"
              :show-indicator="false"
              :color="getResourceColor(cpuUsagePercentage)"
            />
            <span class="resource-text">
              {{ instance.resources.cpu.request }} / {{ instance.resources.cpu.limit }}
            </span>
          </div>
        </div>

        <div class="resource-item">
          <div class="resource-label">内存</div>
          <div class="resource-bar">
            <n-progress 
              type="line" 
              :percentage="memoryUsagePercentage" 
              :height="6"
              :show-indicator="false"
              :color="getResourceColor(memoryUsagePercentage)"
            />
            <span class="resource-text">
              {{ instance.resources.memory.request }} / {{ instance.resources.memory.limit }}
            </span>
          </div>
        </div>

        <div class="resource-item">
          <div class="resource-label">存储</div>
          <div class="resource-bar">
            <n-progress 
              type="line" 
              :percentage="storageUsagePercentage" 
              :height="6"
              :show-indicator="false"
              :color="getResourceColor(storageUsagePercentage)"
            />
            <span class="resource-text">
              {{ formatStorage(instance.resources.storage.used) }} / {{ instance.resources.storage.size }}
            </span>
          </div>
        </div>
      </div>

      <!-- 连接信息 -->
      <div class="connection-section">
        <div class="connection-item">
          <span class="connection-label">内部访问:</span>
          <n-button text size="small" @click="copyToClipboard(instance.connectionInfo.internal)">
            {{ instance.connectionInfo.internal }}
            <template #icon>
              <n-icon><Copy /></n-icon>
            </template>
          </n-button>
        </div>
        <div v-if="instance.connectionInfo.external" class="connection-item">
          <span class="connection-label">外部访问:</span>
          <n-button text size="small" @click="copyToClipboard(instance.connectionInfo.external!)">
            {{ instance.connectionInfo.external }}
            <template #icon>
              <n-icon><Copy /></n-icon>
            </template>
          </n-button>
        </div>
      </div>

      <!-- 基本信息 -->
      <div class="info-section">
        <div class="info-item">
          <span class="info-label">命名空间:</span>
          <span class="info-value">{{ instance.namespace }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">创建时间:</span>
          <span class="info-value">{{ formatTime(instance.createdAt) }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">最后活动:</span>
          <span class="info-value">{{ formatTime(instance.lastActivity) }}</span>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="instance-footer">
      <n-space>
        <n-button size="small" @click="$emit('viewDetails', instance)">
          查看详情
        </n-button>
        <n-button size="small" @click="$emit('viewLogs', instance)">
          查看日志
        </n-button>
        <n-button 
          size="small" 
          type="primary" 
          @click="$emit('scale', instance)"
          :disabled="instance.status !== 'running'"
        >
          扩缩容
        </n-button>
        <n-button 
          size="small" 
          @click="$emit('restart', instance)"
          :disabled="instance.status === 'pending'"
        >
          重启
        </n-button>
      </n-space>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMessage } from 'naive-ui'
import { EllipsisVertical, Copy } from '@vicons/ionicons5'
import type { MiddlewareInstance } from '@/types/middleware'

const props = defineProps<{
  instance: MiddlewareInstance
}>()

const emit = defineEmits<{
  viewDetails: [instance: MiddlewareInstance]
  scale: [instance: MiddlewareInstance]
  restart: [instance: MiddlewareInstance]
  delete: [instance: MiddlewareInstance]
  viewLogs: [instance: MiddlewareInstance]
}>()

const message = useMessage()

const actionOptions = [
  {
    label: '查看详情',
    key: 'details'
  },
  {
    label: '查看日志',
    key: 'logs'
  },
  {
    label: '扩缩容',
    key: 'scale',
    disabled: props.instance.status !== 'running'
  },
  {
    label: '重启',
    key: 'restart',
    disabled: props.instance.status === 'pending'
  },
  {
    type: 'divider'
  },
  {
    label: '删除',
    key: 'delete',
    props: {
      style: 'color: #ff4d4f;'
    }
  }
]

// 计算资源使用百分比
const cpuUsagePercentage = computed(() => {
  return Math.round(props.instance.resources.cpu.usage * 100)
})

const memoryUsagePercentage = computed(() => {
  return Math.round(props.instance.resources.memory.usage * 100)
})

const storageUsagePercentage = computed(() => {
  return Math.round(props.instance.resources.storage.used * 100)
})

const getInstanceIcon = (template: string) => {
  const iconMap: Record<string, string> = {
    'redis-standalone': '🔴',
    'redis-cluster': '🔴',
    'mysql-standalone': '🗄️',
    'mysql-ha': '🗄️',
    'elasticsearch-cluster': '🔍',
    'kafka-cluster': '📨',
    'mongodb-replicaset': '📊',
    'minio-distributed': '🚀'
  }
  return iconMap[template] || '⚙️'
}

const getStatusTagType = (status: string) => {
  switch (status) {
    case 'running': return 'success'
    case 'error': return 'error'
    case 'pending': return 'warning'
    case 'stopped': return 'default'
    default: return 'default'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'running': return '运行中'
    case 'error': return '异常'
    case 'pending': return '等待中'
    case 'stopped': return '已停止'
    default: return '未知'
  }
}

const getResourceColor = (percentage: number) => {
  if (percentage < 60) return '#52c41a'
  if (percentage < 80) return '#faad14'
  return '#ff4d4f'
}

const formatStorage = (used: number) => {
  if (used < 1) return `${Math.round(used * 1024)}Mi`
  return `${used.toFixed(1)}Gi`
}

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  } catch (error) {
    message.error('复制失败')
  }
}

const handleAction = (key: string) => {
  switch (key) {
    case 'details':
      emit('viewDetails', props.instance)
      break
    case 'logs':
      emit('viewLogs', props.instance)
      break
    case 'scale':
      emit('scale', props.instance)
      break
    case 'restart':
      emit('restart', props.instance)
      break
    case 'delete':
      emit('delete', props.instance)
      break
  }
}
</script>

<style scoped>
.instance-card {
  border: 1px solid #e0e0e0;
  transition: all 0.2s ease;
}

.instance-card:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
}

.instance-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.instance-info {
  flex: 1;
}

.instance-name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.name-text {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.instance-template {
  font-size: 12px;
  color: #666;
}

.instance-content {
  margin-bottom: 16px;
}

.resource-section {
  margin-bottom: 16px;
}

.resource-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.resource-label {
  width: 40px;
  font-size: 12px;
  color: #666;
}

.resource-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.resource-text {
  font-size: 11px;
  color: #666;
  min-width: 80px;
  text-align: right;
}

.connection-section {
  margin-bottom: 16px;
  padding: 8px;
  background: #f9f9f9;
  border-radius: 4px;
}

.connection-item {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  font-size: 12px;
}

.connection-item:last-child {
  margin-bottom: 0;
}

.connection-label {
  color: #666;
  margin-right: 8px;
  min-width: 60px;
}

.info-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}

.info-item {
  font-size: 12px;
}

.info-label {
  color: #666;
  margin-right: 4px;
}

.info-value {
  color: #333;
  font-weight: 500;
}

.instance-footer {
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}

@media (max-width: 768px) {
  .instance-name {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .resource-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .resource-bar {
    width: 100%;
  }
  
  .info-section {
    grid-template-columns: 1fr;
  }
}
</style>
