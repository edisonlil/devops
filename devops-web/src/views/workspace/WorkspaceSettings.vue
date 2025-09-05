<template>
  <div class="workspace-settings">
    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 页面标题区域 -->
      <div class="page-header">
        <div class="header-content">
          <div class="breadcrumb">
            <n-button text @click="goBack" class="back-button">
              <n-icon size="16">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
              </n-icon>
              返回控制台
            </n-button>
          </div>
          <h1 class="page-title text-h1">工作空间设置</h1>
          <p class="page-subtitle text-subtitle">管理 {{ workspaceName }} 工作空间的配置和环境设置</p>
        </div>
        <div class="header-actions">
          <n-button type="primary" @click="saveSettings" :loading="saving" size="medium">
            <template #icon>
              <n-icon>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                </svg>
              </n-icon>
            </template>
            保存设置
          </n-button>
        </div>
      </div>

      <!-- 设置内容 -->
      <div class="settings-content">
        <div class="content-grid">
          <!-- 左侧配置区域 -->
          <div class="settings-sections">
            <!-- 部署配置 -->
            <div class="settings-section">
              <div class="section-header">
                <h3 class="section-title">部署配置</h3>
                <p class="section-description">默认的部署平台和环境配置</p>
              </div>
              <div class="section-content">
                <div class="form-grid">
                  <div class="form-item">
                    <label class="form-label">部署平台</label>
                    <n-select
                      v-model:value="workspaceConfig.platform"
                      :options="platformOptions"
                      placeholder="选择部署平台"
                    />
                  </div>
                  <div class="form-item">
                    <label class="form-label">命名空间</label>
                    <n-input v-model:value="workspaceConfig.namespace" placeholder="kubernetes namespace" />
                  </div>
                  <div class="form-item">
                    <label class="form-label">默认环境</label>
                    <n-select
                      v-model:value="workspaceConfig.environment"
                      :options="environmentOptions"
                      placeholder="选择默认环境"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Git 配置 -->
            <div class="settings-section">
              <div class="section-header">
                <h3 class="section-title">Git 配置</h3>
                <p class="section-description">默认的 Git 仓库和分支设置</p>
              </div>
              <div class="section-content">
                <div class="form-grid">
                  <div class="form-item full-width">
                    <label class="form-label">Git 仓库地址</label>
                    <n-input v-model:value="workspaceConfig.gitUrl" placeholder="https://github.com/user/repo.git" />
                  </div>
                  <div class="form-item">
                    <label class="form-label">默认分支</label>
                    <n-input v-model:value="workspaceConfig.gitBranch" placeholder="main" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Harbor 配置 -->
            <div class="settings-section">
              <div class="section-header">
                <h3 class="section-title">Harbor 配置</h3>
                <p class="section-description">容器镜像仓库配置</p>
              </div>
              <div class="section-content">
                <div class="harbor-header">
                  <div class="harbor-toggle">
                    <label class="form-label">启用 Harbor</label>
                    <n-switch v-model:value="workspaceConfig.harborEnabled" />
                  </div>
                </div>
                <div class="form-grid" v-show="workspaceConfig.harborEnabled">
                  <div class="form-item full-width">
                    <label class="form-label">Harbor 地址</label>
                    <n-input v-model:value="workspaceConfig.harborAddress" placeholder="harbor.example.com" />
                  </div>
                  <div class="form-item">
                    <label class="form-label">Harbor 项目</label>
                    <n-input v-model:value="workspaceConfig.harborProject" placeholder="project-name" />
                  </div>
                  <div class="form-item">
                    <label class="form-label">Harbor 用户名</label>
                    <n-input v-model:value="workspaceConfig.harborUsername" placeholder="用户名" />
                  </div>
                  <div class="form-item">
                    <label class="form-label">Harbor 密码</label>
                    <n-input
                      v-model:value="workspaceConfig.harborPassword"
                      type="password"
                      placeholder="密码"
                      show-password-on="click"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- 构建配置 -->
            <div class="settings-section">
              <div class="section-header">
                <h3 class="section-title">构建配置</h3>
                <p class="section-description">默认的构建工具和版本设置</p>
              </div>
              <div class="section-content">
                <div class="form-grid">
                  <div class="form-item">
                    <label class="form-label">构建版本</label>
                    <n-input v-model:value="workspaceConfig.buildVersion" placeholder="node:18.12" />
                  </div>
                  <div class="form-item">
                    <label class="form-label">Maven Settings</label>
                    <n-input v-model:value="workspaceConfig.mavenSettings" placeholder="/root/settings.xml" />
                  </div>
                  <div class="form-item full-width">
                    <label class="form-label">构建命令</label>
                    <n-input
                      v-model:value="workspaceConfig.buildCommands"
                      type="textarea"
                      placeholder="npm ci && npm run build"
                      :rows="3"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧信息面板 -->
          <div class="info-panel">
            <!-- 工作空间状态 -->
            <div class="info-card">
              <div class="info-header">
                <h4 class="info-title">工作空间状态</h4>
              </div>
              <div class="info-content">
                <div class="status-item">
                  <span class="status-label">工作空间</span>
                  <span class="status-value">{{ workspaceName }}</span>
                </div>
                <div class="status-item">
                  <span class="status-label">状态</span>
                  <n-tag :type="workspaceStatus.type" size="small">
                    {{ workspaceStatus.text }}
                  </n-tag>
                </div>
                <div class="status-item">
                  <span class="status-label">创建时间</span>
                  <span class="status-value">{{ workspaceConfig.createdAt }}</span>
                </div>
                <div class="status-item">
                  <span class="status-label">最后更新</span>
                  <span class="status-value">{{ workspaceConfig.updatedAt }}</span>
                </div>
              </div>
            </div>

            <!-- 资源统计 -->
            <div class="info-card">
              <div class="info-header">
                <h4 class="info-title">资源统计</h4>
              </div>
              <div class="info-content">
                <div class="stats-grid">
                  <div class="stat-item">
                    <div class="stat-number">{{ workspaceStats.middlewareCount }}</div>
                    <div class="stat-label">中间件实例</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-number">{{ workspaceStats.runningCount }}</div>
                    <div class="stat-label">运行中</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-number">{{ workspaceStats.errorCount }}</div>
                    <div class="stat-label">异常</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 操作面板 -->
            <div class="info-card">
              <div class="info-header">
                <h4 class="info-title">操作面板</h4>
              </div>
              <div class="info-content">
                <div class="action-buttons">
                  <n-button block secondary @click="exportConfig" size="medium">
                    <template #icon>
                      <n-icon>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                        </svg>
                      </n-icon>
                    </template>
                    导出配置
                  </n-button>
                  <n-button block secondary @click="resetToDefaults" size="medium">
                    <template #icon>
                      <n-icon>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12,4C14.1,4 16.1,4.8 17.6,6.3C20.7,9.4 20.7,14.5 17.6,17.6C16.1,19.1 14.1,20 12,20C9.9,20 7.9,19.1 6.4,17.6C3.3,14.5 3.3,9.4 6.4,6.3C7.9,4.8 9.9,4 12,4M12,2C6.5,2 2,6.5 2,12C2,17.5 6.5,22 12,22C17.5,22 22,17.5 22,12C22,6.5 17.5,2 12,2M13,7H11V11H7V13H11V17H13V13H17V11H13V7Z"/>
                        </svg>
                      </n-icon>
                    </template>
                    重置为默认
                  </n-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { getRemoteWorkspaceConfig, updateRemoteWorkspaceConfig } from '@/api/workspace'
