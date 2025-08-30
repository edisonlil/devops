<template>
  <div class="middleware-manager">
    <!-- 简洁的页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">中间件管理</h1>
        <p class="page-subtitle">工作空间: {{ currentWorkspace }}</p>
      </div>
      <div class="header-actions">
        <n-button text @click="refreshData" :loading="loading">刷新</n-button>
        <n-button type="primary" @click="goToDeploy">部署新中间件</n-button>
      </div>
    </div>

    <!-- 简洁的统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ instances.length }}</div>
        <div class="stat-label">总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ runningCount }}</div>
        <div class="stat-label">运行中</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ errorCount }}</div>
        <div class="stat-label">异常</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${{ totalCost.toFixed(2) }}</div>
        <div class="stat-label">月成本</div>
      </div>
    </div>

    <!-- 简洁的搜索栏 -->
    <div class="search-section">
      <n-input
        v-model:value="searchQuery"
        placeholder="搜索中间件实例..."
        clearable
        size="large"
        class="search-input"
      >
        <template #prefix>
          <n-icon><Search /></n-icon>
        </template>
      </n-input>
    </div>

    <!-- 简洁的实例列表 -->
    <div class="instances-grid">
      <div
        v-for="instance in filteredInstances"
        :key="instance.name"
        class="instance-card"
        @click="viewDetails(instance)"
      >
        <!-- 卡片头部 -->
        <div class="card-header">
          <div class="instance-icon">{{ getInstanceIcon(instance.template) }}</div>
          <div class="instance-status">
            <div class="status-dot" :class="getStatusClass(instance.status)"></div>
          </div>
        </div>

        <!-- 卡片内容 -->
        <div class="card-content">
          <h3 class="instance-name">{{ instance.name }}</h3>
          <p class="instance-type">{{ instance.template }}</p>

          <!-- 简化的资源信息 -->
          <div class="resource-info">
            <div class="resource-item">
              <span class="resource-label">CPU</span>
              <span class="resource-value">{{ (instance.resources.cpu.usage * 100).toFixed(0) }}%</span>
            </div>
            <div class="resource-item">
              <span class="resource-label">内存</span>
              <span class="resource-value">{{ (instance.resources.memory.usage * 100).toFixed(0) }}%</span>
            </div>
          </div>

          <!-- 连接信息 -->
          <div class="connection-info">
            <span class="connection-text">{{ instance.connectionInfo.internal }}</span>
            <n-button text size="tiny" @click.stop="copyToClipboard(instance.connectionInfo.internal)">
              <n-icon size="14"><Copy /></n-icon>
            </n-button>
          </div>
        </div>

        <!-- 卡片底部操作 -->
        <div class="card-actions">
          <n-button text size="small" @click.stop="viewLogs(instance)">日志</n-button>
          <n-button text size="small" @click.stop="restartInstance(instance)" :disabled="instance.status !== 'running'">重启</n-button>
          <n-dropdown
            :options="getActionOptions(instance)"
            @select="(key) => handleAction(key, instance)"
            @click.stop
          >
            <n-button text size="small">更多</n-button>
          </n-dropdown>
        </div>
      </div>

      <!-- 简洁的空状态 -->
      <div v-if="filteredInstances.length === 0" class="empty-state">
        <div class="empty-content">
          <div class="empty-icon">📦</div>
          <h3>暂无中间件实例</h3>
          <p>部署您的第一个中间件服务</p>
          <n-button type="primary" @click="goToDeploy">开始部署</n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, useDialog } from 'naive-ui'
import { Search, Copy } from '@vicons/ionicons5'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()

// 响应式数据
const loading = ref(false)
const currentWorkspace = ref('default')
const searchQuery = ref('')
const statusFilter = ref('')
const typeFilter = ref('')

// 示例数据 - 基于实际 DevOps 中间件类型
const instances = ref([
  {
    name: 'redis-cache-01',
    template: 'redis-standalone',
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
    monthlyCost: 45.60
  },
  {
    name: 'mysql-primary',
    template: 'mysql-ha',
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
    replicas: 3,
    monthlyCost: 128.50
  },
  {
    name: 'kafka-message-queue',
    template: 'kafka-cluster',
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
    replicas: 3,
    monthlyCost: 189.20
  }
])

// 计算属性
const runningCount = computed(() => 
  instances.value.filter(i => i.status === 'running').length
)

const errorCount = computed(() => 
  instances.value.filter(i => i.status === 'error').length
)

const totalCost = computed(() => 
  instances.value.reduce((sum, instance) => sum + (instance.monthlyCost || 0), 0)
)

const filteredInstances = computed(() => {
  if (!searchQuery.value) return instances.value

  const query = searchQuery.value.toLowerCase()
  return instances.value.filter(instance =>
    instance.name.toLowerCase().includes(query) ||
    instance.template.toLowerCase().includes(query)
  )
})

// 方法
const refreshData = async () => {
  loading.value = true
  // 模拟 API 调用
  setTimeout(() => {
    loading.value = false
    message.success('数据已刷新')
  }, 1000)
}

const goToDeploy = () => {
  router.push(`/workspace/${currentWorkspace.value}/middleware/deploy`)
}

// 基于实际 DevOps 中间件管理功能的方法
const getInstanceIcon = (template) => {
  const iconMap = {
    'redis-standalone': '🔴',
    'redis-cluster': '🔴',
    'mysql-standalone': '🗄️',
    'mysql-ha': '🗄️',
    'elasticsearch-standalone': '🔍',
    'elasticsearch-cluster': '🔍',
    'kafka-standalone': '📨',
    'kafka-cluster': '📨',
    'mongodb-standalone': '🍃',
    'mongodb-replicaset': '🍃'
  }
  return iconMap[template] || '⚙️'
}

const getStatusType = (status) => {
  const typeMap = {
    'running': 'success',
    'error': 'error',
    'pending': 'warning',
    'stopped': 'default'
  }
  return typeMap[status] || 'default'
}

const getStatusText = (status) => {
  const textMap = {
    'running': '✅ 运行中',
    'error': '❌ 异常',
    'pending': '⏳ 等待中',
    'stopped': '⏹️ 已停止'
  }
  return textMap[status] || status
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  } catch (error) {
    message.error('复制失败')
  }
}

const canScale = (instance) => {
  return instance.template.includes('cluster') || 
         instance.template.includes('ha') ||
         instance.template.includes('replicaset')
}

const canBackup = (instance) => {
  return instance.template.includes('mysql') || 
         instance.template.includes('postgresql') || 
         instance.template.includes('mongodb') ||
         instance.template.includes('elasticsearch')
}

const viewDetails = (instance) => {
  message.info(`查看 ${instance.name} 详情`)
}

const viewLogs = (instance) => {
  message.info(`查看 ${instance.name} 日志`)
}

const scaleInstance = (instance) => {
  message.info(`扩缩容 ${instance.name}`)
}

const backupInstance = (instance) => {
  message.info(`备份 ${instance.name}`)
}

const restartInstance = (instance) => {
  message.info(`重启 ${instance.name}`)
}

const removeInstance = (instance) => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除中间件实例 "${instance.name}" 吗？此操作不可撤销！`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      message.success(`${instance.name} 删除成功`)
    }
  })
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
  font-size: 24px;
  font-weight: 600;
}

.header-left p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.header-right {
  display: flex;
  gap: 12px;
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
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
  color: #1890ff;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.filter-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  align-items: center;
}

.instances-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.instance-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.instance-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
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
  font-size: 18px;
  font-weight: 600;
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
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #333;
}

.empty-state p {
  margin: 0 0 24px 0;
  color: #666;
}
</style>
