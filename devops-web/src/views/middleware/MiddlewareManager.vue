<template>
  <div class="middleware-manager">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>中间件管理</h1>
        <p>工作空间: {{ currentWorkspace }} | 用户: {{ currentUser }} </p>
      </div>
      <div class="header-right">
        <n-button @click="refreshData" :loading="loading" quaternary circle>
          <template #icon>
            <n-icon><Refresh /></n-icon>
          </template>
        </n-button>
        <n-button type="primary" @click="goToDeploy">
          新建DevBox
        </n-button>
      </div>
    </div>

    <!-- 概览统计 -->
    <div class="overview-stats">
      <div class="stat-card">
        <div class="stat-number">{{ instances.length }}</div>
        <div class="stat-label">总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ runningCount }}</div>
        <div class="stat-label">运行中</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ errorCount }}</div>
        <div class="stat-label">异常</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${{ totalCost.toFixed(2) }}</div>
        <div class="stat-label">月成本</div>
      </div>
    </div>

    <!-- 筛选和搜索 -->
    <div class="filter-bar">
      <n-input
        v-model:value="searchQuery"
        placeholder="搜索中间件实例..."
        clearable
        style="width: 300px"
      >
        <template #prefix>
          <n-icon :component="SearchIcon" />
        </template>
      </n-input>

      <n-select
        v-model:value="statusFilter"
        placeholder="状态筛选"
        :options="statusOptions"
        clearable
        style="width: 150px"
      />

      <n-select
        v-model:value="typeFilter"
        placeholder="类型筛选"
        :options="typeOptions"
        clearable
        style="width: 150px"
      />
    </div>

    <!-- 中间件实例列表 -->
    <div class="instances-list">
      <div
        v-for="instance in filteredInstances"
        :key="instance.name"
        class="instance-card"
      >
        <div class="instance-header">
          <div class="instance-info">
            <div class="instance-icon">{{ getInstanceIcon(instance.template) }}</div>
            <div class="instance-details">
              <h3>{{ instance.name }}</h3>
              <p>{{ instance.template }}</p>
            </div>
          </div>
          <div class="instance-status">
            <n-tag :type="getStatusType(instance.status)">
              {{ getStatusText(instance.status) }}
            </n-tag>
          </div>
        </div>

        <div class="instance-metrics">
          <div class="metric">
            <span class="metric-label">CPU:</span>
            <span class="metric-value">
              {{ (instance.resources.cpu.usage * 100).toFixed(1) }}%
              ({{ instance.resources.cpu.request }}/{{ instance.resources.cpu.limit }})
            </span>
          </div>
          <div class="metric">
            <span class="metric-label">内存:</span>
            <span class="metric-value">
              {{ (instance.resources.memory.usage * 100).toFixed(1) }}%
              ({{ instance.resources.memory.request }}/{{ instance.resources.memory.limit }})
            </span>
          </div>
          <div class="metric">
            <span class="metric-label">存储:</span>
            <span class="metric-value">
              {{ (instance.resources.storage.used * 100).toFixed(1) }}%
              ({{ instance.resources.storage.size }})
            </span>
          </div>
        </div>

        <div class="instance-info-row">
          <div class="info-item">
            <span class="info-label">创建时间:</span>
            <span class="info-value">{{ formatDate(instance.createdAt) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">最后活动:</span>
            <span class="info-value">{{ formatDate(instance.lastActivity) }}</span>
          </div>
        </div>

        <div class="instance-connection">
          <div class="connection-info">
            <span class="connection-label">内部访问:</span>
            <span class="connection-value">{{ instance.connectionInfo.internal }}</span>
            <n-button text @click="copyToClipboard(instance.connectionInfo.internal)">
              📋
            </n-button>
          </div>
          <div v-if="instance.connectionInfo.external" class="connection-info">
            <span class="connection-label">外部访问:</span>
            <span class="connection-value">{{ instance.connectionInfo.external }}</span>
            <n-button text @click="copyToClipboard(instance.connectionInfo.external)">
              📋
            </n-button>
          </div>
        </div>

        <div class="instance-actions">
          <n-button size="small" @click="viewDetails(instance)">
            查看详情
          </n-button>
          <n-button size="small" @click="viewLogs(instance)">
            查看日志
          </n-button>
          <n-button
            size="small"
            @click="scaleInstance(instance)"
            :disabled="!canScale(instance)"
          >
            扩缩容
          </n-button>
          <n-button
            size="small"
            @click="backupInstance(instance)"
            :disabled="!canBackup(instance)"
          >
            备份
          </n-button>
          <n-button
            size="small"
            type="warning"
            @click="restartInstance(instance)"
            :disabled="instance.status !== 'running'"
          >
            重启
          </n-button>
          <n-button
            size="small"
            type="error"
            @click="removeInstance(instance)"
          >
            删除
          </n-button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredInstances.length === 0" class="empty-state">
        <div class="empty-icon">🚀</div>
        <h3>暂无中间件实例</h3>
        <p>点击"部署新中间件"开始部署您的第一个中间件服务</p>
        <n-button type="primary" @click="goToDeploy">
          部署新中间件
        </n-button>
      </div>
    </div>

    <!-- 实例详情对话框 -->
    <n-modal v-model:show="showDetailsModal" style="width: 800px;">
      <n-card title="实例详情" :bordered="false" size="huge">
        <template #header-extra>
          <n-button quaternary circle @click="showDetailsModal = false">
            <template #icon>
              <n-icon><Close /></n-icon>
            </template>
          </n-button>
        </template>
        
        <InstanceDetails v-if="selectedInstance" :instance="selectedInstance" />
      </n-card>
    </n-modal>

    <!-- 日志查看对话框 -->
    <n-modal v-model:show="showLogsModal" style="width: 900px;">
      <n-card title="实例日志" :bordered="false" size="huge">
        <template #header-extra>
          <n-space>
            <n-button @click="refreshLogs">刷新日志</n-button>
            <n-button quaternary circle @click="showLogsModal = false">
              <template #icon>
                <n-icon><Close /></n-icon>
              </template>
            </n-button>
          </n-space>
        </template>
        
        <InstanceLogs v-if="selectedInstance" :instance="selectedInstance" />
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage, useDialog } from 'naive-ui'
import { Search as SearchIcon, Refresh } from '@vicons/ionicons5'
import { middlewareApi } from '@/api/middleware'
import type { MiddlewareInstance } from '@/types/middleware'
import { mockMiddlewareInstances, mockMiddlewareStats } from '@/mock/middleware'
import InstanceDetails from '@/components/middleware/InstanceDetails.vue'
import InstanceLogs from '@/components/middleware/InstanceLogs.vue'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const instances = ref<MiddlewareInstance[]>([
  {
    name: 'redis-cache-01',
    template: 'redis-standalone',
    workspace: 'default',
    namespace: 'middleware',
    status: 'running',
    resources: {
      cpu: { request: '500m', limit: '1000m', usage: 0.45 },
      memory: { request: '1Gi', limit: '2Gi', usage: 0.62 },
      storage: { size: '10Gi', used: 0.35 }
    },
    createdAt: '2024-01-15T10:30:00Z',
    lastActivity: '2024-01-20T16:45:00Z',
    connectionInfo: {
      internal: 'redis-cache-01.middleware.svc.cluster.local:6379',
      external: 'redis-cache-01.example.com:6379'
    },
    ports: [{ name: 'redis', port: 6379, targetPort: 6379, protocol: 'TCP' }],
    monthlyCost: 45.60
  },
  {
    name: 'mysql-primary',
    template: 'mysql-ha',
    workspace: 'default',
    namespace: 'middleware',
    status: 'running',
    resources: {
      cpu: { request: '1000m', limit: '2000m', usage: 0.68 },
      memory: { request: '2Gi', limit: '4Gi', usage: 0.75 },
      storage: { size: '50Gi', used: 0.42 }
    },
    createdAt: '2024-01-10T09:15:00Z',
    lastActivity: '2024-01-20T16:40:00Z',
    connectionInfo: {
      internal: 'mysql-primary.middleware.svc.cluster.local:3306'
    },
    ports: [{ name: 'mysql', port: 3306, targetPort: 3306, protocol: 'TCP' }],
    replicas: 3,
    monthlyCost: 128.50
  },
  {
    name: 'kafka-message-queue',
    template: 'kafka-cluster',
    workspace: 'default',
    namespace: 'middleware',
    status: 'error',
    resources: {
      cpu: { request: '1500m', limit: '3000m', usage: 0.85 },
      memory: { request: '3Gi', limit: '6Gi', usage: 0.92 },
      storage: { size: '80Gi', used: 0.65 }
    },
    createdAt: '2024-01-08T16:45:00Z',
    lastActivity: '2024-01-20T15:20:00Z',
    connectionInfo: {
      internal: 'kafka-message-queue.middleware.svc.cluster.local:9092'
    },
    ports: [{ name: 'kafka', port: 9092, targetPort: 9092, protocol: 'TCP' }],
    replicas: 3,
    monthlyCost: 189.20
  }
])
const searchQuery = ref('')
const statusFilter = ref<string | null>(null)
const showDetailsModal = ref(false)
const showLogsModal = ref(false)
const selectedInstance = ref<MiddlewareInstance | null>(null)

const workspaceName = computed(() => route.params.workspaceName as string)

const statusOptions = [
  { label: '运行中', value: 'running' },
  { label: '异常', value: 'error' },
  { label: '等待中', value: 'pending' },
  { label: '已停止', value: 'stopped' }
]

// 计算属性
const runningCount = computed(() => 
  instances.value.filter(i => i.status === 'running').length
)

const errorCount = computed(() => 
  instances.value.filter(i => i.status === 'error').length
)

const totalCost = computed(() =>
  instances.value.reduce((sum: number, instance: MiddlewareInstance) => {
    return sum + (instance.monthlyCost || 0)
  }, 0)
)

const filteredInstances = computed(() => {
  let filtered = instances.value

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(instance => 
      instance.name.toLowerCase().includes(query) ||
      instance.template.toLowerCase().includes(query)
    )
  }

  // 状态过滤
  if (statusFilter.value) {
    filtered = filtered.filter(instance => instance.status === statusFilter.value)
  }

  return filtered
})

