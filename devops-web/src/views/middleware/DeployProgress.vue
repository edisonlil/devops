<template>
  <div class="deploy-progress">
    <div class="progress-header">
      <div class="header-left">
        <h2>正在部署 {{ deploymentJob?.config.template_name }}</h2>
        <n-tag :type="getStatusTagType(deploymentJob?.status)" size="large">
          {{ getStatusText(deploymentJob?.status) }}
        </n-tag>
      </div>
      <div class="header-right">
        <n-button 
          v-if="deploymentJob?.status === 'completed'" 
          type="primary" 
          @click="viewInstance"
        >
          查看实例
        </n-button>
        <n-button 
          v-if="deploymentJob?.status === 'failed'" 
          type="primary" 
          @click="retryDeployment"
        >
          重试部署
        </n-button>
      </div>
    </div>

    <div class="progress-content">
      <div class="progress-layout">
        <!-- 左侧进度信息 -->
        <div class="progress-info">
          <!-- 部署进度 -->
          <n-card title="📊 部署进度">
            <div class="progress-section">
              <div class="progress-bar">
                <n-progress 
                  type="line" 
                  :percentage="deploymentJob?.progress || 0"
                  :status="getProgressStatus(deploymentJob?.status)"
                  :height="12"
                />
                <div class="progress-text">
                  {{ deploymentJob?.progress || 0 }}% 完成
                </div>
              </div>

              <div class="progress-steps">
                <div 
                  v-for="(step, index) in deploymentSteps" 
                  :key="index"
                  class="step-item"
                  :class="getStepClass(index)"
                >
                  <div class="step-icon">
                    <n-icon v-if="getStepStatus(index) === 'completed'" color="#52c41a">
                      <CheckmarkCircle />
                    </n-icon>
                    <n-icon v-else-if="getStepStatus(index) === 'running'" color="#1890ff">
                      <Sync />
                    </n-icon>
                    <n-icon v-else-if="getStepStatus(index) === 'failed'" color="#ff4d4f">
                      <CloseCircle />
                    </n-icon>
                    <n-icon v-else color="#d9d9d9">
                      <Ellipse />
                    </n-icon>
                  </div>
                  <div class="step-content">
                    <div class="step-title">{{ step.title }}</div>
                    <div class="step-description">{{ step.description }}</div>
                  </div>
                </div>
              </div>
            </div>
          </n-card>

          <!-- 部署信息 -->
          <n-card title="📋 部署信息">
            <div class="deploy-info">
              <div class="info-item">
                <span class="label">实例名称:</span>
                <span class="value">{{ deploymentJob?.config.instance_name }}</span>
              </div>
              <div class="info-item">
                <span class="label">模板类型:</span>
                <span class="value">{{ deploymentJob?.config.template_name }}</span>
              </div>
              <div class="info-item">
                <span class="label">工作空间:</span>
                <span class="value">{{ deploymentJob?.config.workspace }}</span>
              </div>
              <div class="info-item">
                <span class="label">命名空间:</span>
                <span class="value">{{ deploymentJob?.config.namespace }}</span>
              </div>
              <div class="info-item">
                <span class="label">开始时间:</span>
                <span class="value">{{ formatTime(deploymentJob?.startTime) }}</span>
              </div>
              <div v-if="deploymentJob?.endTime" class="info-item">
                <span class="label">结束时间:</span>
                <span class="value">{{ formatTime(deploymentJob?.endTime) }}</span>
              </div>
              <div class="info-item">
                <span class="label">耗时:</span>
                <span class="value">{{ getDuration() }}</span>
              </div>
            </div>
          </n-card>

          <!-- 错误信息 -->
          <n-card v-if="deploymentJob?.error" title="❌ 错误信息" class="error-card">
            <n-alert type="error" :show-icon="false">
              <pre class="error-text">{{ deploymentJob.error }}</pre>
            </n-alert>
          </n-card>
        </div>

        <!-- 右侧日志面板 -->
        <div class="logs-panel">
          <n-card title="📝 部署日志">
            <template #header-extra>
              <n-space>
                <n-button size="small" @click="refreshLogs" :loading="refreshingLogs">
                  <template #icon>
                    <n-icon><Refresh /></n-icon>
                  </template>
                  刷新
                </n-button>
                <n-button size="small" @click="downloadLogs">
                  <template #icon>
                    <n-icon><Download /></n-icon>
                  </template>
                  下载日志
                </n-button>
                <n-switch 
                  v-model:value="autoScroll" 
                  size="small"
                >
                  <template #checked>自动滚动</template>
                  <template #unchecked>手动滚动</template>
                </n-switch>
              </n-space>
            </template>

            <div class="logs-container" ref="logsContainer">
              <div v-if="!deploymentJob?.logs?.length" class="no-logs">
                <n-empty description="暂无日志" />
              </div>
              <div v-else class="logs-content">
                <div 
                  v-for="(log, index) in deploymentJob.logs" 
                  :key="index"
                  class="log-line"
                  :class="getLogClass(log.level)"
                >
                  <span class="log-timestamp">{{ formatLogTime(log.timestamp) }}</span>
                  <span class="log-level">{{ log.level.toUpperCase() }}</span>
                  <span class="log-message">{{ log.message }}</span>
                </div>
              </div>
            </div>
          </n-card>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="progress-footer">
      <n-space justify="space-between">
        <n-button @click="goBack">
          <template #icon>
            <n-icon><ArrowBack /></n-icon>
          </template>
          返回中间件管理
        </n-button>
        
        <n-space>
          <n-button 
            v-if="deploymentJob?.status === 'running'" 
            @click="cancelDeployment"
            type="error"
          >
            <template #icon>
              <n-icon><Stop /></n-icon>
            </template>
            取消部署
          </n-button>
          <n-button 
            v-if="deploymentJob?.status === 'completed'" 
            type="primary" 
            @click="viewInstance"
          >
            <template #icon>
              <n-icon><Eye /></n-icon>
            </template>
            查看实例详情
          </n-button>
        </n-space>
      </n-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { 
  ArrowBack, 
  CheckmarkCircle, 
  CloseCircle, 
  Ellipse, 
  Sync, 
  Refresh, 
  Download, 
  Stop, 
  Eye 
} from '@vicons/ionicons5'
import { middlewareApi } from '@/api/middleware'
import type { DeploymentJob } from '@/types/middleware'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const deploymentJob = ref<DeploymentJob | null>(null)
const refreshingLogs = ref(false)
const autoScroll = ref(true)
const logsContainer = ref<HTMLElement>()
let pollingTimer: NodeJS.Timeout | null = null

