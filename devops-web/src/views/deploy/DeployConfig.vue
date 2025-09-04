<template>
  <div class="deploy-config">
    <!-- 页面标题区域 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title text-h1">配置部署</h1>
        <p class="page-subtitle text-subtitle">配置 {{ selectedTemplate?.name }} 的部署参数</p>
      </div>
      <div class="header-actions">
        <div class="action-row">
          <n-button size="medium" @click="goBack">
            <template #icon>
              <n-icon><ArrowBack /></n-icon>
            </template>
            返回
          </n-button>
        </div>
        <div class="action-row deploy-row">
          <n-button type="primary" size="medium" @click="handleDeploy" :loading="deploying">
            开始部署
          </n-button>
        </div>
      </div>
    </div>

    <!-- 配置表单区域 -->
    <div class="config-section">
      <div class="config-layout">
        <!-- 左侧信息面板 -->
        <div class="info-panel">
          <!-- 模板信息 -->
          <n-card title="模板信息" class="info-card">
            <div class="template-info">
              <div class="info-item">
                <span class="info-label">模板名称:</span>
                <span class="info-value">{{ selectedTemplate?.name || '未选择' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">应用类型:</span>
                <span class="info-value">{{ config.type || '未指定' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">当前工作空间:</span>
                <span class="info-value">{{ currentWorkspace }}</span>
              </div>
            </div>
          </n-card>

          <!-- 命令预览 -->
          <n-card title="命令预览" class="info-card">
            <div class="command-display">
              <code>{{ generatedCommand }}</code>
            </div>
            <div class="command-actions">
              <n-button size="small" @click="copyCommand">
                <template #icon>
                  <n-icon><Copy /></n-icon>
                </template>
                复制命令
              </n-button>
            </div>
          </n-card>

          <!-- 部署提示 -->
          <n-card title="部署提示" class="info-card">
            <div class="tips-content">
              <div class="tip-item">
                <n-icon class="tip-icon"><InformationCircle /></n-icon>
                <span>确保Git仓库地址可访问</span>
              </div>
              <div class="tip-item">
                <n-icon class="tip-icon"><InformationCircle /></n-icon>
                <span>端口范围：30000-32767</span>
              </div>
              <div class="tip-item">
                <n-icon class="tip-icon"><InformationCircle /></n-icon>
                <span>部署过程可能需要几分钟</span>
              </div>
            </div>
          </n-card>
        </div>

        <!-- 右侧表单 -->
        <div class="config-form">
          <!-- 基本信息 -->
          <div class="form-section">
            <h3 class="section-title">基本信息</h3>
            <div class="form-grid">
              <div class="form-item">
                <label class="form-label">应用名称 *</label>
                <n-input
                  v-model:value="config.name"
                  placeholder="请输入应用名称"
                  :status="errors.name ? 'error' : undefined"
                />
                <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
              </div>

              <div class="form-item">
                <label class="form-label">命名空间</label>
                <n-input
                  v-model:value="config.namespace"
                  placeholder="kubernetes 命名空间（可选）"
                />
              </div>
            </div>
          </div>

        <!-- 代码源配置 -->
        <div class="form-section">
          <h3 class="section-title">代码源</h3>
          <div class="form-grid">
            <div class="form-item full-width">
              <label class="form-label">Git 仓库地址 *</label>
              <n-input 
                v-model:value="config.gitUrl" 
                placeholder="https://github.com/user/repo.git"
                :status="errors.gitUrl ? 'error' : undefined"
              />
              <span v-if="errors.gitUrl" class="error-text">{{ errors.gitUrl }}</span>
            </div>
            
            <div class="form-item">
              <label class="form-label">分支</label>
              <n-input 
                v-model:value="config.branch" 
                placeholder="main"
              />
            </div>
            
            <div class="form-item" v-if="showBuildTool">
              <label class="form-label">构建工具</label>
              <n-select 
                v-model:value="config.buildTool" 
                :options="buildToolOptions"
                placeholder="选择构建工具"
              />
            </div>
          </div>
        </div>

        <!-- 构建配置 -->
        <div class="form-section">
          <h3 class="section-title">构建配置</h3>
          <div class="form-grid">
            <div class="form-item">
              <label class="form-label">构建环境</label>
              <n-select
                v-model:value="config.buildEnv"
                :options="buildEnvOptions"
                placeholder="选择构建环境"
              />
            </div>
          </div>
        </div>

        <!-- 端口配置 -->
        <div class="form-section">
          <h3 class="section-title">端口配置</h3>
          <div class="form-grid">
            <div class="form-item">
              <label class="form-label">应用端口</label>
              <n-input-number 
                v-model:value="config.appPort" 
                placeholder="8080"
                :min="1"
                :max="65535"
              />
            </div>
            
            <div class="form-item">
              <label class="form-label">暴露端口</label>
              <n-input-number 
                v-model:value="config.exposePort" 
                placeholder="30000-32767"
                :min="30000"
                :max="32767"
              />
            </div>
            
            <div class="form-item">
              <label class="form-label">强制端口</label>
              <n-switch v-model:value="config.forcePort" />
            </div>
          </div>
        </div>

        <!-- 高级配置 -->
        <div class="form-section">
          <h3 class="section-title">高级配置</h3>
          <div class="form-grid">
            <div class="form-item full-width" v-if="config.type === 'java'">
              <label class="form-label">Java 选项</label>
              <n-input 
                v-model:value="config.javaOpts" 
                placeholder="-Xmx512m -Xms256m"
              />
            </div>
            
            <div class="form-item full-width">
              <label class="form-label">构建命令</label>
              <n-input 
                v-model:value="config.buildCmds" 
                placeholder="自定义构建命令（可选）"
              />
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
import { useRouter, useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import { ArrowBack, Copy, InformationCircle } from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()
const message = useMessage()

const deploying = ref(false)
const errors = ref<Record<string, string>>({})

// 配置数据
const config = ref({
  name: '',
  type: '',
  workspace: 'default',
  namespace: '',
  gitUrl: '',
  branch: 'main',
  buildTool: '',
  buildEnv: 'prod',
  appPort: null as number | null,
  exposePort: null as number | null,
  forcePort: false,
  javaOpts: '',
  buildCmds: ''
})

// 选中的模板信息
const selectedTemplate = ref<any>(null)

// 选项数据
const buildToolOptions = [
  { label: 'Maven', value: 'maven' },
  { label: 'Gradle', value: 'gradle' }
]

const buildEnvOptions = [
  { label: '开发环境', value: 'dev' },
  { label: '测试环境', value: 'test' },
  { label: '灰度环境', value: 'gray' },
  { label: '生产环境', value: 'prod' }
]

// 是否显示构建工具选择
const showBuildTool = computed(() => {
  return config.value.type === 'java' || config.value.type === 'tomcat'
})

// 当前工作空间
const currentWorkspace = computed(() => {
  return route.params.workspaceName || 'default'
})

// 生成的命令
const generatedCommand = computed(() => {
  const parts = ['devops', 'run', config.value.type, config.value.name]
  
  if (config.value.gitUrl) {
    parts.push('--git-url', `"${config.value.gitUrl}"`)
  }
  if (config.value.branch && config.value.branch !== 'main') {
    parts.push('--git-branch', config.value.branch)
  }
  if (config.value.buildTool) {
    parts.push('--build-tool', config.value.buildTool)
  }
  if (selectedTemplate.value?.name) {
    parts.push('--template', selectedTemplate.value.name)
  }
  if (config.value.workspace) {
    parts.push('--workspace', config.value.workspace)
  }
  if (config.value.namespace) {
    parts.push('--namespace', config.value.namespace)
  }
  if (config.value.buildEnv && config.value.buildEnv !== 'prod') {
    parts.push('--build-env', config.value.buildEnv)
  }
  if (config.value.appPort) {
    parts.push('--app-port', config.value.appPort.toString())
  }
  if (config.value.exposePort) {
    parts.push('--expose-port', config.value.exposePort.toString())
  }
  if (config.value.forcePort) {
    parts.push('--force-port')
  }
  if (config.value.javaOpts) {
    parts.push('--java-opts', `"${config.value.javaOpts}"`)
  }
  if (config.value.buildCmds) {
    parts.push('--build-cmds', `"${config.value.buildCmds}"`)
  }
  
  return parts.join(' ')
})

// 表单验证
const validateForm = () => {
  errors.value = {}
  
  if (!config.value.name) {
    errors.value.name = '应用名称不能为空'
  }
  
  if (!config.value.gitUrl) {
    errors.value.gitUrl = 'Git 仓库地址不能为空'
  }
  
  return Object.keys(errors.value).length === 0
}

// 复制命令
const copyCommand = async () => {
  try {
    await navigator.clipboard.writeText(generatedCommand.value)
    message.success('命令已复制到剪贴板')
  } catch (error) {
    message.error('复制失败')
  }
}

// 处理部署
const handleDeploy = async () => {
  if (!validateForm()) {
    message.error('请填写必填项')
    return
  }

  deploying.value = true
  try {
    // 这里调用部署API
    message.success('部署任务已提交')
    router.push({ name: 'ApplicationManager' })
  } catch (error: any) {
    message.error(error.message || '部署失败')
  } finally {
    deploying.value = false
  }
}

// 返回模板选择页面
const goBack = () => {
  router.push({ name: 'TemplateSelection' })
}

// 初始化
onMounted(() => {
  const templateId = route.query.template as string
  const type = route.query.type as string
  
  if (templateId && type) {
    config.value.type = type

    // 这里可以根据模板ID获取模板详细信息
    selectedTemplate.value = {
      id: templateId,
      name: templateId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: type
    }
  }
})
</script>

<style scoped>
.deploy-config {
  padding: 24px;
  background: #FFFFFF;
  min-height: 100vh;
}

/* 页面标题样式 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
  padding: 0 4px;
}

.header-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-end;
}

.action-row {
  display: flex;
  justify-content: flex-end;
}

.deploy-row {
  width: 100%;
}

.header-content h1 {
  margin: 0 0 8px 0;
  font-size: var(--font-size-h1);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  line-height: var(--line-height-tight);
}

.header-content p {
  margin: 0;
  font-size: var(--font-size-subtitle);
  color: var(--text-secondary);
  line-height: var(--line-height-normal);
}

/* 配置区域 */
.config-section {
  max-width: 1400px;
}

.config-layout {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 32px;
  align-items: start;
}

.config-form {
  background: #FFFFFF;
  border-radius: 12px;
  border: 1px solid #E5E7EB;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.form-section {
  padding: 24px;
  border-bottom: 1px solid #F3F4F6;
}

.form-section:last-child {
  border-bottom: none;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1F2937;
  margin: 0 0 20px 0;
  line-height: 1.5;
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
}

.form-item.full-width {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  line-height: 1.5;
}

.error-text {
  font-size: 12px;
  color: #EF4444;
  margin-top: 4px;
}

/* 右侧信息面板 */
.info-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-card {
  border-radius: 12px;
  border: 1px solid #E5E7EB;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.info-card :deep(.n-card-header__main) {
  font-weight: 600;
  color: #1F2937;
}

.template-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #F3F4F6;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 14px;
  color: #6B7280;
  font-weight: 600;
}

.info-value {
  font-size: 14px;
  color: #1F2937;
  font-weight: 600;
}

.command-display {
  background: #1F2937;
  color: #F9FAFB;
  padding: 16px;
  border-radius: 8px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  margin-bottom: 12px;
  border: 1px solid #374151;
}

.command-actions {
  display: flex;
  justify-content: flex-end;
}

.tips-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6B7280;
}

.tip-icon {
  color: #3B82F6;
  font-size: 16px;
}



/* 响应式设计 */
@media (max-width: 1200px) {
  .config-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .info-panel {
    order: 0;
  }

  .config-form {
    order: 1;
  }
}

@media (max-width: 768px) {
  .deploy-config {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-section {
    padding: 20px;
  }

  .header-actions {
    align-items: stretch;
    gap: 8px;
  }

  .action-row {
    justify-content: stretch;
  }

  .header-actions .n-button {
    width: 100%;
  }

  .info-panel {
    gap: 16px;
  }
}
</style>
