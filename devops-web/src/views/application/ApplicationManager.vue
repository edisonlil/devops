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

        <div class="action-buttons">
          <n-button @click="loadApplications" :loading="loading">
            <template #icon>
              <n-icon><Search /></n-icon>
            </template>
            刷新
          </n-button>

          <n-button type="primary" @click="goToDeployPage">
            <template #icon>
              <n-icon><Add /></n-icon>
            </template>
            部署应用
          </n-button>
        </div>
      </div>

      <div class="application-list">
        <!-- 刷新时显示进度条 -->
        <div v-if="loading && applications.length > 0" class="loading-bar">
          <n-progress type="line" :percentage="100" :show-indicator="false" processing />
          <span class="loading-text">正在刷新应用列表...</span>
        </div>

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
            <div class="col-status" @click="handleSort('type')">
              <span>类型</span>
              <n-icon class="sort-icon" :class="{ active: sortField === 'type' }">
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

          <!-- 首次加载且无数据时显示加载状态 -->
          <div v-if="loading && applications.length === 0" class="empty-state">
            <div class="empty-content">
              <div class="empty-icon">⏳</div>
              <div class="empty-title">加载中...</div>
              <div class="empty-description">正在获取应用列表</div>
            </div>
          </div>

          <!-- 无应用时显示空状态 -->
          <div v-else-if="!loading && paginatedApplications.length === 0" class="empty-state">
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
                <div class="status-dot" :class="getStatusClass(app)"></div>
                <span class="status-text">{{ getStatusText(app) }}</span>
                <n-spin v-if="app.starting || app.stopping" size="small" style="margin-left: 8px;" />
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
                  @select="(key) => handleMoreAction(key, app)"
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

    <!-- 配置编辑模态框 -->
    <n-modal v-model:show="showConfigEditor" preset="card" style="width: 80%; max-width: 1000px;" title="编辑应用配置">
      <template #header>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span>编辑应用配置 - {{ editingApp?.name }}</span>
          <n-tag v-if="editingApp" type="info" size="small">{{ editingApp.platform }}</n-tag>
        </div>
      </template>

      <div v-if="configLoading" style="text-align: center; padding: 40px;">
        <n-spin size="large" />
        <div style="margin-top: 16px;">正在加载配置文件...</div>
      </div>

      <div v-else>
        <!-- 配置编辑器 -->
        <div style="margin-bottom: 16px;">
          <ConfigEditor
            v-model="configContent"
            :platform="getPlatformType(editingApp?.platform)"
            height="500px"
            theme="vs-dark"
          />
        </div>

        <!-- 自动重新部署选项 -->
        <div style="margin-bottom: 16px;">
          <n-checkbox v-model="autoRedeploy">
            保存后自动重新部署应用
          </n-checkbox>
          <div style="margin-top: 4px; font-size: 12px; color: var(--text-secondary);">
            勾选此选项将在保存配置后自动重新部署应用，确保新配置生效
          </div>
        </div>
      </div>

      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <n-button @click="handleCancelEditConfig">取消</n-button>
          <n-button type="primary" @click="handleSaveConfig" :loading="configLoading" :disabled="configLoading">
            保存配置
          </n-button>
        </div>
      </template>
    </n-modal>

    <!-- 日志查看模态框 -->
    <n-modal
      v-model:show="showLogModal"
      preset="card"
      :title="`${currentLogApp?.name || ''} - 应用日志`"
      style="width: 95%; max-width: 1400px; height: 85vh;"
      :mask-closable="false"
      class="log-modal"
    >
      <template #header-extra>
        <div style="display: flex; gap: 12px; align-items: center;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 12px; color: #666;">显示行数:</span>
            <n-input-number
              v-model="logLines"
              :min="10"
              :max="1000"
              :step="50"
              size="small"
              style="width: 90px;"
              placeholder="行数"
            />
          </div>
          <n-button
            size="small"
            @click="toggleAutoRefresh"
            :type="autoRefresh ? 'primary' : 'default'"
          >
            {{ autoRefresh ? '自动刷新' : '手动刷新' }}
          </n-button>
          <n-button size="small" @click="refreshLogs" :loading="logLoading" type="primary">
            <template #icon>
              <n-icon><svg viewBox="0 0 24 24"><path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg></n-icon>
            </template>
            刷新日志
          </n-button>
          <n-button size="small" @click="scrollToBottom">
            滚动到底部
          </n-button>
          <n-button size="small" @click="downloadLogs">
            下载日志
          </n-button>
        </div>
      </template>

      <!-- 日志搜索和过滤栏 -->
      <div style="padding: 8px 0; border-bottom: 1px solid #333; display: flex; gap: 12px; align-items: center; margin-bottom: 16px;">
        <n-input
          v-model:value="logSearchQuery"
          placeholder="搜索日志内容..."
          size="small"
          clearable
          style="max-width: 300px;"
        >
          <template #prefix>
            <n-icon><svg viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14z"/></svg></n-icon>
          </template>
        </n-input>

        <!-- 日志级别过滤 -->
        <n-select
          v-model:value="logLevelFilter"
          placeholder="日志级别"
          size="small"
          clearable
          style="width: 120px;"
          :options="logLevelOptions"
        />

        <!-- 搜索结果统计 -->
        <span v-if="logSearchQuery && filteredLogStats.total > 0" style="font-size: 12px; color: #666;">
          找到 {{ filteredLogStats.matches }} 行，共 {{ filteredLogStats.total }} 行
        </span>
        <span v-else-if="logSearchQuery && filteredLogStats.total === 0" style="font-size: 12px; color: #f56c6c;">
          未找到匹配内容
        </span>
      </div>

      <!-- 日志容器 -->
      <div class="logs-container">
        <n-spin :show="logLoading" style="height: 100%;">
          <div
            ref="logContainer"
            class="log-content"
            @scroll="handleLogScroll"
          >
            <div v-if="!filteredLogContent || filteredLogContent.trim() === ''" class="empty-logs">
              暂无日志内容
            </div>
            <pre v-else class="log-text">{{ filteredLogContent }}</pre>
          </div>
        </n-spin>
      </div>

      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="color: #666; font-size: 12px;">
            显示最近 {{ logLines }} 行日志
            <span v-if="lastUpdateTime" style="margin-left: 16px;">
              最后更新: {{ lastUpdateTime }}
            </span>
            <span v-if="autoRefresh" style="margin-left: 8px; color: #18a058;">
              (自动刷新中)
            </span>
          </div>
          <div style="display: flex; gap: 8px;">
            <n-button @click="closeLogModal">关闭</n-button>
          </div>
        </div>
      </template>
    </n-modal>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage, useDialog } from 'naive-ui'