const workspaceName = computed(() => route.params.workspaceName as string)
const deploymentId = computed(() => route.params.deploymentId as string)

// 部署步骤定义
const deploymentSteps = [
  { title: '验证配置', description: '检查部署参数和资源配置' },
  { title: '生成部署文件', description: '根据模板生成Kubernetes配置' },
  { title: '创建存储卷', description: '创建持久化存储资源' },
  { title: '部署应用实例', description: '创建Pod和Service资源' },
  { title: '等待服务就绪', description: '等待应用启动并通过健康检查' },
  { title: '配置网络访问', description: '设置服务暴露和网络策略' }
]

const getStatusTagType = (status?: string) => {
  switch (status) {
    case 'completed': return 'success'
    case 'failed': return 'error'
    case 'running': return 'info'
    case 'pending': return 'warning'
    default: return 'default'
  }
}

const getStatusText = (status?: string) => {
  switch (status) {
    case 'completed': return '部署成功'
    case 'failed': return '部署失败'
    case 'running': return '部署中'
    case 'pending': return '等待中'
    default: return '未知状态'
  }
}

const getProgressStatus = (status?: string) => {
  switch (status) {
    case 'completed': return 'success'
    case 'failed': return 'error'
    case 'running': return 'info'
    default: return 'default'
  }
}

const getStepStatus = (stepIndex: number) => {
  if (!deploymentJob.value) return 'pending'
  
  const progress = deploymentJob.value.progress
  const stepProgress = ((stepIndex + 1) / deploymentSteps.length) * 100
  
  if (deploymentJob.value.status === 'failed' && progress < stepProgress) {
    return stepIndex === Math.floor((progress / 100) * deploymentSteps.length) ? 'failed' : 'pending'
  }
  
  if (progress >= stepProgress) return 'completed'
  if (progress >= stepProgress - (100 / deploymentSteps.length)) return 'running'
  return 'pending'
}

const getStepClass = (stepIndex: number) => {
  const status = getStepStatus(stepIndex)
  return {
    'step-completed': status === 'completed',
    'step-running': status === 'running',
    'step-failed': status === 'failed',
    'step-pending': status === 'pending'
  }
}

const getLogClass = (level: string) => {
  return {
    'log-error': level === 'error',
    'log-warn': level === 'warn',
    'log-info': level === 'info'
  }
}

