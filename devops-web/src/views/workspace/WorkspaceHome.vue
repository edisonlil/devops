<template>
  <div class="workspace-home">
    <!-- 顶部导航栏 -->
    <div class="top-nav">
      <div class="nav-left">
        <ProfessionalLogo />
        <!-- 工作空间切换 -->
        <div class="workspace-dropdown">
          <n-dropdown
            :options="workspaceDropdownOptions"
            @select="handleWorkspaceSelect"
            trigger="click"
            placement="bottom-start"
          >
            <div class="workspace-trigger">
              <n-icon size="18" color="#52c41a">
                <CheckmarkCircle />
              </n-icon>
              <span class="workspace-name">{{ currentWorkspaceName }}</span>
              <n-icon size="14" color="#8c8c8c">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </n-icon>
            </div>
          </n-dropdown>
        </div>
      </div>
      <div class="nav-right">
        <!-- 统计指标 -->
        <div class="nav-stats">
          <div class="nav-stat-item">
            <span class="nav-stat-value">{{ totalResources }}</span>
            <span class="nav-stat-label">总资源</span>
          </div>
          <div class="nav-stat-item">
            <span class="nav-stat-value">{{ runningServices }}</span>
            <span class="nav-stat-label">运行中</span>
          </div>
          <div class="nav-stat-item">
            <span class="nav-stat-value">¥{{ monthlyBill }}</span>
            <span class="nav-stat-label">本月账单</span>
          </div>
        </div>

        <!-- 功能按钮 -->
        <div class="nav-actions">
          <n-button text size="small" @click="showDocs">文档</n-button>
          <n-button text size="small" @click="showNotifications">
            <template #icon>
              <n-icon><Notifications /></n-icon>
            </template>
          </n-button>
        </div>
        <n-avatar size="small" :src="userAvatar" />
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 页面标题区域 -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">控制台</h1>
          <p class="page-subtitle">管理您的 DevOps 资源和服务</p>
        </div>
      </div>

      <!-- 功能卡片网格 -->
      <div class="function-grid">
        <FunctionCard
          v-for="func in functions"
          :key="func.id"
          :title="func.title"
          :description="func.description"
          :icon="func.icon"
          :enabled="func.enabled"
          :status="func.status"
          :stats="func.stats"
          @click="handleFunctionClick(func)"
        />
      </div>
    </div>



    <!-- 创建工作空间对话框 -->
    <n-modal v-model:show="showCreateDialog">
      <n-card title="创建工作空间" style="width: 500px">
        <n-form ref="createFormRef" :model="createForm" :rules="createRules">
          <n-form-item label="工作空间名称" path="name">
            <n-input v-model:value="createForm.name" placeholder="production" />
          </n-form-item>
          <n-form-item label="显示名称" path="displayName">
            <n-input v-model:value="createForm.displayName" placeholder="生产环境" />
          </n-form-item>
          <n-form-item label="描述" path="description">
            <n-input
              v-model:value="createForm.description"
              type="textarea"
              placeholder="工作空间描述..."
            />
          </n-form-item>
        </n-form>

        <template #footer>
          <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <n-button @click="showCreateDialog = false">取消</n-button>
            <n-button type="primary" @click="createWorkspace" :loading="creating">创建</n-button>
          </div>
        </template>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { Notifications, CheckmarkCircle } from '@vicons/ionicons5'
import { useWorkspaceStore } from '@/stores/workspace'
import ProfessionalLogo from '@/components/common/ProfessionalLogo.vue'
import FunctionCard from '@/components/common/FunctionCard.vue'

const router = useRouter()
const message = useMessage()
const workspaceStore = useWorkspaceStore()

const userAvatar = ref('/default-avatar.png')
const showCreateDialog = ref(false)
const creating = ref(false)

// 统计数据
const totalResources = ref(24)
const runningServices = ref(8)
const monthlyBill = ref(156.80)

const createForm = ref({
  name: '',
  displayName: '',
  description: ''
})

const createRules = {
  name: { required: true, message: '请输入工作空间名称' },
  displayName: { required: true, message: '请输入显示名称' }
}

const currentWorkspace = computed({
  get: () => workspaceStore.currentWorkspace,
  set: (value: string) => workspaceStore.switchWorkspace(value)
})

const currentWorkspaceName = computed(() => {
  const workspace = workspaceStore.workspaces.find(w => w.name === workspaceStore.currentWorkspace)
  return workspace?.displayName || 'My Workspace'
})

const workspaceOptions = computed(() => workspaceStore.workspaceOptions)

