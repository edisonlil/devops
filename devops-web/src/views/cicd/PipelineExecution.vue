<template>
  <div class="pipeline-execution">
    <!-- 页面标题区域 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title text-h1">执行流水线</h1>
        <p class="page-subtitle text-subtitle">{{ pipeline?.name || '加载中...' }}</p>
      </div>
      <div class="header-actions">
        <n-button @click="goBack">
          返回
        </n-button>
      </div>
    </div>

    <!-- 执行信息 -->
    <div class="execution-info" v-if="pipeline">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">流水线名称</span>
          <span class="info-value">{{ pipeline.name }}</span>
        </div>

        <div class="info-item">
          <span class="info-label">模板</span>
          <span class="info-value">{{ pipeline.template }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">执行状态</span>
          <n-tag :type="getStatusType(executionStatus)" size="small">
            {{ getStatusText(executionStatus) }}
          </n-tag>
        </div>
      </div>
    </div>

    <!-- 执行命令 -->
    <div class="command-section">
      <h3 class="section-title">执行命令</h3>
      <div class="command-display">
        <code>{{ pipeline?.command || '加载中...' }}</code>
      </div>
    </div>

    <!-- 执行日志 -->
    <div class="logs-section">
      <h3 class="section-title">执行日志</h3>
      <div class="logs-container">
        <div class="log-entry" v-for="(log, index) in logs" :key="index">
          <span class="log-time">{{ formatTime(log.time) }}</span>
          <span class="log-level" :class="`log-${log.level}`">{{ log.level.toUpperCase() }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
        <div v-if="logs.length === 0" class="empty-logs">
          等待执行开始...
        </div>
      </div>
    </div>

    <!-- 执行控制 -->
    <div class="execution-controls">
      <n-button 
        v-if="!isExecuting && executionStatus !== 'running'" 
        type="primary" 
        @click="startExecution"
        :loading="starting"
      >
        开始执行
      </n-button>
      <n-button 
        v-if="isExecuting" 
        type="error" 
        @click="stopExecution"
      >
        停止执行
      </n-button>
      <n-button 
        v-if="executionStatus === 'success' || executionStatus === 'failed'" 
        @click="restartExecution"
      >
        重新执行
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import { usePipelineStore, type Pipeline } from '@/stores/pipeline'
import { deployApi } from '@/api/deploy'

interface LogEntry {
  time: Date
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
}

const router = useRouter()
const route = useRoute()
const message = useMessage()
const pipelineStore = usePipelineStore()

// 状态管理
const pipeline = ref<Pipeline | null>(null)
const executionStatus = ref<'never' | 'running' | 'success' | 'failed'>('never')
const isExecuting = ref(false)
const starting = ref(false)
const logs = ref<LogEntry[]>([])
const currentHistoryId = ref<string | null>(null)

// 模拟执行过程的定时器
let executionTimer: any = null

// 计算属性
const pipelineId = computed(() => route.params.pipelineId as string)

// 方法
const loadPipeline = async () => {
  try {
    await pipelineStore.loadPipelines()
    const foundPipeline = pipelineStore.getPipelineById(pipelineId.value)

    if (!foundPipeline) {
      message.error('流水线不存在')
      goBack()
      return
    }

    pipeline.value = foundPipeline
  } catch (error) {
    console.error('加载流水线失败:', error)
    message.error('加载流水线失败')
  }
}

const addLog = (level: LogEntry['level'], message: string) => {
  logs.value.push({
    time: new Date(),
    level,
    message
  })
  
  // 自动滚动到底部
  setTimeout(() => {
    const container = document.querySelector('.logs-container')
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, 100)
}

const startExecution = async () => {
  if (!pipeline.value) return

  starting.value = true
  isExecuting.value = true
  executionStatus.value = 'running'
  logs.value = []

  try {
    // 使用store开始执行
    const history = await pipelineStore.startPipelineExecution(pipeline.value.id)
    currentHistoryId.value = history.id

    addLog('info', `开始执行流水线: ${pipeline.value.name}`)
    addLog('info', `执行命令: ${pipeline.value.command}`)

    // 执行真实的远程命令
    await executeRealCommand()

  } catch (error) {
    addLog('error', `执行失败: ${error}`)
    executionStatus.value = 'failed'
    await finishExecution('failed')
  } finally {
    starting.value = false
    isExecuting.value = false
  }
}

const simulateExecution = async () => {
  const steps = [
    { message: '检查配置参数...', delay: 1000 },
    { message: '连接到部署环境...', delay: 1500 },
    { message: '拉取代码仓库...', delay: 2000 },
    { message: '构建应用镜像...', delay: 3000 },
    { message: '推送镜像到仓库...', delay: 2000 },
    { message: '部署到目标环境...', delay: 2500 },
    { message: '验证部署状态...', delay: 1000 }
  ]
  
  for (const step of steps) {
    if (!isExecuting.value) break // 检查是否被停止
    
    addLog('info', step.message)
    await new Promise(resolve => {
      executionTimer = setTimeout(resolve, step.delay)
    })
  }
  
  if (isExecuting.value) {
    // 随机成功或失败（90%成功率）
    const success = Math.random() > 0.1
    
    if (success) {
      addLog('success', '部署成功！应用已启动并运行正常')
      executionStatus.value = 'success'
      await finishExecution('success')
    } else {
      addLog('error', '部署失败：应用启动超时')
      executionStatus.value = 'failed'
      await finishExecution('failed')
    }
  }
}

// 执行真实的远程命令
const executeRealCommand = async () => {
  if (!pipeline.value?.command) {
    throw new Error('流水线命令为空')
  }

  try {
    // 获取当前工作空间
    const workspace = route.params.workspaceName as string
    
    // 发送执行命令请求
    addLog('info', '向远程服务器发送执行请求...')
    const response = await deployApi.executeDevopsCommand(workspace, {
      command: pipeline.value.command,
      workingDir: '/root/devops'
    })

    if (!response.success) {
      throw new Error(response.message || '执行请求失败')
    }

    const executionId = response.data.executionId
    addLog('info', `获得执行ID: ${executionId}`)
    
    // 轮询检查执行状态
    await pollExecutionStatus(workspace, executionId)
    
  } catch (error: any) {
    throw new Error(error.message || '远程执行失败')
  }
}

// 轮询执行状态
const pollExecutionStatus = async (workspace: string, executionId: string) => {
  const pollInterval = 3000 // 3秒轮询一次
  const maxPolls = 1200 // 最多轮询60分钟（1小时）
  let pollCount = 0
  let lastMinutes = -1 // 记录上次输出的分钟数，避免重复输出

  while (pollCount < maxPolls && isExecuting.value) {
    try {
      // 获取执行详情
      const detailsResponse = await deployApi.getExecutionDetails(workspace, executionId)
      
      if (detailsResponse.success) {
        const execution = detailsResponse.data
        
        if (execution.status === 'completed') {
          addLog('success', '部署命令执行成功！')
          executionStatus.value = 'success'
          await finishExecution('success')
          
          // 获取执行日志
          const logsResponse = await deployApi.getExecutionLogs(workspace, executionId)
          if (logsResponse.success && logsResponse.data.logs) {
            logsResponse.data.logs.forEach((logLine: string) => {
              addLog('info', logLine)
            })
          }
          
          return
        } else if (execution.status === 'failed') {
          addLog('error', '部署命令执行失败！')
          executionStatus.value = 'failed'
          await finishExecution('failed')
          
          // 获取错误日志
          const logsResponse = await deployApi.getExecutionLogs(workspace, executionId)
          if (logsResponse.success) {
            if (logsResponse.data.logs) {
              logsResponse.data.logs.forEach((logLine: string) => {
                addLog('error', logLine)
              })
            }
            if (logsResponse.data.stderr) {
              addLog('error', `错误输出: ${logsResponse.data.stderr}`)
            }
          }
          
          return
        } else {
          // 仍在运行中
          const duration = Math.round(execution.duration / 1000)
          const minutes = Math.floor(duration / 60)
          const seconds = duration % 60
          const timeStr = minutes > 0 ? `${minutes}m${seconds}s` : `${seconds}s`
          
          // 只在分钟数变化或特定时间点输出状态
          if (minutes !== lastMinutes && (minutes % 1 === 0 || minutes === 0)) {
            let statusMessage = `执行中... (${timeStr})`
            if (minutes >= 30) {
              statusMessage += ' - 长时间部署通常包括镜像构建和推送'
            } else if (minutes >= 10) {
              statusMessage += ' - 正在构建应用镜像或部署到集群'
            } else if (minutes >= 5) {
              statusMessage += ' - 正在拉取代码和准备构建环境'
            } else if (minutes >= 2) {
              statusMessage += ' - 正在检查配置和连接部署环境'
            }
            
            addLog('info', statusMessage)
            lastMinutes = minutes
          }
        }
      }
      
      // 等待下次轮询
      await new Promise(resolve => setTimeout(resolve, pollInterval))
      pollCount++
      
    } catch (error: any) {
      addLog('warn', `轮询状态失败: ${error.message}`)
      await new Promise(resolve => setTimeout(resolve, pollInterval))
      pollCount++
    }
  }
  
  if (pollCount >= maxPolls) {
    addLog('error', '执行超时 (60分钟)')
    addLog('warn', '部署可能仍在进行中，请稍后手动检查部署状态')
    executionStatus.value = 'failed'
    await finishExecution('failed')
  }
}

const finishExecution = async (status: 'success' | 'failed') => {
  if (!pipeline.value || !currentHistoryId.value) return

  try {
    const logMessages = logs.value.map(log => `[${log.time.toLocaleTimeString()}] ${log.level.toUpperCase()}: ${log.message}`)

    await pipelineStore.finishPipelineExecution(
      pipeline.value.id,
      currentHistoryId.value,
      status,
      logMessages
    )

    // 重新加载流水线数据以获取最新状态
    const updatedPipeline = pipelineStore.getPipelineById(pipeline.value.id)
    if (updatedPipeline) {
      pipeline.value = updatedPipeline
    }
  } catch (error) {
    console.error('完成执行状态更新失败:', error)
  }
}

const stopExecution = async () => {
  isExecuting.value = false
  executionStatus.value = 'failed'

  if (executionTimer) {
    clearTimeout(executionTimer)
    executionTimer = null
  }

  addLog('warn', '执行已被用户停止')
  await finishExecution('failed')
}

const restartExecution = () => {
  executionStatus.value = 'never'
  logs.value = []
  startExecution()
}



const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    'never': 'default',
    'success': 'success',
    'failed': 'error',
    'running': 'warning'
  }
  return statusMap[status] || 'default'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'never': '未执行',
    'success': '执行成功',
    'failed': '执行失败',
    'running': '执行中'
  }
  return statusMap[status] || '未知'
}

