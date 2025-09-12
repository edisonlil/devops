<template>
  <div class="global-navbar">
    <div class="nav-left">
      <ProfessionalLogo />
      
      <!-- 主机信息 -->
      <div v-if="sessionInfo" class="host-info">
        <div class="host-details">
          <span class="host-address">{{ sessionInfo.host }}</span>
        </div>
      </div>
      
      <!-- 工作空间选择器 -->
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
        <n-button text size="small" @click="handleLogout">
          <template #icon>
            <n-icon><LogOut /></n-icon>
          </template>
          登出
        </n-button>
      </div>
      <n-avatar size="small" :src="userAvatar" />
    </div>

    <!-- 创建工作空间对话框 -->
    <n-modal v-model:show="showCreateDialog">
      <n-card title="创建工作空间" style="width: 500px">
        <n-form ref="createFormRef" :model="createForm" :rules="createRules" label-placement="top">
          <n-form-item label="工作空间名称" path="name">
            <n-input 
              v-model:value="createForm.name" 
              placeholder="例如：production, staging, dev-team1"
              :input-props="{ style: 'font-family: monospace' }"
            />
            <template #feedback>
              <div class="form-hint">
                只能包含小写字母、数字和连字符，将用作目录名和标识符
              </div>
            </template>
          </n-form-item>
          
          <n-form-item label="显示名称" path="displayName">
            <n-input v-model:value="createForm.displayName" placeholder="例如：生产环境, 测试环境" />
            <template #feedback>
              <div class="form-hint">
                用于界面显示的友好名称
              </div>
            </template>
          </n-form-item>
          
          <n-form-item label="描述" path="description">
            <n-input
              v-model:value="createForm.description"
              type="textarea"
              placeholder="工作空间的用途和说明..."
              :rows="3"
            />
          </n-form-item>
        </n-form>

        <template #footer>
          <div class="dialog-footer">
            <n-button @click="showCreateDialog = false">取消</n-button>
            <n-button type="primary" @click="createWorkspace" :loading="creating">
              {{ creating ? '创建中...' : '创建工作空间' }}
            </n-button>
          </div>
        </template>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import { Notifications, CheckmarkCircle, LogOut } from '@vicons/ionicons5'
import { useWorkspaceStore } from '@/stores/workspace'
import { useAuthStore } from '@/stores/auth'
import ProfessionalLogo from '@/components/common/ProfessionalLogo.vue'
import { getSessionInfo, type SessionInfo } from '@/api/auth'
import { createEnableFile } from '@/api/workspace'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const workspaceStore = useWorkspaceStore()
const authStore = useAuthStore()

// 会话信息
const sessionInfo = ref<SessionInfo | null>(null)
const userAvatar = ref('/default-avatar.png')

// 统计数据
const totalResources = ref(24)
const runningServices = ref(8)
const monthlyBill = ref(156.80)

// 当前工作空间名称
const currentWorkspaceName = computed(() => {
  // 首先尝试从路由参数获取工作空间名称
  const routeWorkspace = route.params.workspaceName as string
  if (routeWorkspace) {
    return routeWorkspace
  }
  
  // 如果没有路由参数，则从store获取
  const workspace = workspaceStore.workspaces.find(w => w.name === workspaceStore.currentWorkspace)
  return workspace?.displayName || workspaceStore.currentWorkspace || 'default'
})

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

// 创建工作空间对话框状态
const showCreateDialog = ref(false)
const creating = ref(false)
const createForm = ref({
  name: '',
  displayName: '',
  description: ''
})

const createRules = {
  name: [
    { required: true, message: '请输入工作空间名称' },
    { 
      pattern: /^[a-z0-9-]+$/, 
      message: '工作空间名称只能包含小写字母、数字和连字符' 
    },
    { min: 3, max: 30, message: '工作空间名称长度应在3-30个字符之间' }
  ],
  displayName: [
    { required: true, message: '请输入显示名称' }
  ]
}

