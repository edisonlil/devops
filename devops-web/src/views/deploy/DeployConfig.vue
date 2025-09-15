<template>
  <div class="deploy-config">
    <!-- 页面标题区域 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title text-h1">{{ isEditMode ? '编辑流水线' : '配置部署' }}</h1>
        <p class="page-subtitle text-subtitle">{{ isEditMode ? '修改流水线配置和部署参数' : `配置 ${selectedTemplate?.name} 的部署参数` }}</p>
      </div>
      <div class="header-actions">
        <div class="action-row">
          <n-button size="medium" @click="goBack">
            返回
          </n-button>
        </div>
        <div class="action-row deploy-row">
          <n-button 
            size="medium" 
            @click="savePipeline" 
            :loading="saving"
            :disabled="!canProceed"
          >
            {{ isEditMode ? '更新流水线' : '保存为流水线' }}
          </n-button>
          <n-button 
            type="primary" 
            size="medium" 
            @click="handleDeploy" 
            :loading="deploying"
            :disabled="!canProceed"
          >
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
          <!-- 视图切换选项卡 -->
          <div class="view-tabs">
            <n-tabs 
              v-model:value="currentView" 
              type="segment" 
              size="medium"
              @update:value="handleViewChange"
            >
              <n-tab-pane name="config" tab="📝 配置参数">
              </n-tab-pane>
              <n-tab-pane name="preview" tab="👀 预览模板">
              </n-tab-pane>
            </n-tabs>
          </div>
          <!-- 配置模式下的信息面板 -->
          <div v-show="currentView === 'config'" class="config-info-panel">
            <!-- 模板信息 -->
            <n-card title="模板信息" class="info-card">
              <div class="template-info">
                <div class="info-item">
                  <span class="info-label">模板名称:</span>
                  <span class="info-value">{{ selectedTemplate?.name || '未选择' }}</span>
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
                  复制命令
                </n-button>
              </div>
            </n-card>

            <!-- 部署提示 -->
            <n-card title="部署提示" class="info-card">
              <div class="tips-content">
                <div class="tip-item">
                  <span>确保Git仓库地址可访问</span>
                </div>
                <div class="tip-item">
                  <span>端口范围：30000-32767</span>
                </div>
                <div class="tip-item">
                  <span>部署过程可能需要几分钟</span>
                </div>
              </div>
            </n-card>
          </div>

          <!-- 预览模式下的文件列表 -->
          <div v-show="currentView === 'preview'">
            <n-card title="模板文件" class="info-card">
              <template #header-extra>
                <n-button size="small" quaternary @click="refreshPreview" :loading="renderingPreview">
                  刷新预览
                </n-button>
              </template>

              <n-spin :show="renderingPreview">
                <div v-if="templateFiles.length > 0" class="file-list">
                  <div 
                    v-for="file in templateFiles" 
                    :key="file.value"
                    class="file-item"
                    :class="{ active: selectedFile === file.value }"
                    @click="selectedFile = file.value"
                  >
                    <div class="file-icon">
                      <n-icon><DocumentText /></n-icon>
                    </div>
                    <div class="file-info">
                      <div class="file-name">{{ file.label }}</div>
                      <div class="file-size">{{ getFileSize(file.value) }}</div>
                    </div>
                  </div>
                </div>

                <div v-else class="empty-file-list">
                  <n-empty description="暂无文件">
                    <template #icon>
                      <n-icon size="48"><DocumentText /></n-icon>
                    </template>
                    <template #extra>
                      <n-button size="small" @click="refreshPreview">
                        生成预览
                      </n-button>
                    </template>
                  </n-empty>
                </div>
              </n-spin>
            </n-card>
          </div>
        </div>

        <!-- 右侧内容区域 -->
        <div class="content-area">
          <!-- 配置表单 -->
          <div class="config-form" v-show="currentView === 'config'">
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
                  <label class="form-label">部署类型 *</label>
                  <n-select
                    v-model:value="config.type"
                    :options="deployTypeOptions"
                    placeholder="选择部署类型"
                    :status="errors.type ? 'error' : undefined"
                  />
                  <span v-if="errors.type" class="error-text">{{ errors.type }}</span>
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
                  <label class="form-label">代码来源类型 *</label>
                  <n-radio-group v-model:value="config.sourceType">
                    <n-radio value="git">Git 仓库</n-radio>
                    <n-radio value="upload">上传代码包</n-radio>
                    <n-radio value="local">本地目录</n-radio>
                  </n-radio-group>
                </div>

                <!-- Git 仓库配置 -->
                <template v-if="config.sourceType === 'git'">
                  <div class="form-item full-width">
                    <label class="form-label">Git 仓库地址 *</label>
                    <n-input
                      v-model:value="config.gitUrl"
                      placeholder="https://github.com/user/repo.git"
                      :status="errors.gitUrl ? 'error' : undefined"
                      @blur="handleGitUrlChange"
                      @input="handleGitUrlInput"
                    />
                    <span v-if="errors.gitUrl" class="error-text">{{ errors.gitUrl }}</span>
                  </div>

                  <div class="form-item">
                    <label class="form-label">分支</label>
                    <n-select
                      v-model:value="config.branch"
                      :options="branchOptions"
                      :loading="loadingBranches"
                      placeholder="选择分支"
                      filterable
                      tag
                      :fallback-option="false"
                      @update:value="handleBranchChange"
                    />
                    <div class="form-help" v-if="loadingBranches">
                      正在获取远程分支列表...
                    </div>
                    <div class="form-help" v-else-if="branchOptions.length === 0 && config.gitUrl">
                      无法获取分支列表，请检查仓库地址或网络连接
                    </div>
                  </div>
                </template>

                  <!-- 上传代码包配置 -->
                <template v-if="config.sourceType === 'upload'">
                  <div class="form-item full-width">
                    <label class="form-label">代码包文件 *</label>
                    <n-upload
                      v-model:file-list="uploadFiles"
                      action="#"
                      :max="1"
                      :show-file-list="true"
                      :on-before-upload="handleBeforeUpload"
                      :on-finish="handleUploadFinish"
                      :on-error="handleUploadError"
                      :custom-request="handleCustomUpload"
                      accept=".zip,.tar,.tar.gz,.tar.bz2,.rar,.7z"
                      :disabled="uploading"
                      :directory="false"
                      :multiple="false"
                    >
                      <n-button :disabled="uploading" :loading="uploading">
                        <template #icon>
                          <n-icon>
                            <svg viewBox="0 0 24 24">
                              <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                            </svg>
                          </n-icon>
                        </template>
                        {{ uploading ? '上传中...' : '选择代码包' }}
                      </n-button>
                    </n-upload>
                    <div class="form-help">
                      <n-icon size="14" style="margin-right: 4px;">
                        <svg viewBox="0 0 24 24">
                          <path fill="currentColor" d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z"/>
                        </svg>
                      </n-icon>
                      支持 ZIP、TAR 等压缩格式，优先使用SCP传输（更轻量级），备选SFTP传输
                    </div>
                    <div class="form-help" style="margin-top: 4px; color: #666;">
                      如果服务器不支持SCP，系统会自动切换到SFTP。建议在服务器上安装OpenSSH确保最佳兼容性。
                    </div>
                    <span v-if="errors.upload" class="error-text">{{ errors.upload }}</span>
                  </div>
                  
                  <!-- 解压选项 -->
                  <div class="form-item full-width">
                    <label class="form-label">文件处理选项</label>
                    <n-radio-group v-model:value="config.extractMode">
                      <n-radio value="none">保持压缩格式</n-radio>
                      <n-radio value="auto">自动解压</n-radio>
                    </n-radio-group>
                    <div class="form-help">
                      <n-icon size="14" style="margin-right: 4px;">
                        <svg viewBox="0 0 24 24">
                          <path fill="currentColor" d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z"/>
                        </svg>
                      </n-icon>
                      选择"保持压缩格式"将上传原始压缩文件，选择"自动解压"将解压文件到目录
                    </div>
                  </div>
                  
                  <!-- 显示上传后的远程路径 -->
                  <div class="form-item full-width" v-if="config.staticDir">
                    <label class="form-label">远程路径</label>
                    <n-input
                      v-model:value="config.staticDir"
                      readonly
                      placeholder="上传成功后将显示远程路径"
                    />
                    <div class="form-help">
                      {{ config.extractMode === 'auto' ? '这是解压后的目录路径' : '这是上传的压缩文件路径' }}，将作为 --static-dir 参数传递
                    </div>
                  </div>
                </template>

                <!-- 本地目录配置 -->
                <template v-if="config.sourceType === 'local'">
                  <div class="form-item full-width">
                    <label class="form-label">远程目录路径 *</label>
                    <n-input
                      v-model:value="config.staticDir"
                      placeholder="/path/to/your/project 或 /path/to/dist.tar"
                      :status="errors.staticDir ? 'error' : undefined"
                    />
                    <span v-if="errors.staticDir" class="error-text">{{ errors.staticDir }}</span>
                    <div class="form-help">
                      <n-icon size="14" style="margin-right: 4px;">
                        <svg viewBox="0 0 24 24">
                          <path fill="currentColor" d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z"/>
                        </svg>
                      </n-icon>
                      指定远程服务器上已存在的目录路径或tar包文件
                    </div>
                  </div>
                </template>

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
              <div class="port-config-container">
                <!-- 应用端口配置 -->
                <div class="port-group">
                  <label class="form-label">应用端口</label>
                  <div class="port-list">
                    <div 
                      v-for="(port, index) in config.appPorts" 
                      :key="`app-${index}`"
                      class="port-item"
                    >
                      <n-input-number 
                        v-model="config.appPorts[index]" 
                        placeholder="8080"
                        :min="1"
                        :max="65535"
                        style="flex: 1;"
                      />
                      <n-button 
                        size="small" 
                        text 
                        @click="removeAppPort(index)"
                        style="color: #ef4444; margin-left: 8px;"
                      >
                        <template #icon>
                          <n-icon><Remove /></n-icon>
                        </template>
                      </n-button>
                    </div>
                    <n-button 
                      size="small" 
                      ghost 
                      @click="addAppPort"
                      style="margin-top: 8px;"
                    >
                      <template #icon>
                        <n-icon><Add /></n-icon>
                      </template>
                      添加应用端口
                    </n-button>
                  </div>
                </div>

                <!-- 暴露端口配置 -->
                <div class="port-group">
                  <label class="form-label">暴露端口</label>
                  <div class="port-list">
                    <div 
                      v-for="(port, index) in config.exposePorts" 
                      :key="`expose-${index}`"
                      class="port-item"
                    >
                      <n-input-number 
                        v-model="config.exposePorts[index]" 
                        placeholder="30080"
                        :min="30000"
                        :max="32767"
                        :status="isPortOccupied(port) ? 'error' : undefined"
                        style="flex: 1;"
                        @blur="checkPortOnBlur"
                        @update:value="handlePortChange"
                      />
                      <n-button 
                        size="small" 
                        text 
                        @click="removeExposePort(index)"
                        style="color: #ef4444; margin-left: 8px;"
                      >
                        <template #icon>
                          <n-icon><Remove /></n-icon>
                        </template>
                      </n-button>
                    </div>
                    <n-button 
                      size="small" 
                      ghost 
                      @click="addExposePort"
                      style="margin-top: 8px;"
                    >
                      <template #icon>
                        <n-icon><Add /></n-icon>
                      </template>
                      添加暴露端口
                    </n-button>
                  </div>
                  <div class="form-help">
                    NodePort端口范围通常为30000-32767
                  </div>
                  <div v-if="portOccupied" class="error-text">
                    {{ portOccupiedMessage }}
                  </div>
                </div>
                
                <div class="form-item">
                  <label class="form-label">强制端口</label>
                  <n-switch v-model="config.forcePort" />
                </div>
              </div>
            </div>

            <!-- 高级配置 -->
            <div class="form-section">
              <h3 class="section-title">高级配置</h3>
              <div class="form-grid">
                <div class="form-item full-width" v-if="config.type === 'java' || config.type === 'tomcat'">
                  <label class="form-label">Java 选项</label>
                  <n-input 
                    v-model:value="config.javaOpts" 
                    placeholder="-Xmx512m -Xms256m"
                  />
                  <span class="form-help">示例: -Xmx512m -Xms256m -server</span>
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

          <!-- 模板预览 - 文件内容显示 -->
          <div class="template-preview" v-show="currentView === 'preview'">
            <n-card class="preview-card">
              <template #header>
                <div class="file-header">
                  <span class="file-name">{{ selectedFile || '请选择文件' }}</span>
                  <n-button-group size="small" v-if="selectedFile">
                    <n-button @click="copyToClipboard">复制</n-button>
                    <n-button @click="downloadFile">下载</n-button>
                  </n-button-group>
                </div>
              </template>

              <div class="preview-content">
                <div v-if="selectedFile && fileContent" class="file-content-viewer">
                  <div class="code-viewer">
                    <pre><code>{{ fileContent }}</code></pre>
                  </div>
                </div>

                <div v-else class="empty-preview">
                  <n-empty description="请从左侧选择文件查看内容">
                    <template #icon>
                      <n-icon size="48"><DocumentText /></n-icon>
                    </template>
                  </n-empty>
                </div>
              </div>
            </n-card>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import { usePipelineStore } from '@/stores/pipeline'