import { applicationApi } from '../../api/applications'
import { Add, Search, EllipsisHorizontal } from '@vicons/ionicons5'
import ConfigEditor from '../../components/ConfigEditor.vue'


const router = useRouter()
const route = useRoute()
const message = useMessage()
const dialog = useDialog()

const searchQuery = ref('')
const sortField = ref('')
const sortOrder = ref('asc')
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)

// 配置编辑相关
const showConfigEditor = ref(false)
const editingApp = ref<any>(null)
const configContent = ref('')
const configLoading = ref(false)
const autoRedeploy = ref(false)

// 当前工作空间
const currentWorkspace = computed(() => route.params.workspaceName as string)

// 应用数据
const applications = ref([])

// 获取应用列表
const loadApplications = async () => {
  if (!currentWorkspace.value) return

  loading.value = true
  try {
    const response = await applicationApi.getApplications(currentWorkspace.value)

    // 检查响应数据结构
    console.log('API响应:', response)

    // 将后端数据转换为前端格式
    let apps = []
    const responseData = response.data as any
    console.log('响应数据结构:', responseData)

    // 处理嵌套的data结构
    if (responseData?.data?.applications) {
      apps = responseData.data.applications
      console.log('使用 response.data.data.applications:', apps)
    } else if (responseData?.applications) {
      apps = responseData.applications
      console.log('使用 response.data.applications:', apps)
    } else if (Array.isArray(responseData?.data)) {
      apps = responseData.data
      console.log('使用 response.data.data:', apps)
    } else if (Array.isArray(responseData)) {
      apps = responseData
      console.log('使用 response.data:', apps)
    } else {
      console.warn('未知的响应数据格式:', responseData)
      apps = []
    }

    applications.value = apps.map((app: any) => ({
      id: app.name, // 使用name作为id
      name: app.name,
      type: app.platform || 'Unknown', // 显示平台类型
      status: mapStatus(app.status), // 映射状态
      cpu: app.cpu || 0, // 显示实际CPU使用率，获取不到时显示0
      memory: app.memory || 0, // 显示实际内存使用率，获取不到时显示0
      createdAt: app.createdAt || new Date().toISOString(),
      starting: false,
      stopping: false,
      // 保存原始数据用于操作
      _original: app
    }))

    console.log(`加载了 ${applications.value.length} 个应用`)
  } catch (error: any) {
    console.error('获取应用列表失败:', error)

    // 更详细的错误信息
    if (error.response) {
      console.error('响应状态:', error.response.status)
      console.error('响应数据:', error.response.data)
      message.error(`获取应用列表失败: ${error.response.data?.message || error.message}`)
    } else if (error.request) {
      console.error('请求失败:', error.request)
      message.error('网络请求失败，请检查网络连接')
    } else {
      console.error('错误:', error.message)
      message.error(error.message || '获取应用列表失败')
    }
  } finally {
    loading.value = false
  }
}