// 基于实际 DevOps 功能的方法
const currentUser = ref('admin')
const currentWorkspace = computed(() => route.params.workspaceName as string)
const typeFilter = ref('')

const typeOptions = computed(() => {
  const types = [...new Set(instances.value.map(i => i.template))]
  return types.map(type => ({ label: type, value: type }))
})

// 删除重复的过滤逻辑

// 实际 DevOps 中间件功能方法
const refreshData = async () => {
  loading.value = true
  try {
    const response = await middlewareApi.getInstances(workspaceName.value)
    instances.value = response.instances
  } catch (error: any) {
    message.error(error.message || '获取实例列表失败')
  } finally {
    loading.value = false
  }
}

const goToDeploy = () => {
  router.push(`/workspace/${workspaceName.value}/middleware/deploy`)
}

const viewInstanceDetails = (instance: MiddlewareInstance) => {
  selectedInstance.value = instance
  showDetailsModal.value = true
}

const scaleInstance = (instance: MiddlewareInstance) => {
  // 实现扩缩容逻辑
  message.info(`扩缩容功能开发中: ${instance.name}`)
}

const restartInstance = async (instance: MiddlewareInstance) => {
  try {
    await middlewareApi.restartInstance(workspaceName.value, instance.name)
    message.success(`${instance.name} 重启成功`)
    await refreshData()
  } catch (error: any) {
    message.error(error.message || '重启失败')
  }
}