import * as workspaceApi from '@/api/workspace'
import { deployApi } from '@/api/deploy'
import { middlewareApi } from '@/api/middleware'
import { DocumentText, Search, Add, Remove } from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const pipelineStore = usePipelineStore()

const deploying = ref(false)
const saving = ref(false)
const errors = ref<Record<string, string>>({})

// 端口占用状态
const portOccupied = ref(false)
const portOccupiedMessage = ref('')
const checkingPort = ref(false)

// 文件上传状态
const uploading = ref(false)
const uploadFiles = ref<any[]>([])

// 分支相关状态
const branchOptions = ref<Array<{ label: string; value: string }>>([])
const loadingBranches = ref(false)
const branchLoadTimeout = ref<NodeJS.Timeout | null>(null)

// 视图切换相关
const currentView = ref('config') // 'config' | 'preview'
const renderingPreview = ref(false)
const renderedTemplate = ref<{ files: Record<string, string> } | null>(null)
const selectedFile = ref('')
const templateFiles = ref<Array<{ label: string; value: string }>>([])

// 文件内容计算属性
const fileContent = computed(() => {
  if (!renderedTemplate.value || !selectedFile.value) {
    return ''
  }
  return renderedTemplate.value.files[selectedFile.value] || ''
})

// 配置数据
const config = ref({
  name: '',
  type: '',
  workspace: 'default',
  namespace: '',
  sourceType: 'git', // 'git'、'upload' 或 'local'
  gitUrl: '',
  branch: '', // 初始为空，将从工作空间配置加载默认值
  staticDir: '', // 本地目录路径
  extractMode: 'none', // 'none': 保持压缩格式, 'auto': 自动解压
  buildTool: '',
  buildEnv: 'prod',
  appPorts: [] as (number | string)[], // 支持多个应用端口
  exposePorts: [] as (number | string)[], // 支持多个暴露端口
  forcePort: false,
  javaOpts: '',
  buildCmds: ''
})