// 从镜像名提取应用类型
const extractTypeFromImage = (image: string) => {
  if (!image) return 'Unknown'

  const imageName = image.toLowerCase()
  if (imageName.includes('nginx')) return 'Nginx'
  if (imageName.includes('node')) return 'Node.js'
  if (imageName.includes('java') || imageName.includes('openjdk')) return 'Java'
  if (imageName.includes('python')) return 'Python'
  if (imageName.includes('mysql')) return 'MySQL'
  if (imageName.includes('postgres')) return 'PostgreSQL'
  if (imageName.includes('redis')) return 'Redis'
  if (imageName.includes('mongo')) return 'MongoDB'

  // 从镜像名提取第一部分作为类型
  const parts = image.split(':')[0].split('/')
  return parts[parts.length - 1] || 'Unknown'
}

// 映射状态
const mapStatus = (backendStatus: string) => {
  const statusMap: Record<string, string> = {
    'running': 'running',
    'stopped': 'stopped',
    'error': 'error',
    'pending': 'deploying',
    'unknown': 'stopped'
  }
  return statusMap[backendStatus] || 'stopped'
}

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

// 获取状态样式类
const getStatusClass = (app: any) => {
  if (app.starting) return 'status-deploying'
  if (app.stopping) return 'status-stopping'
  return `status-${app.status}`
}

