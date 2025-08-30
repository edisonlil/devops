<template>
  <div class="instance-details">
    <n-tabs type="line" animated>
      <n-tab-pane name="overview" tab="📊 概览">
        <div class="overview-content">
          <!-- 基本信息 -->
          <div class="info-section">
            <h4>基本信息</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">实例名称:</span>
                <span class="value">{{ instance.name }}</span>
              </div>
              <div class="info-item">
                <span class="label">模板类型:</span>
                <span class="value">{{ instance.template }}</span>
              </div>
              <div class="info-item">
                <span class="label">状态:</span>
                <n-tag :type="getStatusTagType(instance.status)" size="small">
                  {{ getStatusText(instance.status) }}
                </n-tag>
              </div>
              <div class="info-item">
                <span class="label">命名空间:</span>
                <span class="value">{{ instance.namespace }}</span>
              </div>
              <div class="info-item">
                <span class="label">创建时间:</span>
                <span class="value">{{ formatTime(instance.createdAt) }}</span>
              </div>
              <div class="info-item">
                <span class="label">最后活动:</span>
                <span class="value">{{ formatTime(instance.lastActivity) }}</span>
              </div>
            </div>
          </div>

          <!-- 资源使用情况 -->
          <div class="resource-section">
            <h4>资源使用情况</h4>
            <div class="resource-cards">
              <n-card size="small" class="resource-card">
                <div class="resource-header">
                  <span class="resource-title">CPU</span>
                  <span class="resource-usage">{{ Math.round(instance.resources.cpu.usage * 100) }}%</span>
                </div>
                <n-progress 
                  type="line" 
                  :percentage="Math.round(instance.resources.cpu.usage * 100)"
                  :color="getResourceColor(instance.resources.cpu.usage * 100)"
                  :height="8"
                />
                <div class="resource-details">
                  <span>请求: {{ instance.resources.cpu.request }}</span>
                  <span>限制: {{ instance.resources.cpu.limit }}</span>
                </div>
              </n-card>

              <n-card size="small" class="resource-card">
                <div class="resource-header">
                  <span class="resource-title">内存</span>
                  <span class="resource-usage">{{ Math.round(instance.resources.memory.usage * 100) }}%</span>
                </div>
                <n-progress 
                  type="line" 
                  :percentage="Math.round(instance.resources.memory.usage * 100)"
                  :color="getResourceColor(instance.resources.memory.usage * 100)"
                  :height="8"
                />
                <div class="resource-details">
                  <span>请求: {{ instance.resources.memory.request }}</span>
                  <span>限制: {{ instance.resources.memory.limit }}</span>
                </div>
              </n-card>

              <n-card size="small" class="resource-card">
                <div class="resource-header">
                  <span class="resource-title">存储</span>
                  <span class="resource-usage">{{ Math.round(instance.resources.storage.used * 100) }}%</span>
                </div>
                <n-progress 
                  type="line" 
                  :percentage="Math.round(instance.resources.storage.used * 100)"
                  :color="getResourceColor(instance.resources.storage.used * 100)"
                  :height="8"
                />
                <div class="resource-details">
                  <span>已用: {{ formatStorage(instance.resources.storage.used) }}</span>
                  <span>总计: {{ instance.resources.storage.size }}</span>
                </div>
              </n-card>
            </div>
          </div>

          <!-- 连接信息 -->
          <div class="connection-section">
            <h4>连接信息</h4>
            <div class="connection-cards">
              <n-card size="small" class="connection-card">
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
              </n-card>
            </div>
          </div>
        </div>
      </n-tab-pane>

      <n-tab-pane name="ports" tab="🌐 端口配置">
        <div class="ports-content">
          <n-data-table
            :columns="portColumns"
            :data="instance.ports"
            :pagination="false"
            size="small"
            :bordered="false"
            :single-line="false"
          />
        </div>
      </n-tab-pane>

      <n-tab-pane name="events" tab="📋 事件">
        <div class="events-content">
          <n-empty description="事件功能开发中..." />
        </div>
      </n-tab-pane>

      <n-tab-pane name="config" tab="⚙️ 配置">
        <div class="config-content">
          <n-empty description="配置查看功能开发中..." />
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMessage } from 'naive-ui'
import { Copy } from '@vicons/ionicons5'
import type { MiddlewareInstance } from '@/types/middleware'

const props = defineProps<{
  instance: MiddlewareInstance
}>()

const message = useMessage()

const portColumns = [
  {
    title: '名称',
    key: 'name'
  },
  {
    title: '端口',
    key: 'port'
  },
  {
    title: '目标端口',
    key: 'targetPort'
  },
  {
    title: '协议',
    key: 'protocol'
  },
  {
    title: '节点端口',
    key: 'nodePort',
    render: (row: any) => row.nodePort || '-'
  }
]

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

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const formatStorage = (used: number) => {
  if (used < 1) return `${Math.round(used * 1024)}Mi`
  return `${used.toFixed(1)}Gi`
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  } catch (error) {
    message.error('复制失败')
  }
}
</script>

<style scoped>
.instance-details {
  width: 100%;
}

.overview-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-section,
.resource-section,
.connection-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-section h4,
.resource-section h4,
.connection-section h4 {
  margin: 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 14px;
}

.info-item .label {
  color: #666;
  font-weight: 500;
}

.info-item .value {
  color: #333;
  font-weight: 600;
}

.resource-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.resource-card {
  padding: 16px;
}

.resource-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.resource-title {
  font-weight: 600;
  color: #333;
}

.resource-usage {
  font-weight: 600;
  color: #1890ff;
}

.resource-details {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.connection-cards {
  display: grid;
  gap: 16px;
}

.connection-card {
  padding: 16px;
}

.connection-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.connection-item:last-child {
  margin-bottom: 0;
}

.connection-label {
  color: #666;
  margin-right: 12px;
  min-width: 80px;
}

.ports-content,
.events-content,
.config-content {
  padding: 16px 0;
}

.ports-content {
  padding: 16px 0;
}

/* 自定义表格样式 */
.ports-content :deep(.n-data-table) {
  font-size: 14px;
}

.ports-content :deep(.n-data-table-th) {
  background-color: #fafafa;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #e8e8e8;
}

.ports-content :deep(.n-data-table-td) {
  border-bottom: 1px solid #f0f0f0;
}

.ports-content :deep(.n-data-table-tr:last-child .n-data-table-td) {
  border-bottom: none;
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .resource-cards {
    grid-template-columns: 1fr;
  }
  
  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .connection-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