const handleWorkspaceSelect = async (key: string) => {
  if (key === 'create') {
    showCreateDialog.value = true
  } else if (key === 'manage') {
    // 跳转到当前工作空间的设置页面
    const currentWorkspaceName = route.params.workspaceName as string
    if (currentWorkspaceName) {
      router.push(`/workspace/${currentWorkspaceName}/settings`)
    } else {
      message.error('无法获取当前工作空间信息')
    }
  } else {
    try {
      // 切换工作空间
      workspaceStore.switchWorkspace(key)
      const workspace = workspaceStore.workspaces.find(w => w.name === key)
      
      // 更新远程enable文件，设置为默认工作空间
      await createEnableFile({ workspace: key })
      
      message.success(`已切换到工作空间: ${workspace?.displayName || key}，并设置为默认工作空间`)

      // 如果在工作空间页面，直接跳转到新工作空间
      if (route.path.includes('/workspace/')) {
        router.push(`/workspace/${key}`)
      }
    } catch (error: any) {
      console.error('切换工作空间失败:', error)
      
      // 即使更新enable文件失败，也要显示切换成功的消息
      const workspace = workspaceStore.workspaces.find(w => w.name === key)
      message.warning(`已切换到工作空间: ${workspace?.displayName || key}，但未能设置为默认工作空间`)
      
      // 如果在工作空间页面，直接跳转到新工作空间
      if (route.path.includes('/workspace/')) {
        router.push(`/workspace/${key}`)
      }
    }
  }
}

const showDocs = () => {
  window.open('https://docs.naiveadmin.com/guide/introduction.html', '_blank')
}

const showNotifications = () => {
  message.info('通知功能开发中...')
}

// 创建工作空间
const createWorkspace = async () => {
  creating.value = true
  try {
    await workspaceStore.createWorkspace(createForm.value)
    showCreateDialog.value = false
    createForm.value = { name: '', displayName: '', description: '' }
    message.success('工作空间创建成功')
    
    // 刷新会话信息以获取最新的工作空间列表
    await loadSessionInfo()
  } catch (error: any) {
    message.error(error.message || '创建工作空间失败')
  } finally {
    creating.value = false
  }
}

const handleLogout = async () => {
  try {
    await authStore.doLogout()
    message.success('已登出')
    router.replace('/login')
  } catch (error) {
    console.error('登出失败:', error)
    // 即使登出失败，也跳转到登录页
    router.replace('/login')
  }
}

// 获取会话信息
const loadSessionInfo = async () => {
  try {
    const response = await getSessionInfo()
    // 后端返回格式：{ success: true, data: { host, username, ... } }
    sessionInfo.value = response.data.data
    
    // 更新工作空间信息
    if (response.data.data.availableWorkspaces) {
      workspaceStore.updateWorkspaces(response.data.data.availableWorkspaces.map(name => ({
        name,
        displayName: name
      })))
    }
    
    if (response.data.data.defaultWorkspace) {
      workspaceStore.switchWorkspace(response.data.data.defaultWorkspace)
    }
  } catch (error) {
    console.error('获取会话信息失败:', error)
  }
}

onMounted(async () => {
  console.log('GlobalNavbar 组件挂载，开始加载会话信息...')
  await loadSessionInfo()
})
</script>

<style scoped>
.global-navbar {
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

.host-info {
  display: flex;
  align-items: center;
  padding: 4px 12px;
  background: #f0f8ff;
  border-radius: 6px;
  border: 1px solid #e6f3ff;
}

.host-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.host-address {
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  color: #007AFF;
  line-height: 1;
}

.host-user {
  font-size: 10px;
  color: #86868b;
  line-height: 1;
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

/* 自定义下拉菜单样式 */
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

/* 响应式设计 */
@media (max-width: 768px) {
  .global-navbar {
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
}

@media (max-width: 480px) {
  .nav-actions {
    gap: 4px;
  }

  .nav-actions :deep(.n-button) {
    padding: 3px 6px;
    height: 26px;
    font-size: 11px;
  }
}

/* 创建工作空间对话框样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.form-hint {
  font-size: 12px;
  color: #86868b;
  line-height: 1.4;
  margin-top: 4px;
}
</style>