// 选中的模板信息
const selectedTemplate = ref<any>(null)

// 选项数据
const deployTypeOptions = [
  { label: 'Java 应用', value: 'java' },
  { label: 'Vue 应用', value: 'vue' },
  { label: 'Node.js 应用', value: 'nodejs' },
  { label: 'Go 应用', value: 'go' },
  { label: 'Python 应用', value: 'python' },
  { label: 'Nginx 静态站点', value: 'nginx' },
  { label: 'Tomcat 应用', value: 'tomcat' }
]

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

// 是否可以执行操作（不再因为端口占用而禁用）
const canProceed = computed(() => {
  // 仅在正在检查端口时禁用，端口被占用时不禁用操作
  return !checkingPort.value
})

// 是否显示构建工具选择
const showBuildTool = computed(() => {
  return config.value.type === 'java' || config.value.type === 'tomcat'
})

// 当前工作空间
const currentWorkspace = computed(() => {
  const workspaceName = route.params.workspaceName
  return Array.isArray(workspaceName) ? workspaceName[0] : workspaceName || 'default'
})

// 是否为编辑模式
const isEditMode = computed(() => {
  return route.query.edit === 'true'
})

// 生成的命令
const generatedCommand = computed(() => {
  const parts = ['devops', 'run', config.value.type]

  // 根据代码来源类型添加不同的参数
  if (config.value.sourceType === 'git') {
    if (config.value.gitUrl) {
      parts.push('--git-url', `"${config.value.gitUrl}"`)
    }
    if (config.value.branch && config.value.branch !== 'main') {
      parts.push('--git-branch', config.value.branch)
    }
  } else if (config.value.sourceType === 'upload') {
    if (config.value.staticDir) {
      parts.push('--static-dir', `"${config.value.staticDir}"`)
    }
  } else if (config.value.sourceType === 'local') {
    if (config.value.staticDir) {
      parts.push('--static-dir', `"${config.value.staticDir}"`)
    }
  }
  if (config.value.buildTool) {
    parts.push('--build-tool', config.value.buildTool)
  }
  if (selectedTemplate.value?.originalName || selectedTemplate.value?.name) {
    parts.push('--template', selectedTemplate.value.originalName || selectedTemplate.value.name)
  }
  // 使用当前工作空间，优先使用URL中的工作空间参数
  const workspace = currentWorkspace.value || config.value.workspace
  if (workspace) {
    parts.push('--workspace', workspace)
  }
  if (config.value.namespace) {
    parts.push('--namespace', config.value.namespace)
  }
  if (config.value.buildEnv && config.value.buildEnv !== 'prod') {
    parts.push('--build-env', config.value.buildEnv)
  }
  if (config.value.appPorts.length > 0) {
    const appPortsStr = config.value.appPorts.join(',')
    parts.push('--service-port', appPortsStr)
  }

  if (config.value.exposePorts.length > 0) {
    const exposePortsStr = config.value.exposePorts.join(',')
    parts.push('--export-port', exposePortsStr)
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

  // 应用名称放在最后
  if (config.value.name) {
    parts.push(config.value.name)
  }

  return parts.join(' ')
})

// 表单验证
const validateForm = () => {
  errors.value = {}
  
  if (!config.value.name) {
    errors.value.name = '应用名称不能为空'
  }
  
  if (!config.value.type) {
    errors.value.type = '部署类型不能为空'
  }
  
  // 根据代码来源类型验证不同的字段
  if (config.value.sourceType === 'git') {
    if (!config.value.gitUrl) {
      errors.value.gitUrl = 'Git 仓库地址不能为空'
    }
  } else if (config.value.sourceType === 'upload') {
    if (!config.value.staticDir) {
      errors.value.upload = '请上传代码包文件'
    }
  } else if (config.value.sourceType === 'local') {
    if (!config.value.staticDir) {
      errors.value.staticDir = '远程目录路径不能为空'
    }
  }
  
  // 端口占用仅做提示，不影响表单验证
  // if (portOccupied.value) {
  //   errors.value.exposePort = portOccupiedMessage.value
  // }
  
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

// 文件上传相关方法
const handleBeforeUpload = (data: { file: any; fileList: any[] }) => {
  console.log('准备上传文件:', data.file.name, '文件大小:', data.file.size)
  console.log('文件类型:', data.file.type)
  console.log('完整文件信息:', data.file)
  
  // 检查文件大小（限制为100MB）
  const maxSize = 100 * 1024 * 1024 // 100MB
  if (data.file.size > maxSize) {
    message.error('文件大小不能超过100MB')
    return false
  }
  
  // 检查文件类型
  const allowedTypes = ['.zip', '.tar', '.tar.gz', '.tar.bz2', '.rar', '.7z']
  const fileName = data.file.name.toLowerCase()
  const isValidType = allowedTypes.some(type => fileName.endsWith(type))
  
  if (!isValidType) {
    message.error('请选择支持的压缩文件格式')
    return false
  }
  
  console.log('文件验证通过，允许上传')
  return true
}

const handleCustomUpload = async ({ file, onProgress, onFinish, onError }: any) => {
  let isFinished = false // 防止重复完成
  
  const finishUpload = (success: boolean, error?: any) => {
    if (isFinished) return
    isFinished = true
    
    uploading.value = false
    
    if (success) {
      onFinish()
    } else {
      onError(error || new Error('上传失败'))
    }
  }
  
  try {
    uploading.value = true
    console.log('开始上传文件:', file.file.name, '大小:', file.file.size)
    
    // 创建 FormData
    const formData = new FormData()
    formData.append('file', file.file)
    formData.append('workspace', currentWorkspace.value)
    formData.append('extractMode', config.value.extractMode) // 添加解压模式参数
    
    console.log('发送上传请求到:', `/workspaces/${currentWorkspace.value}/deploy/upload-code`)
    
    // 设置超时定时器 - 如果后端不响应，强制结束
    const uploadTimeout = setTimeout(() => {
      if (!isFinished) {
        console.warn('上传操作超时，强制结束')
        finishUpload(false, new Error('上传超时，请检查网络连接或选择较小的文件'))
      }
    }, 300000) // 5分钟绝对超时
    
    // 调用上传 API
    const response = await deployApi.uploadCodePackage(currentWorkspace.value, formData, {
      timeout: 300000, // 5分钟超时
      onUploadProgress: (progressEvent: any) => {
        if (progressEvent.total && !isFinished) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          console.log(`上传进度: ${percentCompleted}%`)
          onProgress({ percent: percentCompleted })
          
          // 如果进度达到100%，延长超时时间等待后端处理
          if (percentCompleted >= 100) {
            clearTimeout(uploadTimeout)
            // 再给5分钟等待后端处理完成
            setTimeout(() => {
              if (!isFinished) {
                console.warn('文件上传完成但后端处理超时，强制结束')
                finishUpload(false, new Error('后端处理超时，但文件可能已上传成功，请检查远程文件'))
              }
            }, 300000)
          }
        }
      }
    })
    
    // 清理超时定时器
    clearTimeout(uploadTimeout)
    
    console.log('上传响应:', response)
    console.log('响应类型:', typeof response)
    console.log('响应键名:', Object.keys(response))
    
    // axios响应拦截器已经返回了response.data，所以这里直接访问属性
    const apiResponse = response as any; // 临时的类型断言
    
    if (apiResponse.success && apiResponse.data?.remotePath) {
      // 设置远程目录路径
      config.value.staticDir = apiResponse.data.remotePath
      
      // 显示传输方法信息
      const transferMethod = apiResponse.data.transferMethod || 'Unknown'
      const available = apiResponse.data.available || { scp: false, sftp: false }
      
      let methodMessage = `文件上传成功（使用${transferMethod}）`
      let availabilityInfo = `服务器支持: SCP(${available.scp ? '✓' : '✗'}), SFTP(${available.sftp ? '✓' : '✗'})`
      
      // 如果SCP不可用，提示用户
      if (!available.scp && !available.sftp) {
        message.warning('注意：服务器不支持SCP和SFTP，可能需要安装OpenSSH')
      } else if (!available.scp) {
        message.info('提示：服务器不支持SCP，已使用SFTP传输。如需更轻量级的传输方式，可安装scp命令')
      }
      
      console.log(availabilityInfo)
      message.success(methodMessage + '\n远程路径: ' + apiResponse.data.remotePath)
      
      // 成功完成上传
      finishUpload(true)
    } else {
      console.error('响应数据检查失败:', {
        success: apiResponse.success,
        hasData: !!apiResponse.data,
        hasRemotePath: !!apiResponse.data?.remotePath,
        responseKeys: Object.keys(apiResponse),
        actualResponse: apiResponse
      })
      throw new Error(apiResponse.message || '上传失败')
    }
  } catch (error: any) {
    console.error('文件上传失败:', error)
    let errorMessage = '文件上传失败'
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = '上传超时，请检查网络连接或选择较小的文件'
    } else if (error.response?.status === 401) {
      errorMessage = '用户认证已过期，请重新登录'
    } else if (error.response?.status === 409) {
      // SSH会话断开，不是认证问题
      const responseData = error.response?.data
      errorMessage = responseData?.message || 'SSH会话已断开'
      
      // 显示更友好的提示信息
      if (responseData?.details?.autoReconnectFailed) {
        // 自动重连失败，提示用户稍后重试
        message.warning(`${errorMessage}\n系统已尝试自动重连但失败，请稍后重试`)
        // 可以考虑添加一个重试按钮
      } else if (responseData?.details?.suggestion) {
        message.warning(`${errorMessage}\n${responseData.details.suggestion}`)
      } else {
        message.warning(errorMessage + '\n请稍后重试或检查网络连接')
      }
      
      finishUpload(false, error)
      return // 直接返回，不显示错误消息
    } else if (error.response?.status === 500) {
      const responseData = error.response?.data
      if (responseData?.message?.includes('服务器不支持SCP和SFTP')) {
        errorMessage = '服务器不支持文件传输，请安装OpenSSH并启用SCP/SFTP服务'
      } else if (responseData?.message?.includes('SCP传输失败')) {
        errorMessage = 'SCP传输失败，请检查服务器scp命令是否可用'
      } else {
        errorMessage = responseData?.message || 'SSH连接问题，请检查服务器连接'
      }
    } else if (error.message) {
      errorMessage = error.message
    }
    
    message.error(errorMessage)
    finishUpload(false, error)
  }
}

