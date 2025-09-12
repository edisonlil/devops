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
          <n-tag :type="getStatusType(executionStatus)" size="small" class="status-tag">
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
        <div class="command-actions">
          <n-button 
            size="small" 
            @click="copyCommand"
            :disabled="!pipeline?.command"
          >
            复制命令
          </n-button>
        </div>
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
// 跟踪已处理的日志行数，避免重复显示（结构化 logs）
let processedStructuredLogLines = 0
// 分别跟踪 stdout/stderr 的已处理行数，避免混用导致的重复
let processedStdoutLines = 0
let processedStderrLines = 0

// 解码后端可能返回的 \uXXXX 转义序列（更健壮，逐段替换）
const decodeUnicodeEscapes = (text: string): string => {
  if (!text) return text
  try {
    // 直接替换所有 \uXXXX 为对应字符，避免 JSON.parse 失败
    return text.replace(/\\u([0-9a-fA-F]{4})/g, (_match, grp: string) => {
      const code = parseInt(grp, 16)
      return String.fromCharCode(code)
    })
  } catch {
    return text
  }
}

// 统一解析日志级别与消息，同时进行解码
const normalizeLogLine = (raw: string): { level: LogEntry['level']; message: string } => {
  const line = decodeUnicodeEscapes(raw)
  if (line.includes('ERROR:')) {
    return { level: 'error', message: line.replace(/.*ERROR:\s*/, '') }
  }
  if (line.includes('SUCCESS:')) {
    return { level: 'success', message: line.replace(/.*SUCCESS:\s*/, '') }
  }
  if (line.includes('WARN:') || line.includes('WARNING:')) {
    return { level: 'warn', message: line.replace(/.*WARN(?:ING)?:\s*/, '') }
  }
  if (line.includes('OUTPUT:') || line.includes('INFO:')) {
    return { level: 'info', message: line.replace(/.*(?:OUTPUT|INFO):\s*/, '') }
  }
  return { level: 'info', message: line }
}

// 记录已展示过的日志，避免跨来源重复（结构化/stdout/stderr）
const seenLogKeys = new Set<string>()