const deleteInstance = (instance: MiddlewareInstance) => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除实例 "${instance.name}" 吗？此操作不可恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await middlewareApi.deleteInstance(workspaceName.value, instance.name)
        message.success(`${instance.name} 删除成功`)
        await refreshData()
      } catch (error: any) {
        message.error(error.message || '删除失败')
      }
    }
  })
}

const viewInstanceLogs = (instance: MiddlewareInstance) => {
  selectedInstance.value = instance
  showLogsModal.value = true
}

const refreshLogs = () => {
  // 刷新日志的逻辑会在 InstanceLogs 组件中处理
  message.info('刷新日志...')
}

// 基于实际 DevOps 中间件管理功能的方法
const getInstanceIcon = (template: string) => {
  const iconMap: Record<string, string> = {
    'redis-standalone': '🔴',
    'redis-cluster': '🔴',
    'redis-sentinel': '🔴',
    'mysql-standalone': '🗄️',
    'mysql-ha': '🗄️',
    'postgresql-standalone': '🐘',
    'postgresql-ha': '🐘',
    'elasticsearch-standalone': '🔍',
    'elasticsearch-cluster': '🔍',
    'kafka-standalone': '📨',
    'kafka-cluster': '📨',
    'rabbitmq-standalone': '🐰',
    'rabbitmq-cluster': '🐰',
    'mongodb-standalone': '🍃',
    'mongodb-replicaset': '🍃',
    'minio-standalone': '📦',
    'minio-distributed': '📦'
  }
  return iconMap[template] || '⚙️'
}

const getStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    'running': 'success',
    'error': 'error',
    'pending': 'warning',
    'stopped': 'default'
  }
  return typeMap[status] || 'default'
}

const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    'running': '✅ 运行中',
    'error': '❌ 异常',
    'pending': '⏳ 等待中',
    'stopped': '⏹️ 已停止'
  }
  return textMap[status] || status
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  } catch (error) {
    message.error('复制失败')
  }
}

// 判断是否支持扩缩容 - 基于实际 DevOps 功能
const canScale = (instance: any) => {
  return instance.template.includes('cluster') ||
         instance.template.includes('ha') ||
         instance.template.includes('sentinel') ||
         instance.template.includes('replicaset')
}

// 判断是否支持备份 - 基于实际 DevOps 功能
const canBackup = (instance: any) => {
  return instance.template.includes('mysql') ||
         instance.template.includes('postgresql') ||
         instance.template.includes('mongodb') ||
         instance.template.includes('elasticsearch')
}

// 实际的中间件操作方法
const viewDetails = (instance: any) => {
  selectedInstance.value = instance
  showDetailsModal.value = true
}

const viewLogs = (instance: any) => {
  selectedInstance.value = instance
  showLogsModal.value = true
}

const backupInstance = async (instance: any) => {
  try {
    await middlewareApi.backupInstance(workspaceName.value, instance.name)
    message.success(`${instance.name} 备份任务已启动`)
  } catch (error: any) {
    message.error(error.message || '备份失败')
  }
}

const removeInstance = async (instance: any) => {
  const confirmed = await new Promise((resolve) => {
    dialog.warning({
      title: '确认删除',
      content: `确定要删除中间件实例 "${instance.name}" 吗？此操作不可撤销！`,
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false)
    })
  })

  if (confirmed) {
    try {
      await middlewareApi.deleteInstance(workspaceName.value, instance.name)
      message.success('删除成功')
      await refreshData()
    } catch (error: any) {
      message.error('删除失败: ' + error.message)
    }
  }
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.middleware-manager {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left h1 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.header-left p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.header-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.overview-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  text-align: center;
  transition: all 0.2s ease;
}

.stat-card:hover {
  border-color: #d9d9d9;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: #1890ff;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.filter-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  align-items: center;
  flex-wrap: wrap;
}

.instances-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.instance-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e8e8e8;
  transition: all 0.2s ease;
}

.instance-card:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
}

.instance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.instance-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.instance-icon {
  font-size: 24px;
}

.instance-details h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.instance-details p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.instance-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  font-weight: 500;
  color: #333;
}

.metric-value {
  color: #666;
  font-family: monospace;
}

.instance-info-row {
  display: flex;
  gap: 32px;
  margin-bottom: 16px;
  font-size: 14px;
}

.info-item {
  display: flex;
  gap: 8px;
}

.info-label {
  color: #666;
}

.info-value {
  color: #333;
  font-family: monospace;
}

.instance-connection {
  margin-bottom: 16px;
  padding: 12px;
  background: #f0f8ff;
  border-radius: 8px;
}

.connection-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
}

.connection-info:last-child {
  margin-bottom: 0;
}

.connection-label {
  color: #666;
  min-width: 80px;
}

.connection-value {
  color: #333;
  font-family: monospace;
  flex: 1;
}

.instance-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #333;
  font-weight: 600;
}

.empty-state p {
  margin: 0 0 24px 0;
  color: #666;
  font-size: 14px;
}

.instances-list {
  display: grid;
  gap: 16px;
}

@media (max-width: 768px) {
  .middleware-manager {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-right {
    width: 100%;
    justify-content: flex-end;
  }

  .overview-stats {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .filter-bar .n-input,
  .filter-bar .n-select {
    width: 100% !important;
  }
}
</style>