import { useAuthStore } from '@/stores/auth'
// import GlobalNavbar from '@/components/layout/GlobalNavbar.vue'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()

const workspaceName = computed(() => {
  const name = route.params.workspaceName as string
  console.log('当前工作空间名称:', name)
  console.log('当前路由路径:', route.path)
  console.log('路由参数:', route.params)
  return name
})

// 表单数据
const workspaceConfig = ref({
  name: '',
  displayName: '',
  description: '',
  platform: 'Kubernetes',
  namespace: 'default',
  environment: 'development',
  gitUrl: '',
  gitBranch: 'main',
  harborEnabled: false,
  harborAddress: '',
  harborProject: '',
  harborUsername: '',
  harborPassword: '',
  buildVersion: 'node:18.12',
  buildCommands: 'npm ci && npm run build',
  mavenSettings: '/root/settings.xml',
  createdAt: '2025/9/5',
  updatedAt: '2025/9/5'
})

// 工作空间状态
const workspaceStatus = ref({
  type: 'success' as const,
  text: '正常运行'
})

// 工作空间统计
const workspaceStats = ref({
  middlewareCount: 5,
  runningCount: 4,
  errorCount: 0
})

// 选项配置
const platformOptions = [
  { label: 'Kubernetes', value: 'Kubernetes' },
  { label: 'Docker Swarm', value: 'Docker Swarm' },
  { label: 'Docker Compose', value: 'Docker Compose' }
]