// 归一化生成去重 Key：移除时间戳等不同步前缀（忽略级别，跨来源统一去重）
const makeLogKey = (_level: LogEntry['level'], message: string): string => {
  // 去掉常见的时间戳前缀，比如 "2025-09-08 10:27:24,003 - INFO - " 或 "[10:14:56] INFO: "
  const cleaned = message
    .replace(/^\[?\d{1,2}:\d{2}:\d{2}\]?\s*/, '')
    .replace(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:,\d+)?\s*-\s*\w+\s*-\s*/, '')
    .trim()
  return cleaned
}

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
  const { level: normalizedLevel, message: normalizedMessage } = normalizeLogLine(message)
  const key = makeLogKey(normalizedLevel, normalizedMessage)
  if (seenLogKeys.has(key)) return
  seenLogKeys.add(key)

  logs.value.push({
    time: new Date(),
    level: normalizedLevel,
    message: normalizedMessage
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
  // 新执行开始，清空去重集合
  seenLogKeys.clear()
  logs.value = []
  processedStructuredLogLines = 0 // 重置日志跟踪
  processedStdoutLines = 0
  processedStderrLines = 0

  try {
    // 使用store开始执行
    const history = await pipelineStore.startPipelineExecution(pipeline.value.id)
    currentHistoryId.value = history.id

    addLog('info', `开始执行流水线: ${pipeline.value.name}`)
    addLog('info', `执行命令: ${pipeline.value.command}`)

    // 执行真实的远程命令
    await executeRealCommand(history.id)

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
const executeRealCommand = async (historyId: string) => {
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

    // 后端返回: { success, data: { executionId, status, message } }
    const success = (response as any)?.success
    const data = (response as any)?.data
    const msg = (response as any)?.message
    if (!success || !data?.executionId) {
      throw new Error(msg || '执行请求失败')
    }
    const executionId = data.executionId
    addLog('info', `获得执行ID: ${executionId}`)
    
    // 将executionId保存到历史记录中，以便后续恢复
    await pipelineStore.updateDeployHistory(historyId, {
      executionId: executionId
    })
    
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

  console.log('开始轮询执行状态，executionId:', executionId)
  
  while (pollCount < maxPolls && isExecuting.value) {
    try {
      // 获取执行详情
      const detailsResponse = await deployApi.getExecutionDetails(workspace, executionId)
      console.log('轮询详情响应:', detailsResponse)
      
      if ((detailsResponse as any).success) {
        const execution = (detailsResponse as any).data
        
        // 获取最新的日志并只显示新增内容
        try {
          const logsResponse = await deployApi.getExecutionLogs(workspace, executionId)
          console.log('日志响应:', logsResponse)
          
          if ((logsResponse as any).success) {
            // 处理结构化日志 - 只显示新的日志条目
            if ((logsResponse as any).data?.logs && (logsResponse as any).data.logs.length > 0) {
              const allLogs = (logsResponse as any).data.logs as string[]
              const newLogs = allLogs.slice(processedStructuredLogLines)
              newLogs.forEach((raw: string) => {
                const logLine = raw.trim()
                if (!logLine) return
                const { level, message } = normalizeLogLine(logLine)
                addLog(level, message)
              })
              processedStructuredLogLines = allLogs.length

              // 实时更新历史记录中的日志，这样重新进入页面时能看到最新日志
              if (currentHistoryId.value && newLogs.length > 0) {
                await pipelineStore.updateDeployHistory(currentHistoryId.value, {
                  logs: allLogs // 使用完整的后端日志列表
                })
              }
            }

            // 如果没有结构化日志，回退到处理标准输出
            else if ((logsResponse as any).data?.stdout) {
              const allStdoutLines = (logsResponse as any).data.stdout.split('\n')
              const newStdoutLines = allStdoutLines.slice(processedStdoutLines)
              newStdoutLines.forEach((raw: string) => {
                const line = raw.trim()
                if (!line) return
                const { level, message } = normalizeLogLine(line)
                addLog(level, message)
              })
              processedStdoutLines = allStdoutLines.length
            }

            // 处理错误输出日志（独立指针，避免与 stdout/结构化混用造成重复）
            if ((logsResponse as any).data?.stderr) {
              const allStderrLines = (logsResponse as any).data.stderr.split('\n')
              const newStderrLines = allStderrLines.slice(processedStderrLines)
              newStderrLines.forEach((raw: string) => {
                const line = raw.trim()
                if (!line) return
                const decoded = decodeUnicodeEscapes(line)
                addLog('error', decoded)
              })
              processedStderrLines = allStderrLines.length
            }
          }
        } catch (logError) {
          console.warn('获取日志失败，但继续轮询:', logError)
          // 不影响主流程，继续轮询
        }
        
        if (execution.status === 'completed') {
          addLog('success', '部署命令执行成功！')
          executionStatus.value = 'success'
          await finishExecution('success')
          return
        } else if (execution.status === 'failed') {
          addLog('error', '部署命令执行失败！')
          executionStatus.value = 'failed'
          await finishExecution('failed')
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
  // 重启执行前清空去重集合
  seenLogKeys.clear()
  processedStructuredLogLines = 0 // 重置日志跟踪
  processedStdoutLines = 0
  processedStderrLines = 0
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

// 已移除图标方法，保持简单标签展示

const formatTime = (time: Date) => {
  return time.toLocaleTimeString()
}

// 恢复执行状态
const restoreExecutionState = async () => {
  if (!pipeline.value) return
  
  try {
    console.log('开始恢复执行状态，流水线ID:', pipeline.value.id)
    
    // 获取流水线的最新执行历史
    const history = pipelineStore.getLatestExecutionHistory(pipeline.value.id)
    console.log('获取到的执行历史:', history)
    
    if (!history) {
      console.log('没有找到执行历史')
      return
    }
    
    // 设置当前执行ID
    currentHistoryId.value = history.id
    
    // 根据历史记录恢复状态
    if (history.status === 'running') {
      console.log('恢复运行中的流水线')
      
      // 如果还在运行中，恢复执行状态并继续轮询
      executionStatus.value = 'running'
      isExecuting.value = true
      
      // 恢复日志
      logs.value = [] // 清空当前日志
      // 恢复前清空去重集合
      seenLogKeys.clear()
      if (history.logs && history.logs.length > 0) {
        console.log('恢复历史日志，共', history.logs.length, '条')
        
        history.logs.forEach(logLine => {
          // 解析时间戳和级别
          if (logLine.includes('ERROR:')) {
            addLog('error', logLine.replace(/.*ERROR:\s*/, ''))
          } else if (logLine.includes('OUTPUT:')) {
            addLog('info', logLine.replace(/.*OUTPUT:\s*/, ''))
          } else if (logLine.includes('SUCCESS:')) {
            addLog('success', logLine.replace(/.*SUCCESS:\s*/, ''))
          } else if (logLine.includes('INFO:')) {
            addLog('info', logLine.replace(/.*INFO:\s*/, ''))
          } else {
            addLog('info', logLine)
          }
        })
        
        // 设置已处理的日志行数，这样轮询时只获取新的日志
        processedStructuredLogLines = history.logs.length
        processedStdoutLines = 0
        processedStderrLines = 0
      } else {
        processedStructuredLogLines = 0
        processedStdoutLines = 0
        processedStderrLines = 0
      }
      
      addLog('info', '恢复执行状态，继续监控部署进度...')
      
      // 继续执行轮询
      await continueExecution()
    } else {
      // 如果已完成，显示最终状态和日志
      executionStatus.value = history.status
      
      if (history.logs && history.logs.length > 0) {
        logs.value = []
        history.logs.forEach(logLine => {
          if (logLine.includes('ERROR:')) {
            addLog('error', logLine.replace(/.*ERROR:\s*/, ''))
          } else if (logLine.includes('OUTPUT:')) {
            addLog('info', logLine.replace(/.*OUTPUT:\s*/, ''))
          } else if (logLine.includes('SUCCESS:')) {
            addLog('success', logLine.replace(/.*SUCCESS:\s*/, ''))
          } else if (logLine.includes('INFO:')) {
            addLog('info', logLine.replace(/.*INFO:\s*/, ''))
          } else {
            addLog('info', logLine)
          }
        })
      }
      
      addLog('info', `流水线执行已完成，状态: ${history.status}`)
    }
  } catch (error) {
    console.error('恢复执行状态失败:', error)
    addLog('error', '恢复执行状态失败')
  }
}

// 继续执行轮询（用于恢复运行中的流水线）
const continueExecution = async () => {
  if (!pipeline.value || !currentHistoryId.value) return
  
  try {
    console.log('尝试继续执行，historyId:', currentHistoryId.value)
    
    // 从pipeline store中获取execution ID
    const history = pipelineStore.getExecutionHistoryById(currentHistoryId.value)
    console.log('获取到的历史记录:', history)
    
    if (!history || !history.executionId) {
      console.error('无法获取执行ID:', history)
      addLog('error', '无法获取执行ID，无法继续监控')
      addLog('warn', '这可能是因为流水线是在老版本中执行的，缺少executionId信息')
      executionStatus.value = 'failed'
      await finishExecution('failed')
      return
    }
    
    console.log('恢复监控执行ID:', history.executionId)
    addLog('info', `恢复监控执行ID: ${history.executionId}`)
    
    // 获取当前工作空间
    const workspace = route.params.workspaceName as string
    
    // 继续轮询执行状态
    await pollExecutionStatus(workspace, history.executionId)
    
  } catch (error: any) {
    console.error('恢复执行失败:', error)
    addLog('error', `恢复执行失败: ${error.message}`)
    executionStatus.value = 'failed'
    await finishExecution('failed')
  }
}

const goBack = () => {
  const workspaceName = route.params.workspaceName
  router.push(`/workspace/${workspaceName}/manage/cicd`)
}

// 复制执行命令
const copyCommand = async () => {
  if (!pipeline.value?.command) {
    message.warning('没有可复制的命令')
    return
  }
  
  try {
    await navigator.clipboard.writeText(pipeline.value.command)
    message.success('命令已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    message.error('复制失败，请手动复制')
  }
}

// 生命周期
onMounted(async () => {
  console.log('PipelineExecution页面挂载，路由查询参数:', route.query)

  await loadPipeline()

  // 检查是否是查看模式，如果是则恢复执行状态
  if (route.query.view === 'true') {
    console.log('检测到查看模式，开始恢复执行状态')
    await restoreExecutionState()
  } else if (route.query.autoStart === 'true') {
    // 检查是否是自动开始模式（从部署配置页面跳转过来）
    console.log('检测到自动开始模式，立即开始执行流水线')
    // 等待一小段时间确保页面完全加载
    setTimeout(() => {
      startExecution()
    }, 500)
  } else {
    console.log('非查看模式，跳过状态恢复')
  }
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

.status-tag { padding: 2px 8px; font-size: 12px; line-height: 18px; }

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
  position: relative;
}

.command-actions {
  position: absolute;
  top: 12px;
  right: 12px;
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