// 工作空间下拉菜单选项
const workspaceDropdownOptions = computed(() => [
  ...workspaceStore.workspaces.map(workspace => ({
    label: workspace.displayName,
    key: workspace.name,
    icon: () => h('div', {
      style: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: workspace.name === workspaceStore.currentWorkspace ? '#52c41a' : '#d9d9d9'
      }
    })
  })),
  { type: 'divider' },
  {
    label: '创建工作空间',
    key: 'create',
    icon: () => h('svg', {
      viewBox: '0 0 24 24',
      fill: 'currentColor',
      style: { width: '14px', height: '14px' }
    }, [
      h('path', { d: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z' })
    ])
  },
  {
    label: '管理工作空间',
    key: 'manage',
    icon: () => h('svg', {
      viewBox: '0 0 24 24',
      fill: 'currentColor',
      style: { width: '14px', height: '14px' }
    }, [
      h('path', { d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' })
    ])
  }
])

// 可用模块配置
const availableModules = computed(() => [
  {
    id: 'devbox',
    name: 'DevBox',
    description: '开发环境',
    icon: '🔧',
    route: 'devbox',
    enabled: false // 暂未实现
  },
  {
    id: 'app-store',
    name: '应用商店',
    description: '应用市场',
    icon: '📧',
    route: 'app-store',
    enabled: false // 暂未实现
  },
  {
    id: 'database',
    name: '数据库',
    description: '数据库服务',
    icon: '🗄️',
    route: 'database',
    enabled: false // 暂未实现
  },
  {
    id: 'application',
    name: '应用管理',
    description: '应用部署管理',
    icon: '🐙',
    route: 'application',
    enabled: false // 暂未实现
  },
  {
    id: 'middleware',
    name: '中间件管理',
    description: '中间件部署',
    icon: '🚀',
    route: 'middleware',
    enabled: true // 已实现
  },
  {
    id: 'monitoring',
    name: '监控面板',
    description: '系统监控',
    icon: '📊',
    route: 'monitoring',
    enabled: false // 暂未实现
  },
  {
    id: 'template',
    name: '全局模板管理',
    description: '模板管理',
    icon: '🔧',
    route: 'template',
    enabled: true // 已实现
  },
  {
    id: 'logs',
    name: '日志管理',
    description: '日志查看',
    icon: '📝',
    route: 'logs',
    enabled: false // 暂未实现
  },
  {
    id: 'storage',
    name: '存储管理',
    description: '存储卷管理',
    icon: '💾',
    route: 'storage',
    enabled: false // 暂未实现
  },
  {
    id: 'permissions',
    name: '权限管理',
    description: '用户权限',
    icon: '🔐',
    route: 'permissions',
    enabled: false // 暂未实现
  }
])

// 功能模块配置
const functions = ref([
  {
    id: 'middleware',
    title: '中间件管理',
    description: '管理数据库、缓存、消息队列等中间件服务',
    icon: 'middleware',
    enabled: true,
    status: { type: 'success', text: '运行中' },
    stats: [
      { label: '实例', value: 5 },
      { label: '运行中', value: 4 }
    ]
  },
  {
    id: 'application',
    title: '应用管理',
    description: '部署和管理容器化应用程序',
    icon: 'application',
    enabled: true,
    status: { type: 'info', text: '开发中' },
    stats: [
      { label: '应用', value: 12 },
      { label: '运行中', value: 8 }
    ]
  },
  {
    id: 'database',
    title: '数据库',
    description: 'MySQL、PostgreSQL、MongoDB 等数据库服务',
    icon: 'database',
    enabled: true,
    status: { type: 'success', text: '正常' },
    stats: [
      { label: '实例', value: 3 },
      { label: '连接数', value: 45 }
    ]
  },
  {
    id: 'monitoring',
    title: '监控告警',
    description: '系统监控、性能分析和告警通知',
    icon: 'monitoring',
    enabled: false,
    status: { type: 'warning', text: '即将上线' }
  },
  {
    id: 'cicd',
    title: 'CI/CD',
    description: '持续集成和持续部署流水线',
    icon: 'cicd',
    enabled: false,
    status: { type: 'info', text: '规划中' }
  },
  {
    id: 'storage',
    title: '存储管理',
    description: '对象存储、文件系统和数据备份',
    icon: 'storage',
    enabled: false,
    status: { type: 'info', text: '规划中' }
  },
  {
    id: 'network',
    title: '网络服务',
    description: '负载均衡、域名解析和网络安全',
    icon: 'network',
    enabled: false,
    status: { type: 'info', text: '规划中' }
  },
  {
    id: 'security',
    title: '安全管理',
    description: '访问控制、证书管理和安全审计',
    icon: 'security',
    enabled: false,
    status: { type: 'info', text: '规划中' }
  }
])

const handleWorkspaceSelect = (key: string) => {
  if (key === 'create') {
    // 创建新工作空间
    message.info('创建工作空间功能开发中...')
  } else if (key === 'manage') {
    // 管理工作空间
    message.info('管理工作空间功能开发中...')
  } else {
    // 切换工作空间
    workspaceStore.switchWorkspace(key)
    const workspace = workspaceStore.workspaces.find(w => w.name === key)
    message.success(`已切换到工作空间: ${workspace?.displayName || key}`)
  }
}

const handleWorkspaceChange = async (workspaceName: string) => {
  try {
    await workspaceStore.switchWorkspace(workspaceName)
    message.success(`已切换到工作空间: ${workspaceName}`)
  } catch (error) {
    message.error('切换工作空间失败')
  }
}

const handleModuleClick = (module: any) => {
  if (!module.enabled) {
    message.warning(`${module.name} 功能暂未实现，敬请期待`)
    return
  }
  
  if (!currentWorkspace.value) {
    message.error('请先选择工作空间')
    return
  }
  
  router.push(`/workspace/${currentWorkspace.value}/${module.route}`)
}

const createWorkspace = async () => {
  creating.value = true
  try {
    await workspaceStore.createWorkspace(createForm.value)
    showCreateDialog.value = false
    createForm.value = { name: '', displayName: '', description: '' }
    message.success('工作空间创建成功')
  } catch (error: any) {
    message.error(error.message || '创建工作空间失败')
  } finally {
    creating.value = false
  }
}

const showDocs = () => {
  window.open('https://docs.naiveadmin.com/guide/introduction.html', '_blank')
}

const showNotifications = () => {
  message.info('通知功能开发中...')
}

// 功能卡片点击处理
const handleFunctionClick = (func: any) => {
  if (!func.enabled) {
    message.warning(`${func.title} 功能暂未实现，敬请期待`)
    return
  }

  // 根据功能类型进行路由跳转
  switch (func.id) {
    case 'middleware':
      router.push('/middleware')
      break
    case 'application':
      message.info('应用管理功能开发中...')
      break
    case 'database':
      message.info('数据库管理功能开发中...')
      break
    default:
      message.info(`${func.title} 功能开发中...`)
  }
}



onMounted(() => {
  workspaceStore.init()
})
</script>

<style scoped>
.workspace-home {
  min-height: 100vh;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif;
}

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
  gap: 16px;
}

.workspace-dropdown {
  position: relative;
}

.workspace-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  min-width: 120px;
}

.workspace-trigger:hover {
  background-color: #f5f5f5;
}

.workspace-name {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
  flex: 1;
}

/* 自定义下拉菜单样式 - 与整体风格保持一致 */
:deep(.n-dropdown-menu) {
  border-radius: 16px !important;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15) !important;
  border: none !important;
  padding: 8px !important;
  background: #ffffff !important;
  min-width: 200px !important;
}