// 获取状态文本
const getStatusText = (app: any) => {
  if (app.starting) return '启动中'
  if (app.stopping) return '停止中'

  const texts = {
    'running': '运行中',
    'stopped': '已停机',
    'deploying': '部署中',
    'error': '异常'
  }
  return texts[app.status] || app.status
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
    await applicationApi.executeAction(
      currentWorkspace.value,
      app.name,
      'start'
    )

    // 刷新应用状态
    setTimeout(() => {
      loadApplications()
    }, 1000)

    message.success(`应用 ${app.name} 启动成功`)
  } catch (error: any) {
    console.error('启动应用失败:', error)
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
const getMoreActions = (app: any) => {
  const actions = [
    {
      label: '查看日志',
      key: 'logs'
    }
  ]

  // 根据应用状态添加不同操作
  if (app.status === 'running') {
    actions.push({
      label: '停止应用',
      key: 'stop'
    })
    actions.push({
      label: '滚动刷新 (保持配置，零停机)',
      key: 'restart'
    })
  }

  actions.push({
    label: '编辑配置',
    key: 'edit'
  })

  actions.push({
    label: '重新启动 (重读配置文件)',
    key: 'redeploy'
  })

  return actions
}

// 编辑配置
const handleEditConfig = async (app: any) => {
  try {
    editingApp.value = app
    configLoading.value = true
    showConfigEditor.value = true

    const response = await applicationApi.getApplicationConfig(
      currentWorkspace.value,
      app.name
    )

    console.log('API响应:', response)
    console.log('响应数据:', response.data)
    console.log('嵌套数据:', (response.data as any).data)
    console.log('配置内容:', (response.data as any).data?.content)

    // 因为后端返回的格式是 { success: true, data: { content: "...", filePath: "..." } }
    // 而axios返回的是完整的response，所以需要访问 response.data.data.content
    configContent.value = response.data.data?.content || ''
  } catch (error: any) {
    console.error('获取配置失败:', error)
    message.error(error.message || '获取配置失败')
    showConfigEditor.value = false
  } finally {
    configLoading.value = false
  }
}

// 保存配置
const handleSaveConfig = async () => {
  try {
    configLoading.value = true

    const response = await applicationApi.saveApplicationConfig(
      currentWorkspace.value,
      editingApp.value.name,
      configContent.value,
      autoRedeploy.value
    )

    if (response.data.data.saved) {
      message.success(`配置保存成功${response.data.data.redeployed ? '，应用已重新部署' : ''}`)
      showConfigEditor.value = false

      if (response.data.data.redeployed) {
        // 如果重新部署了，刷新应用列表
        setTimeout(() => {
          loadApplications()
        }, 1000)
      }
    }
  } catch (error: any) {
    console.error('保存配置失败:', error)
    message.error(error.message || '保存配置失败')
  } finally {
    configLoading.value = false
  }
}

// 取消编辑配置
const handleCancelEditConfig = () => {
  showConfigEditor.value = false
  editingApp.value = null
  configContent.value = ''
  autoRedeploy.value = false
}

// 根据平台获取编辑器类型
const getPlatformType = (platform: string) => {
  if (!platform) return 'kubernetes'

  const platformLower = platform.toLowerCase()
  if (platformLower.includes('docker') && platformLower.includes('compose')) {
    return 'docker-compose'
  } else if (platformLower.includes('kubernetes') || platformLower.includes('k8s')) {
    return 'kubernetes'
  } else {
    return 'kubernetes' // 默认使用Kubernetes语法
  }
}

// 处理更多操作
const handleMoreAction = async (key: string, app: any) => {
  try {
    switch (key) {
      case 'logs':
        await handleViewLogs(app)
        break
      case 'stop':
        await handleStopApplication(app)
        break
      case 'restart':
        await handleRestartApplication(app)
        break
      case 'redeploy':
        await handleRedeployApplication(app)
        break
      case 'edit':
        await handleEditConfig(app)
        break
      default:
        message.info(`${key} 功能开发中...`)
    }
  } catch (error: any) {
    console.error('操作失败:', error)
    message.error(error.message || '操作失败')
  }
}

// 停止应用
const handleStopApplication = async (app: any) => {
  // 显示确认对话框
  const confirmed = await new Promise((resolve) => {
    dialog.warning({
      title: '确认停止应用',
      content: `确定要停止应用 "${app.name}" 吗？停止后应用将无法访问，直到重新启动。`,
      positiveText: '确认停止',
      negativeText: '取消',
      onPositiveClick: () => {
        resolve(true)
      },
      onNegativeClick: () => {
        resolve(false)
      }
    })
  })

  if (!confirmed) {
    return
  }

  try {
    // 设置应用为停止中状态
    app.stopping = true

    const response = await applicationApi.executeAction(
      currentWorkspace.value,
      app.name,
      'stop'
    )

    if (response.data.success) {
      message.success(`应用 ${app.name} 停止成功`)

      // 延迟刷新应用列表，让用户看到状态变化
      setTimeout(() => {
        loadApplications()
      }, 1500)
    } else {
      message.error(`应用 ${app.name} 停止失败`)
    }
  } catch (error: any) {
    console.error('停止应用失败:', error)
    message.error(error.message || `停止应用 ${app.name} 失败`)
  } finally {
    app.stopping = false
  }
}

// 重启应用
const handleRestartApplication = async (app: any) => {
  await applicationApi.executeAction(
    currentWorkspace.value,
    app.name,
    'restart'
  )

  setTimeout(() => {
    loadApplications()
  }, 1000)

  message.success(`应用 ${app.name} 已重启`)
}

// 日志相关状态
const showLogModal = ref(false)
const currentLogApp = ref<any>(null)
const logContent = ref('')
const logLoading = ref(false)
const logLines = ref(100)
const autoRefresh = ref(true)
const logContainer = ref<HTMLElement>()
const refreshInterval = ref<any>(null)
const lastUpdateTime = ref('')
const logRef = ref()
const logSearchQuery = ref('')
const logLevelFilter = ref('')

// 日志级别选项
const logLevelOptions = [
  { label: 'ERROR', value: 'ERROR' },
  { label: 'WARN', value: 'WARN' },
  { label: 'INFO', value: 'INFO' },
  { label: 'DEBUG', value: 'DEBUG' },
  { label: 'TRACE', value: 'TRACE' }
]

// 过滤后的日志内容
const filteredLogContent = computed(() => {
  if (!logContent.value) return '暂无日志内容'

  // 按行分割日志内容
  const lines = logContent.value.split('\n')
  let filteredLines = lines

  // 日志级别过滤
  if (logLevelFilter.value) {
    filteredLines = filteredLines.filter(line =>
      line.includes(logLevelFilter.value)
    )
  }

  // 搜索关键词过滤
  if (logSearchQuery.value) {
    const query = logSearchQuery.value.toLowerCase()
    filteredLines = filteredLines.filter(line =>
      line.toLowerCase().includes(query)
    )
  }

  if (filteredLines.length === 0) {
    if (logSearchQuery.value && logLevelFilter.value) {
      return `未找到包含 "${logSearchQuery.value}" 且级别为 "${logLevelFilter.value}" 的日志内容`
    } else if (logSearchQuery.value) {
      return `未找到包含 "${logSearchQuery.value}" 的日志内容`
    } else if (logLevelFilter.value) {
      return `未找到级别为 "${logLevelFilter.value}" 的日志内容`
    }
  }

  return filteredLines.join('\n')
})

// 日志统计信息
const filteredLogStats = computed(() => {
  if (!logContent.value) return { total: 0, matches: 0 }

  const totalLines = logContent.value.split('\n').length
  const filteredLines = filteredLogContent.value.split('\n').length

  return {
    total: totalLines,
    matches: filteredLines
  }
})

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (logRef.value) {
      try {
        // 使用 n-log 组件的 scrollTo 方法
        logRef.value.scrollTo({ position: 'bottom', silent: false })
      } catch (error) {
        console.warn('滚动到底部失败:', error)
      }
    }
  })
}

