<template>
  <div class="middleware-manager">
    <!-- 顶部导航栏 - 与首页保持一致 -->
    <div class="top-nav">
      <div class="nav-left">
        <h1 class="page-title">中间件管理</h1>
      </div>
      <div class="nav-right">
        <n-input
          v-model:value="searchQuery"
          placeholder="搜索实例或类型..."
          clearable
          class="search-input"
        >
          <template #prefix>
            <n-icon><Search /></n-icon>
          </template>
        </n-input>
        <div class="nav-actions">
          <n-button quaternary circle @click="refreshData" :loading="loading">
            <template #icon>
              <n-icon><Refresh /></n-icon>
            </template>
          </n-button>
          <n-button type="primary" size="small" @click="goToDeploy">新建DevBox</n-button>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 筛选栏 -->
      <div class="filter-bar">
      <div class="filter-left">
        <n-button-group>
          <n-button 
            :type="statusFilter === '' ? 'primary' : 'default'"
            @click="statusFilter = ''"
          >
            全部
          </n-button>
          <n-button 
            :type="statusFilter === 'running' ? 'primary' : 'default'"
            @click="statusFilter = 'running'"
          >
            已启用
          </n-button>
          <n-button 
            :type="statusFilter === 'error' ? 'primary' : 'default'"
            @click="statusFilter = 'error'"
          >
            异常
          </n-button>
        </n-button-group>
      </div>
      <div class="filter-right">
        <span class="filter-label">CPU</span>
        <span class="filter-label">内存</span>
        <span class="filter-label">创建时间</span>
        <span class="filter-label">操作</span>
      </div>
    </div>

    <!-- 实例列表 -->
    <div class="instances-list">
      <div
        v-for="instance in filteredInstances"
        :key="instance.name"
        class="instance-row"
        @click="viewDetails(instance)"
      >
        <div class="instance-info">
          <div class="instance-avatar">
            <div class="avatar-icon">{{ getInstanceIcon(instance.template) }}</div>
          </div>
          <div class="instance-details">
            <div class="instance-name">{{ instance.name }}</div>
            <div class="instance-meta">
              <span class="instance-type">{{ instance.template }}</span>
              <div class="status-indicator" :class="getStatusClass(instance.status)">
                {{ getStatusText(instance.status) }}
              </div>
            </div>
          </div>
        </div>

        <div class="instance-metrics">
          <div class="metric-item">
            <div class="metric-bar">
              <div 
                class="metric-fill" 
                :style="{ width: (instance.resources.cpu.usage * 100) + '%' }"
              ></div>
            </div>
            <span class="metric-text">{{ (instance.resources.cpu.usage * 100).toFixed(0) }}%</span>
          </div>
          
          <div class="metric-item">
            <div class="metric-bar">
              <div 
                class="metric-fill" 
                :style="{ width: (instance.resources.memory.usage * 100) + '%' }"
              ></div>
            </div>
            <span class="metric-text">{{ (instance.resources.memory.usage * 100).toFixed(0) }}%</span>
          </div>
          
          <div class="time-info">
            {{ formatDate(instance.createdAt) }}
          </div>
          
          <div class="actions">
            <n-dropdown
              :options="getActionOptions(instance)"
              @select="(key) => handleAction(key, instance)"
              trigger="click"
            >
              <n-button text>
                ⋯
              </n-button>
            </n-dropdown>
            <n-button text @click.stop="viewDetails(instance)">详情</n-button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredInstances.length === 0" class="empty-state">
        <div class="empty-content">
          <div class="empty-text">暂无中间件实例</div>
          <n-button type="primary" @click="goToDeploy">创建第一个实例</n-button>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination">
      <span class="total-info">Total: {{ instances.length }}</span>
      <div class="pagination-controls">
        <n-button text size="small">‹</n-button>
        <span class="page-info">1 / 1</span>
        <n-button text size="small">›</n-button>
        <n-select
          :value="10"
          :options="[
            { label: '10', value: 10 },
            { label: '20', value: 20 },
            { label: '50', value: 50 }
          ]"
          size="small"
          style="width: 60px"
        />
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, useDialog } from 'naive-ui'
import { Search, Refresh } from '@vicons/ionicons5'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()

// 响应式数据
const loading = ref(false)
const currentWorkspace = ref('default')
const searchQuery = ref('')
const statusFilter = ref('')

// 示例数据
const instances = ref([
  {
    name: 'devbox-docker',
    template: 'redis-standalone',
    status: 'running',
    resources: {
      cpu: { usage: 0.0 },
      memory: { usage: 0.0 }
    },
    createdAt: '2025/08/29 17:34',
    connectionInfo: {
      internal: 'redis-cache-01.middleware.svc.cluster.local:6379'
    }
  },
  {
    name: 'devbox',
    template: 'mysql-ha',
    status: 'running',
    resources: {
      cpu: { usage: 0.0 },
      memory: { usage: 0.0 }
    },
    createdAt: '2025/08/29 16:43',
    connectionInfo: {
      internal: 'mysql-primary.middleware.svc.cluster.local:3306'
    }
  }
])

// 计算属性
const filteredInstances = computed(() => {
  let filtered = instances.value

  // 状态筛选
  if (statusFilter.value) {
    filtered = filtered.filter(instance => instance.status === statusFilter.value)
  }

  // 搜索筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(instance => 
      instance.name.toLowerCase().includes(query) ||
      instance.template.toLowerCase().includes(query)
    )
  }

  return filtered
})