const handleUploadFinish = ({ file, event }: any) => {
  console.log('文件上传完成:', file.name)
}

const handleUploadError = ({ file, event }: any) => {
  console.error('文件上传错误:', file.name, event)
  message.error(`文件 ${file.name} 上传失败`)
}

// 获取Git分支列表
const fetchGitBranches = async (gitUrl: string) => {
  if (!gitUrl || loadingBranches.value) return

  // 清除之前的定时器
  if (branchLoadTimeout.value) {
    clearTimeout(branchLoadTimeout.value)
  }

  // 延迟执行，避免频繁请求
  branchLoadTimeout.value = setTimeout(async () => {
    try {
      loadingBranches.value = true
      branchOptions.value = []

      const workspaceName = route.params.workspaceName as string
      const response = await deployApi.getGitBranches(workspaceName, gitUrl)
      console.log('Git分支 API 响应:', response)

      const apiResponse = response as any;
      if (apiResponse.success && apiResponse.data?.branches && apiResponse.data.branches.length > 0) {
        branchOptions.value = apiResponse.data.branches.map((branch: string) => ({
          label: branch,
          value: branch
        }))

        // 如果当前分支不在列表中，添加到列表
        if (config.value.branch && !apiResponse.data.branches.includes(config.value.branch)) {
          branchOptions.value.unshift({
            label: config.value.branch,
            value: config.value.branch
          })
        }
      } else {
        // Git分支获取失败时，如果有工作空间默认分支，则显示它
        if (config.value.branch) {
          branchOptions.value = [{
            label: config.value.branch,
            value: config.value.branch
          }]
          console.log('Git分支获取失败，使用工作空间默认分支:', config.value.branch)
        } else {
          branchOptions.value = []
        }
        message.warning('无法获取远程分支列表，请检查Git仓库地址或网络连接')
      }
    } catch (error: any) {
      console.error('获取Git分支失败:', error)
      // 出错时，如果有工作空间默认分支，则显示它
      if (config.value.branch) {
        branchOptions.value = [{
          label: config.value.branch,
          value: config.value.branch
        }]
        console.log('Git分支获取异常，使用工作空间默认分支:', config.value.branch)
      } else {
        branchOptions.value = []
      }
      message.error('获取Git分支失败，请检查仓库地址或网络连接')
    } finally {
      loadingBranches.value = false
    }
  }, 1000) // 1秒延迟
}