:deep(.n-dropdown-option) {
  border-radius: 12px !important;
  margin: 4px 0 !important;
  padding: 12px 16px !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  color: #262626 !important;
  transition: all 0.2s ease !important;
}

:deep(.n-dropdown-option:hover) {
  background-color: #f8f9fa !important;
  transform: translateX(2px) !important;
}

:deep(.n-dropdown-option .n-dropdown-option__icon) {
  margin-right: 12px !important;
  width: 16px !important;
  height: 16px !important;
}

:deep(.n-dropdown-divider) {
  margin: 8px 0 !important;
  background-color: #f0f0f0 !important;
  height: 1px !important;
}

.main-content {
  flex: 1;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.page-header {
  margin-bottom: 32px;
  padding: 0 4px;
}

.header-content h1.page-title {
  font-size: 32px;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0 0 8px 0;
  line-height: 1.1;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
}

.header-content .page-subtitle {
  font-size: 17px;
  color: #86868b;
  margin: 0;
  line-height: 1.4;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
}

.function-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding: 0 4px;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.nav-stats {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 16px;
  border-left: 1px solid #e8e8e8;
  margin-left: 8px;
}

.nav-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
}

.nav-stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #1d1d1f;
  line-height: 1.1;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
}

.nav-stat-label {
  font-size: 11px;
  color: #86868b;
  line-height: 1.2;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  font-weight: 500;
  margin-top: 2px;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-actions :deep(.n-button) {
  color: #86868b;
  font-size: 13px;
  padding: 6px 10px;
  height: 30px;
  min-width: auto;
  border-radius: 6px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  font-weight: 500;
}

.nav-actions :deep(.n-button:hover) {
  background-color: rgba(0, 0, 0, 0.04);
  color: #1d1d1f;
}

.workspace-selector {
  display: flex;
  align-items: center;
}

.notification-banner {
  margin: 12px 20px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 4px;
  padding: 8px 12px;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #52c41a;
}

.app-grid-container {
  padding: 40px 20px;
  display: flex;
  justify-content: center;
  min-height: calc(100vh - 120px);
  align-items: center;
}

@media (max-width: 768px) {
  .top-nav {
    padding: 0 16px;
    height: 52px;
  }

  .nav-left {
    gap: 12px;
  }

  .nav-right {
    gap: 12px;
  }

  .nav-stats {
    display: none;
  }

  .nav-actions {
    gap: 6px;
  }

  .nav-actions :deep(.n-button) {
    padding: 4px 8px;
    height: 28px;
    font-size: 12px;
  }

  .main-content {
    padding: 16px;
  }

  .page-header {
    margin-bottom: 24px;
  }

  .function-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }
}

@media (max-width: 480px) {
  .main-content {
    padding: 12px;
  }

  .nav-actions {
    gap: 4px;
  }

  .nav-actions :deep(.n-button) {
    padding: 3px 6px;
    height: 26px;
    font-size: 11px;
  }

  .function-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>