const formatTime = (time: Date) => {
  return time.toLocaleTimeString()
}

const goBack = () => {
  const workspaceName = route.params.workspaceName
  router.push(`/workspace/${workspaceName}/manage/cicd`)
}

// 生命周期
onMounted(() => {
  loadPipeline()
})

onUnmounted(() => {
  if (executionTimer) {
    clearTimeout(executionTimer)
  }
})
</script>

<style scoped>
.pipeline-execution {
  padding: 24px;
  background: #ffffff;
  min-height: 100vh;
}

/* 页面标题样式 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
}

.header-content h1.page-title {
  margin: 0 0 8px 0;
}

.header-content .page-subtitle {
  margin: 0;
}

/* 执行信息样式 */
.execution-info {
  background: #ffffff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-label {
  font-size: 14px;
  color: #6B7280;
  font-weight: 500;
}

.info-value {
  font-size: 16px;
  color: #1F2937;
  font-weight: 600;
}

/* 命令和日志样式 */
.command-section,
.logs-section {
  background: #ffffff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1F2937;
  margin: 0 0 16px 0;
}

.command-display {
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  overflow-x: auto;
}

.logs-container {
  background: #1F2937;
  border-radius: 8px;
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
}

.log-entry {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  align-items: baseline;
}

.log-time {
  color: #9CA3AF;
  font-size: 12px;
  min-width: 80px;
}

.log-level {
  font-weight: 600;
  min-width: 60px;
  font-size: 12px;
}

.log-info { color: #60A5FA; }
.log-warn { color: #FBBF24; }
.log-error { color: #F87171; }
.log-success { color: #34D399; }

.log-message {
  color: #F9FAFB;
  flex: 1;
}

.empty-logs {
  color: #9CA3AF;
  text-align: center;
  padding: 32px;
  font-style: italic;
}

/* 执行控制样式 */
.execution-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  padding: 24px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .pipeline-execution {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .info-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .execution-controls {
    flex-direction: column;
    align-items: center;
  }
}
</style>