// 处理分支变化
const handleBranchChange = (value: string) => {
  config.value.branch = value
}

// 处理Git URL输入变化
const handleGitUrlInput = () => {
  // 清空分支选项，等待用户完成输入
  if (branchLoadTimeout.value) {
    clearTimeout(branchLoadTimeout.value)
  }
  branchOptions.value = []
}

// 处理Git URL失去焦点
const handleGitUrlChange = () => {
  if (config.value.sourceType === 'git' && config.value.gitUrl) {
    // 验证Git URL格式
    const gitUrlPattern = /^(https?:\/\/|git@|ssh:\/\/)/
    if (gitUrlPattern.test(config.value.gitUrl)) {
      fetchGitBranches(config.value.gitUrl)
    }
  }
}

// 实时端口检查功能
const checkPortOnBlur = async () => {
  if (config.value.exposePorts.length === 0) {
    portOccupied.value = false
    portOccupiedMessage.value = ''
    return
  }

  checkingPort.value = true
  portOccupied.value = false
  portOccupiedMessage.value = ''

  try {
    // 调用端口检查 API
    const response = await middlewareApi.checkPortAvailability(currentWorkspace.value, config.value.exposePorts.map(port => Number(port)))
    const responseData = response as any
    
    console.log(`端口 ${config.value.exposePorts.join(',')} 检查响应:`, responseData)
    
    if (responseData && responseData.length > 0) {
      const serverResult = responseData[0]
      if (serverResult.connected && serverResult.ports && serverResult.ports.length > 0) {
        const unavailablePorts = serverResult.ports.filter((portResult: any) => !portResult.isAvailable)
        console.log(`端口检查结果:`, serverResult.ports)
        if (unavailablePorts.length > 0) {
          portOccupied.value = true
          const portMessages = unavailablePorts.map((portResult: any) => {
            const processInfo = portResult.processInfo
            if (processInfo && processInfo.name) {
              return `端口 ${portResult.port} 已被进程 ${processInfo.name} (PID: ${processInfo.pid}) 占用`
            } else {
              return `端口 ${portResult.port} 已被占用`
            }
          })
          portOccupiedMessage.value = portMessages.join('; ')
        }
      } else if (serverResult.error) {
        portOccupied.value = true
        portOccupiedMessage.value = `检查端口失败: ${serverResult.error}`
      }
    }
    
  } catch (error: any) {
    console.error('端口检查失败:', error)
    portOccupied.value = true
    portOccupiedMessage.value = '端口检查失败，请稍后再试'
  } finally {
    checkingPort.value = false
  }
}

const handlePortChange = () => {
  // 端口变化时清空错误状态
  portOccupied.value = false
  portOccupiedMessage.value = ''
}

// 端口管理函数
const addAppPort = () => {
  config.value.appPorts.push(8080)
}

const removeAppPort = (index: number) => {
  if (config.value.appPorts.length > 1) {
    config.value.appPorts.splice(index, 1)
  }
}

const addExposePort = () => {
  config.value.exposePorts.push(30080)
}

const removeExposePort = (index: number) => {
  if (config.value.exposePorts.length > 1) {
    config.value.exposePorts.splice(index, 1)
  }
}

// 检查特定端口是否被占用
const isPortOccupied = (port: number | string) => {
  // 这里可以根据需要实现端口占用检查逻辑
  return false
}

