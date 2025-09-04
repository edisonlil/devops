<template>
  <div class="application-manager">
    <!-- 页面标题区域 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title text-h1">应用管理</h1>
        <p class="page-subtitle text-subtitle">部署和管理容器化应用程序</p>
      </div>
      <div class="header-actions">
      </div>
    </div>

    <!-- 应用列表 -->
    <div class="applications-section">
      <!-- 搜索和操作区域 -->
      <div class="search-section">
        <n-input
          v-model:value="searchQuery"
          placeholder="搜索应用..."
          clearable
          size="medium"
          style="width: 300px;"
        >
          <template #prefix>
            <n-icon size="16"><Search /></n-icon>
          </template>
        </n-input>

        <n-button type="primary" @click="goToDeployPage">
          <template #icon>
            <n-icon><Add /></n-icon>
          </template>
          部署应用
        </n-button>
      </div>

      <div class="application-list">
        <div class="table-container">
          <div class="table-header">
            <div class="col-name" @click="handleSort('name')">
              <span>名称</span>
              <n-icon class="sort-icon" :class="{ active: sortField === 'name' }">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </n-icon>
            </div>
            <div class="col-status" @click="handleSort('status')">
              <span>状态</span>
              <n-icon class="sort-icon" :class="{ active: sortField === 'status' }">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </n-icon>
            </div>
            <div class="col-cpu" @click="handleSort('cpu')">
              <span>CPU</span>
              <n-icon class="sort-icon" :class="{ active: sortField === 'cpu' }">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </n-icon>
            </div>
            <div class="col-memory" @click="handleSort('memory')">
              <span>内存</span>
              <n-icon class="sort-icon" :class="{ active: sortField === 'memory' }">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </n-icon>
            </div>
            <div class="col-created" @click="handleSort('createdAt')">
              <span>创建时间</span>
              <n-icon class="sort-icon" :class="{ active: sortField === 'createdAt' }">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </n-icon>
            </div>
            <div class="col-actions">
              <span>操作</span>
            </div>
          </div>

          <div class="table-body">
          
          <div v-if="paginatedApplications.length === 0" class="empty-state">
            <div class="empty-content">
              <div class="empty-icon">📦</div>
              <div class="empty-title">暂无应用</div>
              <div class="empty-description">点击"部署应用"开始部署第一个应用</div>
            </div>
          </div>
          
          <div
            v-for="app in paginatedApplications"
            :key="app.id"
            class="table-row"
          >
            <div class="col-name">
              <div class="app-info">
                <div class="app-details">
                  <div class="app-name">{{ app.name }}</div>
                  <div class="app-type">{{ app.type }}</div>
                </div>
              </div>
            </div>
            
            <div class="col-status">
              <div class="status-indicator">
                <div class="status-dot" :class="`status-${app.status}`"></div>
                <span class="status-text">{{ getStatusText(app.status) }}</span>
              </div>
            </div>
            
            <div class="col-cpu">
              <div class="resource-info-horizontal">
                <n-progress
                  type="line"
                  :percentage="app.cpu"
                  :height="6"
                  :show-indicator="false"
                  :color="getResourceColor(app.cpu)"
                  :border-radius="3"
                  :fill-border-radius="3"
                />
                <span class="resource-text">{{ app.cpu }}%</span>
              </div>
            </div>
            
            <div class="col-memory">
              <div class="resource-info-horizontal">
                <n-progress
                  type="line"
                  :percentage="app.memory"
                  :height="6"
                  :show-indicator="false"
                  :color="getResourceColor(app.memory)"
                  :border-radius="3"
                  :fill-border-radius="3"
                />
                <span class="resource-text">{{ app.memory }}%</span>
              </div>
            </div>
            
            <div class="col-created">
              <span class="created-time">{{ formatTime(app.createdAt) }}</span>
            </div>
            
            <div class="col-actions">
              <div class="action-buttons">
                <a
                  v-if="app.status === 'stopped'"
                  href="#"
                  class="action-link primary"
                  @click.prevent="startApplication(app)"
                >
                  启动
                </a>
                <a
                  href="#"
                  class="action-link"
                  @click.prevent="showApplicationDetail(app)"
                >
                  详情
                </a>
                <n-dropdown
                  :options="getMoreActions(app)"
                  @select="handleMoreAction"
                  trigger="click"
                >
                  <a href="#" class="action-link">
                    <n-icon size="16"><EllipsisHorizontal /></n-icon>
                  </a>
                </n-dropdown>
              </div>
            </div>
          </div>
          </div>

          <!-- 分页组件 -->
          <div class="pagination-section" v-if="totalCount > pageSize">
            <n-pagination
              v-model:page="currentPage"
              :page-count="Math.ceil(totalCount / pageSize)"
              :page-size="pageSize"
              :show-size-picker="true"
              :page-sizes="[10, 20, 50]"
              :show-quick-jumper="true"
              @update:page-size="pageSize = $event"
            />
          </div>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { Add, Search, EllipsisHorizontal } from '@vicons/ionicons5'