const environmentOptions = [
  { label: '开发环境', value: 'development' },
  { label: '测试环境', value: 'testing' },
  { label: '预发布环境', value: 'staging' },
  { label: '生产环境', value: 'production' }
]

// 状态管理
const saving = ref(false)

// 返回控制台
const goBack = () => {
  router.push(`/workspace/${workspaceName.value}`)
}

// 保存设置
const saveSettings = async () => {
  try {
    // 检查认证状态
    if (!authStore.isAuthenticated) {
      message.error('请先登录')
      router.push('/login')
      return
    }

    saving.value = true

    // 调用API保存配置
    const response = await updateRemoteWorkspaceConfig(workspaceName.value, workspaceConfig.value)

    if (response.success) {
      message.success('工作空间设置已保存')
      // 更新时间戳
      workspaceConfig.value.updatedAt = new Date().toLocaleDateString('zh-CN')
    } else {
      message.error('保存设置失败')
    }
  } catch (error: any) {
    console.error('保存设置失败:', error)

    // 如果是401错误，说明未登录或会话过期
    if (error.response?.status === 401) {
      message.error('登录已过期，请重新登录')
      authStore.doLogout()
      router.push('/login')
    } else {
      message.error('保存设置失败: ' + (error.response?.data?.message || error.message))
    }
  } finally {
    saving.value = false
  }
}