// 共用的保存流水线方法
const savePipelineInternal = async (workspaceName: string): Promise<string> => {
  pipelineStore.setCurrentWorkspace(workspaceName)

  let pipelineId: string

  if (isEditMode.value) {
    // 编辑模式：更新特定的流水线
    pipelineId = route.query.pipelineId as string
    if (!pipelineId) {
      throw new Error('无效的流水线ID')
    }

    await pipelineStore.updatePipeline(pipelineId, {
      name: config.value.name,
      template: selectedTemplate.value?.originalName || selectedTemplate.value?.name || '',
      config: { ...config.value },
      command: generatedCommand.value
    }, workspaceName)
  } else {
    // 新建模式：检查是否已存在同名流水线
    const existingPipeline = pipelineStore.pipelines.find(p => p.name === config.value.name)

    if (existingPipeline) {
      // 更新现有流水线
      await pipelineStore.updatePipeline(existingPipeline.id, {
        template: selectedTemplate.value?.originalName || selectedTemplate.value?.name || '',
        config: { ...config.value },
        command: generatedCommand.value
      }, workspaceName)
      pipelineId = existingPipeline.id
    } else {
      // 创建新流水线
      const newPipeline = await pipelineStore.createPipeline({
        name: config.value.name,
        template: selectedTemplate.value?.originalName || selectedTemplate.value?.name || '',
        config: { ...config.value },
        command: generatedCommand.value
      }, workspaceName)
      pipelineId = newPipeline.id
    }
  }

  return pipelineId
}

// 处理部署
const handleDeploy = async () => {
  if (!validateForm()) {
    message.error('请填写必填项')
    return
  }

  const workspaceName = route.params.workspaceName as string
  deploying.value = true

  try {
    // 1. 先保存流水线
    const pipelineId = await savePipelineInternal(workspaceName)

    message.success('流水线已保存，正在启动部署...')

    // 2. 跳转到部署详情页并执行部署
    router.push({
      name: 'PipelineExecution',
      params: {
        workspaceName: workspaceName,
        pipelineId: pipelineId
      },
      query: {
        autoStart: 'true' // 标识自动开始执行
      }
    })

  } catch (error: any) {
    console.error('保存流水线或启动部署失败:', error)
    message.error(error.message || '保存流水线失败')
  } finally {
    deploying.value = false
  }
}

// 保存为流水线
const savePipeline = async () => {
  if (!validateForm()) {
    message.error('请填写必填项')
    return
  }

  const workspaceName = route.params.workspaceName as string
  saving.value = true

  try {
    // 使用共用的保存方法
    await savePipelineInternal(workspaceName)

    message.success(`流水线 "${config.value.name}" 已保存`)

    // 跳转到CI/CD管理页面
    setTimeout(() => {
      const workspaceName = route.params.workspaceName
      router.push(`/workspace/${workspaceName}/manage/cicd`)
    }, 1500)

  } catch (error) {
    console.error('保存流水线失败:', error)
    message.error('保存流水线失败')
  } finally {
    saving.value = false
  }
}

// 返回模板选择页面，保持来源参数
const goBack = () => {
  const fromQuery = route.query.from as string
  router.push({
    name: 'TemplateSelection',
    query: fromQuery ? { from: fromQuery } : {}
  })
}

// 视图切换处理
const handleViewChange = (view: string) => {
  if (view === 'preview' && !renderedTemplate.value) {
    // 切换到预览时自动生成预览
    refreshPreview()
  }
}

// 刷新模板预览
const refreshPreview = async () => {
  if (!validateForm()) {
    message.error('请完善配置参数后再预览模板')
    currentView.value = 'config'
    return
  }

  if (!selectedTemplate.value?.originalName && !selectedTemplate.value?.name) {
    message.error('未选择模板')
    return
  }

  renderingPreview.value = true
  try {
    const templateName = selectedTemplate.value.originalName || selectedTemplate.value.name
    console.log(`开始预览模板: ${templateName}`)

    // 构建预览配置
    const previewConfig = {
      name: config.value.name,
      namespace: config.value.namespace,
      appPorts: config.value.appPorts,
      exposePorts: config.value.exposePorts,
      javaOpts: config.value.javaOpts,
      buildEnv: config.value.buildEnv,
      imagePath: `harbor.example.com/${config.value.name}:latest`, // 示例镜像路径
      enableHarbor: true, // 根据实际配置决定
      harborSecretName: 'harbor-secret'
    }

    // 调用API渲染模板
    const response = await deployApi.previewTemplate(
      currentWorkspace.value,
      templateName,
      previewConfig
    )

    const apiResponse = response as any;
    if (apiResponse.success && apiResponse.data?.files) {
      renderedTemplate.value = apiResponse.data
      
      // 构建文件选项
      templateFiles.value = Object.keys(apiResponse.data.files).map(filename => ({
        label: filename,
        value: filename
      }))
      
      // 默认选择第一个文件
      if (templateFiles.value.length > 0) {
        selectedFile.value = templateFiles.value[0].value
      }
      
      message.success(`模板预览生成成功，共生成 ${templateFiles.value.length} 个文件`)
    } else {
      throw new Error(apiResponse.message || '模板预览生成失败')
    }
  } catch (error: any) {
    console.error('模板预览失败:', error)
    const errorMessage = error.response?.data?.message || error.message || '生成模板预览失败'
    message.error(`模板预览失败: ${errorMessage}`)
    
    // 如果是模板路径问题，给出提示
    if (errorMessage.includes('模板目录不存在') || errorMessage.includes('未找到模板目录')) {
      message.warning(`请检查模板 "${selectedTemplate.value?.originalName || selectedTemplate.value?.name || '未知'}" 是否存在于远程服务器`)
    }
  } finally {
    renderingPreview.value = false
  }
}

// 复制到剪贴板
const copyToClipboard = async () => {
  if (!fileContent.value) {
    message.warning('没有内容可复制')
    return
  }
  
  try {
    await navigator.clipboard.writeText(fileContent.value)
    message.success('已复制到剪贴板')
  } catch (error) {
    message.error('复制失败')
    console.error('复制失败:', error)
  }
}