// 日志滚动事件处理
const handleLogScroll = (event: Event) => {
  const target = event.target as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = target

  // 检查是否滚动到顶部
  if (scrollTop === 0) {
    console.log('日志已滚动到顶部')
  }

  // 检查是否滚动到底部
  if (scrollTop + clientHeight >= scrollHeight - 1) {
    console.log('日志已滚动到底部')
  }
}

const handleLogReachBottom = () => {
  console.log('日志已滚动到底部')
}

const handleLogReachTop = () => {
  console.log('日志已滚动到顶部')
}

// 自动滚动到底部
const scrollLogToBottom = () => {
  if (logContainer.value) {
    setTimeout(() => {
      if (logContainer.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight
      }
    }, 100)
  }
}

// 开始自动刷新
const startAutoRefresh = () => {
  stopAutoRefresh()

  if (autoRefresh.value && currentLogApp.value) {
    console.log('启动自动刷新定时器，应用:', currentLogApp.value.name)
    refreshInterval.value = setInterval(() => {
      if (showLogModal.value && currentLogApp.value && !logLoading.value) {
        console.log('执行自动刷新，应用:', currentLogApp.value.name)
        handleViewLogs(currentLogApp.value, false) // 静默刷新
      }
    }, 3000) // 每3秒刷新一次
  } else {
    console.log('未启动自动刷新，autoRefresh:', autoRefresh.value, 'currentLogApp:', currentLogApp.value?.name)
  }
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
}