const router = useRouter()
const message = useMessage()

const searchQuery = ref('')
const sortField = ref('')
const sortOrder = ref('asc')
const currentPage = ref(1)
const pageSize = ref(10)

// 模拟应用数据
const applications = ref([
  {
    id: '1',
    name: 'web-frontend',
    type: 'Vue.js',
    status: 'running',
    cpu: 15,
    memory: 32,
    createdAt: '2025-08-29T17:34:00Z',
    starting: false
  },
  {
    id: '2', 
    name: 'api-backend',
    type: 'Java',
    status: 'running',
    cpu: 45,
    memory: 68,
    createdAt: '2025-08-29T16:43:00Z',
    starting: false
  },
  {
    id: '3',
    name: 'nginx-proxy',
    type: 'Nginx',
    status: 'stopped',
    cpu: 0,
    memory: 0,
    createdAt: '2025-08-28T14:22:00Z',
    starting: false
  }
])

// 过滤和排序后的应用列表
const filteredAndSortedApplications = computed(() => {
  let filtered = applications.value.filter(app => {
    const matchesSearch = !searchQuery.value ||
      app.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchesSearch
  })

  // 排序
  if (sortField.value) {
    filtered.sort((a, b) => {
      let aValue = a[sortField.value]
      let bValue = b[sortField.value]

      // 处理特殊字段
      if (sortField.value === 'createdAt') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortOrder.value === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }

  return filtered
})

// 分页后的应用列表
const paginatedApplications = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredAndSortedApplications.value.slice(start, end)
})

// 总数据量
const totalCount = computed(() => filteredAndSortedApplications.value.length)



// 获取状态类型
const getStatusType = (status: string) => {
  const types = {
    'running': 'success',
    'stopped': 'default',
    'deploying': 'info',
    'error': 'error'
  }
  return types[status] || 'default'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const texts = {
    'running': '运行中',
    'stopped': '已停机',
    'deploying': '部署中',
    'error': '异常'
  }
  return texts[status] || status
}

// 获取资源使用率颜色
const getResourceColor = (percentage: number) => {
  if (percentage < 50) return '#52c41a'
  if (percentage < 80) return '#faad14'
  return '#ff4d4f'
}

// 格式化时间
const formatTime = (timeStr: string) => {
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 启动应用
const startApplication = async (app: any) => {
  app.starting = true
  try {
    // 这里将来调用实际的API启动应用
    await new Promise(resolve => setTimeout(resolve, 2000))
    app.status = 'running'
    app.cpu = Math.floor(Math.random() * 50) + 10
    app.memory = Math.floor(Math.random() * 60) + 20
    message.success(`应用 ${app.name} 启动成功`)
  } catch (error: any) {
    message.error(error.message || '启动应用失败')
  } finally {
    app.starting = false
  }
}

// 查看应用详情
const showApplicationDetail = (app: any) => {
  message.info(`应用详情功能开发中...`)
}

// 获取更多操作选项
const getMoreActions = (app: any) => [
  {
    label: '编辑配置',
    key: 'edit'
  },
  {
    label: '查看日志',
    key: 'logs'
  },
  {
    label: '重新部署',
    key: 'redeploy'
  }
]

// 处理更多操作
const handleMoreAction = (key: string) => {
  message.info(`${key} 功能开发中...`)
}



// 处理排序
const handleSort = (field: string) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'asc'
  }
  // 排序后重置到第一页
  currentPage.value = 1
}

// 监听搜索查询变化，重置到第一页
watch(searchQuery, () => {
  currentPage.value = 1
})

// 跳转到部署页面
const goToDeployPage = () => {
  router.push({ name: 'TemplateSelection' })
}


</script>

<style scoped>
.application-manager {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  background: #ffffff;
  min-height: 100vh;
}

/* 页面头部样式 - 与WorkspaceHome保持一致 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding: 0 4px;
}

.header-content h1.page-title {
  margin: 0 0 8px 0;
}

.header-content .page-subtitle {
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 列表区域样式 */
.applications-section {
  margin-bottom: 24px;
}