// 方法
const refreshData = async () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    message.success('数据已刷新')
  }, 1000)
}

const goToDeploy = () => {
  router.push(`/workspace/${currentWorkspace.value}/middleware/deploy`)
}

const getInstanceIcon = (template) => {
  const iconMap = {
    'redis-standalone': '🔴',
    'mysql-ha': '🗄️',
    'elasticsearch-cluster': '🔍',
    'kafka-cluster': '📨'
  }
  return iconMap[template] || '⚙️'
}

const getStatusClass = (status) => {
  const classMap = {
    'running': 'status-running',
    'error': 'status-error',
    'pending': 'status-pending'
  }
  return classMap[status] || 'status-default'
}

const getStatusText = (status) => {
  const textMap = {
    'running': '已启用',
    'error': '异常',
    'pending': '等待中'
  }
  return textMap[status] || status
}

const formatDate = (dateString) => {
  return dateString
}

const getActionOptions = (instance) => {
  return [
    { label: '查看日志', key: 'logs' },
    { label: '重启', key: 'restart', disabled: instance.status !== 'running' },
    { label: '删除', key: 'delete' }
  ]
}

const handleAction = (key, instance) => {
  switch (key) {
    case 'logs':
      message.info(`查看 ${instance.name} 日志`)
      break
    case 'restart':
      message.info(`重启 ${instance.name}`)
      break
    case 'delete':
      dialog.warning({
        title: '确认删除',
        content: `确定要删除 "${instance.name}" 吗？`,
        positiveText: '删除',
        negativeText: '取消',
        onPositiveClick: () => {
          message.success(`${instance.name} 删除成功`)
        }
      })
      break
  }
}

const viewDetails = (instance) => {
  message.info(`查看 ${instance.name} 详情`)
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.middleware-manager {
  min-height: 100vh;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif;
}

/* 顶部导航栏 - 与首页保持一致 */
.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  background: #ffffff;
  height: 56px;
}

.nav-left {
  display: flex;
  align-items: center;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #1d1d1f;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-input {
  width: 280px;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-actions :deep(.n-button) {
  border-radius: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  font-weight: 500;
}

.nav-actions :deep(.n-button--text) {
  color: #86868b;
  font-size: 13px;
  padding: 6px 12px;
  height: 32px;
}

.nav-actions :deep(.n-button--text:hover) {
  background-color: rgba(0, 0, 0, 0.04);
}

.nav-actions :deep(.n-button--primary) {
  font-size: 13px;
  padding: 6px 16px;
  height: 32px;
  border-radius: 8px;
}

.nav-actions :deep(.n-button--quaternary) {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: #86868b;
}

.nav-actions :deep(.n-button--quaternary:hover) {
  background-color: rgba(0, 0, 0, 0.04);
  color: #1d1d1f;
}

/* 主内容区域 */
.main-content {
  padding: 20px;
}

/* 筛选栏样式 */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #ffffff;
}

.filter-left :deep(.n-button-group .n-button) {
  border-radius: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
  height: 32px;
}

.filter-right {
  display: flex;
  gap: 120px;
  padding-right: 60px;
}

.filter-label {
  font-size: 12px;
  color: #86868b;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
}

/* 实例列表样式 */
.instances-list {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
  margin: 0 20px;
}

.instance-row {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.instance-row:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.instance-row:last-child {
  border-bottom: none;
}

.instance-info {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.instance-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.avatar-icon {
  font-size: 18px;
}

.instance-details {
  min-width: 0;
  flex: 1;
}

.instance-name {
  font-size: 14px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 4px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
}

.instance-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.instance-type {
  font-size: 13px;
  color: #86868b;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
}

.status-indicator {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  letter-spacing: 0.01em;
}

.status-running {
  background: rgba(52, 199, 89, 0.1);
  color: #34c759;
}

.status-error {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

.status-pending {
  background: rgba(255, 149, 0, 0.1);
  color: #ff9500;
}

/* 指标样式 */
.instance-metrics {
  display: flex;
  align-items: center;
  gap: 120px;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 80px;
}

.metric-bar {
  width: 50px;
  height: 4px;
  background: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  background: linear-gradient(90deg, #52c41a 0%, #73d13d 100%);
  transition: width 0.3s;
}

.metric-text {
  font-size: 11px;
  color: #86868b;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', Monaco, monospace;
  font-weight: 500;
}

.time-info {
  font-size: 13px;
  color: #86868b;
  width: 120px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.actions :deep(.n-button) {
  border-radius: 6px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  height: 28px;
}

.actions :deep(.n-button--text) {
  color: #86868b;
}

.actions :deep(.n-button--text:hover) {
  background-color: rgba(0, 0, 0, 0.04);
}

/* 空状态样式 */
.empty-state {
  padding: 80px 20px;
  text-align: center;
}

.empty-content {
  max-width: 320px;
  margin: 0 auto;
}

.empty-text {
  font-size: 16px;
  color: #86868b;
  margin-bottom: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  font-weight: 500;
}

.empty-content :deep(.n-button) {
  border-radius: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  font-weight: 600;
  padding: 8px 20px;
  height: 36px;
}

/* 分页样式 */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding: 16px 20px;
  background: #ffffff;
}

.total-info {
  font-size: 13px;
  color: #86868b;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-controls :deep(.n-button) {
  border-radius: 6px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  font-size: 12px;
}

.page-info {
  font-size: 13px;
  color: #86868b;
  margin: 0 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
}
</style>