// 下载文件
const downloadFile = () => {
  if (!fileContent.value || !selectedFile.value) {
    message.warning('没有内容可下载')
    return
  }
  
  const blob = new Blob([fileContent.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = selectedFile.value
  a.click()
  URL.revokeObjectURL(url)
  message.success('文件下载成功')
}

// 获取文件大小
const getFileSize = (filename: string) => {
  if (!renderedTemplate.value?.files[filename]) {
    return '0 B'
  }
  
  const content = renderedTemplate.value.files[filename]
  const bytes = new Blob([content]).size
  
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// 根据模板ID推断部署类型
const inferDeployTypeFromTemplate = (templateId: string): string => {
  const template = templateId.toLowerCase()
  
  // 根据模板名称推断类型
  if (template.includes('java') || template.includes('spring') || template.includes('jar')) {
    return 'java'
  } else if (template.includes('vue') || template.includes('react') || template.includes('angular')) {
    return 'vue'
  } else if (template.includes('nodejs') || template.includes('node') || template.includes('express') || template.includes('koa') || template.includes('nestjs')) {
    return 'nodejs'
  } else if (template.includes('go') || template.includes('golang')) {
    return 'go'
  } else if (template.includes('python') || template.includes('django') || template.includes('flask')) {
    return 'python'
  } else if (template.includes('nginx') || template.includes('static')) {
    return 'nginx'
  } else if (template.includes('tomcat')) {
    return 'tomcat'
  }
  
  // 默认返回java类型
  return 'java'
}

// 加载workspace配置并填充默认值
const loadWorkspaceDefaults = async () => {
  try {
    const response = await workspaceApi.getRemoteWorkspaceConfig(currentWorkspace.value)
    console.log('工作空间配置响应:', response)

    // 由于axios响应拦截器，response已经是response.data
    if (response.data?.exists && response.data?.config) {
      const workspaceConfig = response.data.config
      console.log('解析的工作空间配置:', workspaceConfig)
      console.log('BUILD_GIT_BRANCH值:', workspaceConfig.BUILD_GIT_BRANCH)
      console.log('当前分支值:', config.value.branch)

      // 填充默认值到表单（只在字段为空时填充）
      if (workspaceConfig.BUILD_GIT_BRANCH && !config.value.branch) {
        console.log('设置工作空间默认分支:', workspaceConfig.BUILD_GIT_BRANCH)
        config.value.branch = workspaceConfig.BUILD_GIT_BRANCH
        
        // 同时将默认分支添加到选项列表中，确保下拉框能正确显示
        branchOptions.value = [{
          label: workspaceConfig.BUILD_GIT_BRANCH,
          value: workspaceConfig.BUILD_GIT_BRANCH
        }]
        console.log('已添加工作空间默认分支到选项列表')
      }

      if (workspaceConfig.BUILD_GIT_URL && !config.value.gitUrl) {
        config.value.gitUrl = workspaceConfig.BUILD_GIT_URL
        // 设置了默认Git URL后，如果是Git模式，加载分支列表
        if (config.value.sourceType === 'git') {
          // 延迟一点执行，确保DOM更新完成
          setTimeout(() => {
            fetchGitBranches(config.value.gitUrl)
          }, 100)
        }
      }

      if (workspaceConfig.BUILD_K8S_NAMESPACE && !config.value.namespace) {
        config.value.namespace = workspaceConfig.BUILD_K8S_NAMESPACE
      }

      if (workspaceConfig.BUILD_JAVA_OPTS && !config.value.javaOpts) {
        config.value.javaOpts = workspaceConfig.BUILD_JAVA_OPTS
      }

      // 根据BUILD_PLATFORM和项目类型设置默认构建工具
      if (!config.value.buildTool) {
        if (config.value.type === 'java' || config.value.type === 'tomcat') {
          // Java项目默认使用Maven，除非workspace配置了其他工具
          config.value.buildTool = 'maven'
        }
      }

      // 设置默认构建环境为生产环境
      if (!config.value.buildEnv) {
        config.value.buildEnv = 'prod'
      }

    } else {
      console.log('没有找到工作空间配置，使用默认值')
      // 如果没有工作空间配置，设置默认分支
      if (!config.value.branch) {
        config.value.branch = 'main'
        // 同时添加到选项列表
        branchOptions.value = [{
          label: 'main',
          value: 'main'
        }]
      }
    }
  } catch (error) {
    console.warn('加载workspace配置失败:', error)
    // 出错时也设置默认分支
    if (!config.value.branch) {
      config.value.branch = 'main'
      // 同时添加到选项列表
      branchOptions.value = [{
        label: 'main',
        value: 'main'
      }]
    }
    // 不显示错误消息，因为这不是关键功能
  }
}

// 编辑模式：从流水线配置加载数据
const loadPipelineForEdit = async () => {
  const pipelineId = route.query.pipelineId as string
  if (!pipelineId) return
  
  const pipeline = pipelineStore.getPipelineById(pipelineId)
  if (!pipeline) {
    message.error('流水线不存在')
    goBack()
    return
  }
  
  // 从流水线配置恢复表单数据，但保留工作空间默认值
  if (pipeline.config) {
    // 保存当前的工作空间默认值
    const workspaceBranch = config.value.branch
    const workspaceGitUrl = config.value.gitUrl
    const workspaceNamespace = config.value.namespace
    const workspaceJavaOpts = config.value.javaOpts
    
    config.value = {
      ...config.value,
      ...pipeline.config,
      workspace: currentWorkspace.value // 确保工作空间正确
    }

    // 如果流水线中没有设置这些值，则使用工作空间默认值
    if (!pipeline.config.branch && workspaceBranch) {
      config.value.branch = workspaceBranch
    }
    if (!pipeline.config.gitUrl && workspaceGitUrl) {
      config.value.gitUrl = workspaceGitUrl
    }
    if (!pipeline.config.namespace && workspaceNamespace) {
      config.value.namespace = workspaceNamespace
    }
    if (!pipeline.config.javaOpts && workspaceJavaOpts) {
      config.value.javaOpts = workspaceJavaOpts
    }

    // 确保代码来源类型正确设置
    if (!config.value.sourceType) {
      config.value.sourceType = config.value.staticDir ? 'local' : 'git'
    }

    // 如果是Git模式且有URL，加载分支列表
    if (config.value.sourceType === 'git' && config.value.gitUrl) {
      fetchGitBranches(config.value.gitUrl)
    }
  }
  
  // 设置模板信息
  selectedTemplate.value = {
    id: pipeline.template,
    name: pipeline.template.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    originalName: pipeline.template
  }
  
  // 根据模板设置部署类型
  const deployType = inferDeployTypeFromTemplate(pipeline.template)
  config.value.type = deployType
  
  console.log('编辑模式：已加载流水线配置', pipeline)
}

// 初始化
onMounted(async () => {
  const templateId = route.query.template as string
  const isEditMode = route.query.edit === 'true'

  // 设置当前工作空间
  config.value.workspace = currentWorkspace.value

  // 初始化默认端口配置
  if (config.value.appPorts.length === 0) {
    config.value.appPorts = [8080]
  }
  if (config.value.exposePorts.length === 0) {
    config.value.exposePorts = [30080]
  }

  // 先加载workspace默认配置，确保在任何模式下都能获取到默认值
  await loadWorkspaceDefaults()

  if (isEditMode) {
    // 编辑模式：从流水线加载配置，但不覆盖已设置的工作空间默认值
    await loadPipelineForEdit()
  } else if (templateId) {
    // 新建模式：从模板参数设置基础配置
    const deployType = inferDeployTypeFromTemplate(templateId)
    config.value.type = deployType
    
    // 设置模板信息
    selectedTemplate.value = {
      id: templateId,
      name: templateId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()), // 显示名称
      originalName: templateId // 保留原始名称用于命令生成
    }
  }

  // 如果有Git URL，自动加载分支
  if (config.value.sourceType === 'git' && config.value.gitUrl) {
    fetchGitBranches(config.value.gitUrl)
  }
})

// 监听代码来源类型变化
watch(() => config.value.sourceType, (newType) => {
  if (newType === 'git' && config.value.gitUrl) {
    // 切换到Git模式且有URL时，加载分支
    fetchGitBranches(config.value.gitUrl)
  } else if (newType === 'upload' || newType === 'local') {
    // 切换到上传模式或本地模式时，清空分支选项
    branchOptions.value = []
    if (branchLoadTimeout.value) {
      clearTimeout(branchLoadTimeout.value)
    }
  }
})

// 监听部署类型变化，自动设置默认构建工具
watch(() => config.value.type, (newType) => {
  if (newType === 'java' || newType === 'tomcat') {
    // Java项目默认使用Maven
    if (!config.value.buildTool) {
      config.value.buildTool = 'maven'
    }
  } else {
    // 非Java项目清空构建工具
    config.value.buildTool = ''
  }
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (branchLoadTimeout.value) {
    clearTimeout(branchLoadTimeout.value)
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
  padding: 0;
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
  gap: 12px;
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
  width: 100%;
}

.config-layout {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 32px;
  align-items: start;
  width: 100%;
  min-height: calc(100vh - 200px); /* 确保左右面板高度一致 */
}

/* 在超大屏幕上调整比例 */
@media (min-width: 1600px) {
  .config-layout {
    grid-template-columns: 420px 1fr;
    gap: 48px;
  }
}

/* 视图切换选项卡样式 */
.view-tabs {
  margin-bottom: 0px;
}

.view-tabs :deep(.n-tabs-nav) {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 2px;
}

.view-tabs :deep(.n-tabs-tab) {
  border-radius: 6px;
  font-weight: 500;
  padding: 8px 16px !important;
}

/* 右侧内容区域 */
.content-area {
  width: 100%;
}

.config-form {
  background: #FFFFFF;
  border-radius: 12px;
  border: 1px solid #E5E7EB;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: none;
}

.form-section {
  padding: 24px;
  border-bottom: 1px solid #F3F4F6;
}

.form-section:last-child {
  border-bottom: none;
}

/* 在大屏幕上增加内边距 */
@media (min-width: 1400px) {
  .form-section {
    padding: 32px;
  }
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
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

/* 在大屏幕上优化布局 */
@media (min-width: 1200px) {
  .form-grid {
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 28px;
  }
}

@media (min-width: 1400px) {
  .form-grid {
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 32px;
  }
}

@media (min-width: 1600px) {
  .form-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 40px;
  }
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0; /* 防止内容溢出 */
}

.form-item.full-width {
  grid-column: 1 / -1;
}

/* 在大屏幕上增加表单项间距 */
@media (min-width: 1400px) {
  .form-item {
    gap: 12px;
  }
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

.form-help {
  font-size: 12px;
  color: #6B7280;
  margin-top: 4px;
  font-style: italic;
  display: flex;
  align-items: center;
}

.n-radio-group {
  display: flex;
  gap: 16px;
}

.n-radio {
  margin-right: 0;
}

/* 右侧信息面板 */
.info-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0; /* 防止内容溢出 */
}

.info-card {
  border-radius: 12px;
  border: 1px solid #E5E7EB;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.info-card :deep(.n-card-header) {
  padding: 18px 20px 14px 20px;
}

.info-card :deep(.n-card__content) {
  padding: 0 20px 18px 20px;
}

/* 在大屏幕上保持一致的卡片间距 */
@media (min-width: 1400px) {
  .info-card :deep(.n-card-header) {
    padding: 20px 24px 16px 24px;
  }

  .info-card :deep(.n-card__content) {
    padding: 0 24px 20px 24px;
  }
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
  padding: 10px 0;
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
  min-height: 60px;
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
  padding: 6px 0;
}

.tip-icon {
  color: #3B82F6;
  font-size: 16px;
}

/* 模板预览样式 */
.template-preview {
  width: 100%;
}

.preview-card {
  border-radius: 12px;
  border: 1px solid #E5E7EB;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-height: 600px;
}

.preview-content {
  height: 100%;
}

.template-files {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.file-selector {
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e8e9eb;
}

.file-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #e8e9eb;
  overflow: hidden;
}

.file-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e8e9eb;
}

.file-name {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 14px;
  font-weight: 600;
  color: #24292f;
}

.code-viewer {
  flex: 1;
  padding: 16px;
  background: #ffffff;
  overflow: auto;
  max-height: 500px;
}

.code-viewer pre {
  margin: 0;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #24292f;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.code-viewer code {
  background: none;
  padding: 0;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
}

.empty-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
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

  .content-area {
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

/* 文件列表样式 */
.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #e8e9eb;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #ffffff;
}

.file-item:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.file-item.active {
  border-color: #007AFF;
  background: #f0f8ff;
}

.file-icon {
  color: #6b7280;
  font-size: 16px;
  flex-shrink: 0;
}

.file-item.active .file-icon {
  color: #007AFF;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #24292f;
  margin-bottom: 2px;
  word-break: break-all;
}

.file-item.active .file-name {
  color: #007AFF;
}

.file-size {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}

.empty-file-list {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

/* 文件内容查看器样式 */
.file-content-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 配置信息面板样式 */
.config-info-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 预览文件面板样式 - 更紧凑的间距 */
.info-panel > div[v-show] {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 端口配置样式 */
.port-config-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.port-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.port-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.port-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>