/* 搜索和操作区域样式 */
.search-section {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 分页区域样式 */
.pagination-section {
  margin-top: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 按钮样式覆盖 */
.search-section .n-button--primary-type,
.n-button--primary-type {
  border: none !important;
  border-color: transparent !important;
}

.search-section .n-button--primary-type:hover,
.n-button--primary-type:hover {
  border: none !important;
  border-color: transparent !important;
}

.search-section .n-button--primary-type:focus,
.n-button--primary-type:focus {
  border: none !important;
  border-color: transparent !important;
  box-shadow: none !important;
}



/* 表格容器样式 */
.table-container {
  background: #FFFFFF;
  width: 100%;
}

.table-header {
  display: grid;
  grid-template-columns: 180px 80px 200px 200px 150px 120px;
  gap: 32px;
  padding: 16px 0 16px 24px;
  background: #FFFFFF;
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  border-bottom: 1px solid #F0F0F0;
}

.table-header > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: color 0.2s ease;
}

.table-header > div:hover {
  color: #666666;
}

.table-header .col-actions {
  cursor: default;
}

.table-header .col-actions:hover {
  color: #8C8C8C;
}

.sort-icon {
  font-size: 12px;
  color: #D9D9D9;
  transition: all 0.2s ease;
}

.sort-icon.active {
  color: #8C8C8C;
}

.table-body {
  background: #FFFFFF;
}

.table-row {
  display: grid;
  grid-template-columns: 180px 80px 200px 200px 150px 120px;
  gap: 32px;
  padding: 16px 0 16px 24px;
  transition: all 0.2s ease;
  align-items: center;
  min-height: 60px;
  background: #FFFFFF;
  border-bottom: 1px solid #F5F5F5;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background: #F8F9FA;
}

/* 确保所有列都左对齐 */
.col-name,
.col-status,
.col-created,
.col-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

/* CPU和内存列需要特殊处理，让进度条占满宽度 */
.col-cpu,
.col-memory {
  display: block;
}

/* 应用信息 */
.app-info {
  display: flex;
  align-items: center;
}

.app-details {
  flex: 1;
}

.app-name {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: 2px;
  line-height: var(--line-height-normal);
}

.app-type {
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
  line-height: var(--line-height-normal);
}

/* 状态指示器 */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.status-running {
  background-color: #52C41A;
}

.status-dot.status-stopped {
  background-color: #BFBFBF;
}

.status-dot.status-deploying {
  background-color: #1890FF;
}

.status-dot.status-error {
  background-color: #FF4D4F;
}

.status-text {
  font-size: var(--font-size-caption);
  color: var(--text-primary);
  font-weight: var(--font-weight-regular);
}

/* 状态标签 */
.status-tag {
  font-weight: 500;
  border-radius: 6px;
}

/* 资源使用率 */
.resource-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.resource-info-horizontal {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.resource-text {
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-regular);
  color: var(--text-primary);
  text-align: left;
  min-width: 40px;
  flex-shrink: 0;
}

/* 创建时间 */
.created-time {
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
}

.action-link {
  font-size: var(--font-size-small);
  color: #1890FF;
  text-decoration: none;
  font-weight: var(--font-weight-regular);
  transition: color 0.2s ease;
  cursor: pointer;
  padding: 2px 4px;
}

.action-link:hover {
  color: #40a9ff;
  text-decoration: underline;
}

.action-link.primary {
  color: #1890FF;
  font-weight: var(--font-weight-regular);
}

.action-link.primary:hover {
  color: #40a9ff;
  text-decoration: underline;
}

/* 空状态 */
.empty-state {
  grid-column: 1 / -1;
  padding: 60px 20px;
  text-align: center;
}

.empty-content {
  max-width: 300px;
  margin: 0 auto;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 8px;
}

.empty-description {
  font-size: 14px;
  color: #86868b;
  line-height: 1.5;
}



/* 响应式设计 */
@media (max-width: 768px) {
  .application-manager {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .search-section {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .search-section .n-input {
    width: 100% !important;
  }

  .pagination-section {
    margin-top: 16px;
  }
  
  .table-header {
    padding: 16px 20px 16px 32px;
    gap: 24px;
  }

  .table-row {
    grid-template-columns: 120px 60px 110px 110px 110px 70px;
    gap: 24px;
    padding: 16px 20px 16px 32px;
    font-size: 12px;
    min-height: 60px;
  }

  .sort-icon {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .table-header,
  .table-row {
    grid-template-columns: 1fr 60px 80px;
    gap: 16px;
    padding: 16px 12px 16px 20px;
    min-height: 64px;
  }

  .col-cpu,
  .col-memory,
  .col-created {
    display: none;
  }

  .action-buttons {
    flex-direction: column;
    gap: 8px;
  }

  .app-name {
    font-size: var(--font-size-body);
  }

  .app-type {
    font-size: var(--font-size-small);
  }

  .action-link {
    font-size: var(--font-size-small);
  }
}
</style>