// 查看日志
const handleViewLogs = async (app: any, showModal = true) => {
  try {
    console.log('开始查看日志:', app.name)
    currentLogApp.value = app
    if (showModal) {
      showLogModal.value = true
      console.log('设置模态框显示状态:', showLogModal.value)
      logContent.value = ''
    }

    // 静默刷新时不显示加载状态，避免闪烁
    if (showModal) {
      logLoading.value = true
    }

    const response = await applicationApi.getApplicationLogs(
      currentWorkspace.value,
      app.name,
      logLines.value
    )

    let newLogContent = ''
    // 处理不同的响应格式
    if (response.data.success !== undefined) {
      // 新的响应格式: { success: boolean, data: {...} }
      if (response.data.success) {
        newLogContent = response.data.data?.logs || response.data.logs || '暂无日志内容'
      } else {
        throw new Error(response.data.error || '获取日志失败')
      }
    } else {
      // 旧的响应格式: { logs: string, lines: number }
      newLogContent = response.data.logs || '暂无日志内容'
    }

    // 只有内容真正变化时才更新，避免不必要的重绘
    if (logContent.value !== newLogContent) {
      logContent.value = newLogContent

      // 更新最后更新时间
      lastUpdateTime.value = new Date().toLocaleTimeString()

      // 滚动到底部（延迟执行，确保DOM更新完成）
      nextTick(() => {
        scrollLogToBottom()
      })
    }

    // 开始自动刷新（仅在首次打开时）
    if (showModal && showLogModal.value) {
      startAutoRefresh()
    }
  } catch (error: any) {
    console.error('获取日志失败:', error)
    message.error(error.message || '获取日志失败')
    logContent.value = '获取日志失败: ' + (error.message || '未知错误')
  } finally {
    logLoading.value = false
  }
}

// 刷新日志
const refreshLogs = async () => {
  if (!currentLogApp.value) return
  await handleViewLogs(currentLogApp.value, false)
}

// 切换自动刷新
const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value
  console.log('切换自动刷新状态:', autoRefresh.value)
  if (autoRefresh.value) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

// 下载日志
const downloadLogs = () => {
  if (!logContent.value || !currentLogApp.value) return

  const blob = new Blob([logContent.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${currentLogApp.value.name}-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 关闭日志模态框
const closeLogModal = () => {
  showLogModal.value = false
  currentLogApp.value = null
  logContent.value = ''
  stopAutoRefresh()
}

// 重新启动应用
const handleRedeployApplication = async (app: any) => {
  try {
    await applicationApi.executeAction(
      currentWorkspace.value,
      app.name,
      'redeploy'
    )

    setTimeout(() => {
      loadApplications()
    }, 1000)

    message.success(`应用 ${app.name} 重新启动成功`)
  } catch (error: any) {
    console.error('重新启动应用失败:', error)
    message.error(error.message || '重新启动应用失败')
  }
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

// 监听日志模态框状态变化
watch(showLogModal, (newValue) => {
  if (!newValue) {
    // 模态框关闭时停止自动刷新
    stopAutoRefresh()
    currentLogApp.value = null
    logContent.value = ''
  }
})

// 组件卸载时清理定时器
onUnmounted(() => {
  stopAutoRefresh()
})

// 跳转到部署页面
const goToDeployPage = () => {
  router.push({ name: 'TemplateSelection' })
}

// 页面挂载时加载数据
onMounted(() => {
  loadApplications()
})

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

/* 操作按钮组样式 */
.action-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* 加载进度条样式 */
.loading-bar {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.loading-text {
  display: block;
  margin-top: 8px;
  font-size: var(--font-size-small);
  color: var(--text-secondary);
  text-align: center;
}

/* 分页区域样式 */
.pagination-section {
  margin-top: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 确保按钮无边框 */
.n-button--primary-type .n-button__border,
.n-button--primary-type .n-button__state-border {
  display: none !important;
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

.status-dot.status-stopping {
  background-color: #FA8C16;
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






/* 日志容器样式 - 完全参考 CI/CD 实现 */
.logs-container {
  background: #1F2937;
  border-radius: 8px;
  padding: 16px;
  height: calc(85vh - 200px);
  min-height: 450px;
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
}

.log-content {
  height: 100%;
}

.log-text {
  color: #F9FAFB;
  margin: 0;
  padding: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  background: transparent;
}

.empty-logs {
  color: #9CA3AF;
  text-align: center;
  padding: 32px;
  font-style: italic;
}


</style>