const formatTime = (timestamp?: string) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}

const formatLogTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN')
}

const getDuration = () => {
  if (!deploymentJob.value?.startTime) return '-'
  
  const start = new Date(deploymentJob.value.startTime).getTime()
  const end = deploymentJob.value.endTime 
    ? new Date(deploymentJob.value.endTime).getTime()
    : Date.now()
  
  const duration = Math.floor((end - start) / 1000)
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  
  return `${minutes}分${seconds}秒`
}

const loadDeploymentStatus = async () => {
  try {
    const response = await middlewareApi.getDeploymentStatus(workspaceName.value, deploymentId.value)
    deploymentJob.value = response
    
    // 自动滚动到底部
    if (autoScroll.value) {
      await nextTick()
      scrollToBottom()
    }
  } catch (error: any) {
    message.error(error.message || '获取部署状态失败')
  }
}

const refreshLogs = async () => {
  refreshingLogs.value = true
  try {
    await loadDeploymentStatus()
  } finally {
    refreshingLogs.value = false
  }
}

const downloadLogs = () => {
  if (!deploymentJob.value?.logs?.length) {
    message.error('没有可下载的日志')
    return
  }

  const logText = deploymentJob.value.logs
    .map(log => `[${formatLogTime(log.timestamp)}] ${log.level.toUpperCase()}: ${log.message}`)
    .join('\n')

  const blob = new Blob([logText], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `deployment-${deploymentId.value}-logs.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  message.success('日志已下载')
}

const scrollToBottom = () => {
  if (logsContainer.value) {
    const container = logsContainer.value.querySelector('.logs-content')
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }
}

const cancelDeployment = () => {
  message.info('取消部署功能开发中...')
}

const retryDeployment = () => {
  message.info('重试部署功能开发中...')
}

const viewInstance = () => {
  router.push(`/workspace/${workspaceName.value}/middleware`)
}

const goBack = () => {
  router.push(`/workspace/${workspaceName.value}/middleware`)
}

// 开始轮询
const startPolling = () => {
  pollingTimer = setInterval(async () => {
    if (deploymentJob.value?.status === 'running' || deploymentJob.value?.status === 'pending') {
      await loadDeploymentStatus()
    } else {
      stopPolling()
    }
  }, 2000)
}

// 停止轮询
const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

onMounted(() => {
  loadDeploymentStatus()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.deploy-progress {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-left h2 {
  margin: 0;
  color: #333;
}

.progress-content {
  margin-bottom: 24px;
}

.progress-layout {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
}

.progress-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.progress-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-text {
  text-align: center;
  font-size: 14px;
  color: #666;
}

.progress-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.step-item.step-running {
  background: rgba(24, 144, 255, 0.1);
}

.step-item.step-completed {
  background: rgba(82, 196, 26, 0.1);
}

.step-item.step-failed {
  background: rgba(255, 77, 79, 0.1);
}

.step-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.step-content {
  flex: 1;
}

.step-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.step-description {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

.deploy-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.info-item .label {
  color: #666;
}

.info-item .value {
  color: #333;
  font-weight: 500;
}

.error-card {
  border-color: #ff4d4f;
}

.error-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
}

.logs-panel {
  height: fit-content;
}

.logs-container {
  height: 500px;
  overflow: hidden;
}

.no-logs {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.logs-content {
  height: 100%;
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  background: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
}

.log-line {
  display: flex;
  gap: 8px;
  margin-bottom: 2px;
  padding: 2px 0;
}

.log-timestamp {
  color: #999;
  min-width: 80px;
}

.log-level {
  min-width: 50px;
  font-weight: 500;
}

.log-message {
  flex: 1;
  word-break: break-all;
}

.log-line.log-error .log-level {
  color: #ff4d4f;
}

.log-line.log-warn .log-level {
  color: #faad14;
}

.log-line.log-info .log-level {
  color: #1890ff;
}

.progress-footer {
  padding: 16px 0;
  border-top: 1px solid #f0f0f0;
  background: white;
  position: sticky;
  bottom: 0;
  z-index: 10;
}

@media (max-width: 1200px) {
  .progress-layout {
    grid-template-columns: 1fr;
  }
  
  .logs-panel {
    order: -1;
  }
}

@media (max-width: 768px) {
  .deploy-progress {
    padding: 16px;
  }
  
  .progress-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .logs-container {
    height: 300px;
  }
}
</style>