// 导出配置
const exportConfig = () => {
  const config = { ...workspaceConfig.value }
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${workspaceName.value}-config.json`
  a.click()
  URL.revokeObjectURL(url)
  message.success('配置已导出')
}

// 加载工作空间配置
const loadWorkspaceConfig = async () => {
  try {
    const response = await getRemoteWorkspaceConfig(workspaceName.value)

    if (response.success && response.data && response.data.exists) {
      const config = response.data.config

      // 映射配置到表单数据
      workspaceConfig.value = {
        ...workspaceConfig.value,
        displayName: config.WORKSPACE_DISPLAY_NAME || `${workspaceName.value}-crm`,
        description: config.WORKSPACE_DESCRIPTION || `${workspaceName.value} 工作空间的配置和环境设置`,
        platform: config.BUILD_PLATFORM || 'Kubernetes',
        namespace: config.BUILD_K8S_NAMESPACE || 'default',
        environment: config.DEFAULT_ENVIRONMENT || 'development',
        gitUrl: config.BUILD_GIT_URL || '',
        gitBranch: config.BUILD_GIT_BRANCH || 'main',
        harborEnabled: config.BUILD_ENABEL_HARBOR === '1' || config.BUILD_ENABEL_HARBOR === 1,
        harborAddress: config.BUILD_HARBOR_ADDRESS || '',
        harborProject: config.BUILD_HARBOR_PROJECT || '',
        harborUsername: config.BUILD_HARBOR_USERNAME || '',
        harborPassword: config.BUILD_HARBOR_PASSWORD || '',
        buildVersion: config.BUILD_VERSION || 'node:18.12',
        buildCommands: config.BUILD_COMMANDS || 'npm ci && npm run build',
        mavenSettings: config.BUILD_MAVEN_SETTINGS || '/root/settings.xml'
      }
    } else {
      // 如果配置文件不存在，使用默认值
      workspaceConfig.value.displayName = `${workspaceName.value}-crm`
      workspaceConfig.value.description = `${workspaceName.value} 工作空间的配置和环境设置`
    }
  } catch (error) {
    console.error('加载工作空间配置失败:', error)
    message.warning('无法加载远程配置，使用默认值')
    // 使用默认值
    workspaceConfig.value.displayName = `${workspaceName.value}-crm`
    workspaceConfig.value.description = `${workspaceName.value} 工作空间的配置和环境设置`
  }
}

// 重置为默认
const resetToDefaults = async () => {
  try {
    // 模拟获取默认配置
    const defaults = {
      platform: 'Kubernetes',
      namespace: 'default',
      environment: 'development',
      gitBranch: 'main',
      buildVersion: 'node:18.12',
      buildCommands: 'npm ci && npm run build'
    }
    Object.assign(workspaceConfig.value, defaults)
    message.success('已重置为默认配置')
  } catch (error) {
    console.error('重置配置失败:', error)
    message.error('重置配置失败')
  }
}

// 初始化数据
const initializeData = async () => {
  try {
    // 设置基本信息
    workspaceConfig.value.name = workspaceName.value

    // 获取远程工作空间配置
    await loadWorkspaceConfig()

    console.log('工作空间设置页面初始化完成')
  } catch (error) {
    console.error('初始化数据失败:', error)
    message.error('加载工作空间信息失败')
  }
}

onMounted(() => {
  // 初始化认证状态
  authStore.init()

  // 检查认证状态
  if (!authStore.isAuthenticated) {
    message.error('请先登录')
    router.push('/login')
    return
  }

  initializeData()
})
</script>

<style scoped>
.workspace-settings {
  background: #ffffff;
  min-height: 100vh;
}

.main-content {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
  padding: 0 4px;
}

.header-content {
  flex: 1;
}

.breadcrumb {
  margin-bottom: 16px;
}

.back-button {
  color: #0969da;
  font-weight: 500;
  padding: 4px 8px;
}

.back-button:hover {
  background: #f6f8fa;
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
  align-items: flex-end;
}

.settings-content {
  width: 100%;
}

.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  align-items: start;
}

.settings-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid #e1e4e8;
}

.section-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0 0 4px 0;
}

.section-description {
  font-size: 13px;
  color: #6e7781;
  margin: 0;
  line-height: 1.4;
}

.section-content {
  margin-top: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-item.full-width {
  grid-column: 1 / -1;
}

.harbor-header {
  margin-bottom: 16px;
}

.harbor-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8f9fa;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
}

.harbor-toggle .form-label {
  margin: 0;
  font-weight: 500;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #1d1d1f;
  margin-bottom: 4px;
}

.info-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: sticky;
  top: 24px;
}

.info-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid #e1e4e8;
}

.info-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.info-title {
  font-size: 16px;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-label {
  font-size: 14px;
  color: #6e7781;
  font-weight: 500;
}

.status-value {
  font-size: 14px;
  color: #1d1d1f;
  font-weight: 500;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-item {
  text-align: center;
  padding: 16px 12px;
  background: #f6f8fa;
  border-radius: 8px;
  border: 1px solid #e1e4e8;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 4px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
}

.stat-label {
  font-size: 12px;
  color: #6e7781;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .info-panel {
    position: static;
    margin-top: 0;
  }
}

@media (max-width: 768px) {
  .main-content {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: flex-end;
    margin-top: 16px;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .settings-section {
    padding: 20px;
  }

  .info-card {
    padding: 16px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .main-content {
    padding: 12px;
  }

  .settings-section {
    padding: 16px;
  }

  .info-card {
    padding: 12px;
  }
}
</style>
