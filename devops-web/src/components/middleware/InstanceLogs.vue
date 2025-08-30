<template>
  <div class="instance-logs">
    <div class="logs-header">
      <n-space>
        <n-select
          v-model:value="selectedLines"
          :options="linesOptions"
          style="width: 120px;"
          size="small"
        />
        <n-button size="small" @click="refreshLogs" :loading="loading">
          <template #icon>
            <n-icon><Refresh /></n-icon>
          </template>
          刷新
        </n-button>
        <n-button size="small" @click="downloadLogs">
          <template #icon>
            <n-icon><Download /></n-icon>
          </template>
          下载
        </n-button>
        <n-button size="small" @click="clearLogs">
          <template #icon>
            <n-icon><Trash /></n-icon>
          </template>
          清空
        </n-button>
        <n-switch 
          v-model:value="autoRefresh" 
          size="small"
          @update:value="handleAutoRefreshChange"
        >
          <template #checked>自动刷新</template>
          <template #unchecked>手动刷新</template>
        </n-switch>
        <n-switch 
          v-model:value="autoScroll" 
          size="small"
        >
          <template #checked>自动滚动</template>
          <template #unchecked>手动滚动</template>
        </n-switch>
      </n-space>
    </div>

    <div class="logs-container" ref="logsContainer">
      <div v-if="loading && !logs.length" class="loading-state">
        <n-spin size="large" />
        <span>加载日志中...</span>
      </div>
      
      <div v-else-if="!logs.length" class="empty-state">
        <n-empty description="暂无日志数据" />
      </div>
      
      <div v-else class="logs-content">
        <div 
          v-for="(log, index) in displayLogs" 
          :key="index"
          class="log-line"
          :class="getLogClass(log)"
        >
          <span class="log-timestamp">{{ formatTimestamp(log) }}</span>
          <span class="log-level" v-if="getLogLevel(log)">{{ getLogLevel(log) }}</span>
          <span class="log-message">{{ getLogMessage(log) }}</span>
        </div>
      </div>
    </div>

    <div class="logs-footer">
      <div class="logs-info">
        <span>显示 {{ displayLogs.length }} 行日志</span>
        <span v-if="lastUpdateTime">最后更新: {{ formatTime(lastUpdateTime) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { Refresh, Download, Trash } from '@vicons/ionicons5'
import { middlewareApi } from '@/api/middleware'
import type { MiddlewareInstance } from '@/types/middleware'

const props = defineProps<{
  instance: MiddlewareInstance
}>()

const message = useMessage()

const loading = ref(false)
const logs = ref<string[]>([])
const selectedLines = ref(100)
const autoRefresh = ref(false)
const autoScroll = ref(true)
const lastUpdateTime = ref<Date | null>(null)
const logsContainer = ref<HTMLElement>()

let refreshTimer: NodeJS.Timeout | null = null

const linesOptions = [
  { label: '50行', value: 50 },
  { label: '100行', value: 100 },
  { label: '200行', value: 200 },
  { label: '500行', value: 500 },
  { label: '1000行', value: 1000 }
]

const displayLogs = computed(() => {
  return logs.value.slice(-selectedLines.value)
})

const getLogClass = (log: string) => {
  const logLower = log.toLowerCase()
  if (logLower.includes('error') || logLower.includes('err') || logLower.includes('fatal')) {
    return 'log-error'
  }
  if (logLower.includes('warn') || logLower.includes('warning')) {
    return 'log-warn'
  }
  if (logLower.includes('info')) {
    return 'log-info'
  }
  if (logLower.includes('debug')) {
    return 'log-debug'
  }
  return 'log-default'
}

const getLogLevel = (log: string) => {
  const patterns = [
    { pattern: /\b(ERROR|ERR|FATAL)\b/i, level: 'ERROR' },
    { pattern: /\b(WARN|WARNING)\b/i, level: 'WARN' },
    { pattern: /\b(INFO)\b/i, level: 'INFO' },
    { pattern: /\b(DEBUG)\b/i, level: 'DEBUG' }
  ]

  for (const { pattern, level } of patterns) {
    if (pattern.test(log)) {
      return level
    }
  }
  return ''
}

const getLogMessage = (log: string) => {
  // 尝试解析结构化日志
  try {
    const jsonMatch = log.match(/\{.*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed.message || parsed.msg || log
    }
  } catch (e) {
    // 不是JSON格式，继续处理
  }

  // 移除时间戳和日志级别，只保留消息内容
  return log.replace(/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[^\s]*\s*/, '')
            .replace(/^\[(ERROR|WARN|INFO|DEBUG)\]\s*/i, '')
            .trim()
}

const formatTimestamp = (log: string) => {
  // 尝试提取时间戳
  const timestampMatch = log.match(/^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[^\s]*)/)
  if (timestampMatch) {
    try {
      const date = new Date(timestampMatch[1])
      return date.toLocaleTimeString('zh-CN')
    } catch (e) {
      return timestampMatch[1]
    }
  }
  
  // 如果没有时间戳，返回当前时间
  return new Date().toLocaleTimeString('zh-CN')
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('zh-CN')
}

const refreshLogs = async () => {
  loading.value = true
  try {
    const response = await middlewareApi.getInstanceLogs(
      props.instance.workspace, 
      props.instance.name, 
      selectedLines.value
    )
    logs.value = response.logs
    lastUpdateTime.value = new Date()
    
    // 自动滚动到底部
    if (autoScroll.value) {
      await nextTick()
      scrollToBottom()
    }
  } catch (error: any) {
    message.error(error.message || '获取日志失败')
  } finally {
    loading.value = false
  }
}

const downloadLogs = () => {
  if (!logs.value.length) {
    message.error('没有可下载的日志')
    return
  }

  const logText = logs.value.join('\n')
  const blob = new Blob([logText], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.instance.name}-logs.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  message.success('日志已下载')
}

const clearLogs = () => {
  logs.value = []
  message.success('日志已清空')
}

const scrollToBottom = () => {
  if (logsContainer.value) {
    const content = logsContainer.value.querySelector('.logs-content')
    if (content) {
      content.scrollTop = content.scrollHeight
    }
  }
}

const handleAutoRefreshChange = (enabled: boolean) => {
  if (enabled) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

const startAutoRefresh = () => {
  if (refreshTimer) return
  
  refreshTimer = setInterval(() => {
    refreshLogs()
  }, 3000) // 每3秒刷新一次
}

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// 监听行数变化，重新获取日志
watch(selectedLines, () => {
  refreshLogs()
})

onMounted(() => {
  refreshLogs()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.instance-logs {
  display: flex;
  flex-direction: column;
  height: 500px;
}

.logs-header {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.logs-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: #666;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.logs-content {
  height: 100%;
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  background: #f8f9fa;
  padding: 12px;
}

.log-line {
  display: flex;
  gap: 8px;
  margin-bottom: 1px;
  padding: 2px 0;
  word-break: break-all;
}

.log-timestamp {
  color: #999;
  min-width: 80px;
  flex-shrink: 0;
}

.log-level {
  min-width: 50px;
  font-weight: 600;
  flex-shrink: 0;
}

.log-message {
  flex: 1;
}

.log-line.log-error {
  background: rgba(255, 77, 79, 0.1);
}

.log-line.log-error .log-level {
  color: #ff4d4f;
}

.log-line.log-warn {
  background: rgba(250, 173, 20, 0.1);
}

.log-line.log-warn .log-level {
  color: #faad14;
}

.log-line.log-info .log-level {
  color: #1890ff;
}

.log-line.log-debug .log-level {
  color: #52c41a;
}

.logs-footer {
  padding: 8px 0;
  border-top: 1px solid #f0f0f0;
  background: white;
}

.logs-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #666;
}

@media (max-width: 768px) {
  .logs-header :deep(.n-space) {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .logs-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .log-line {
    flex-direction: column;
    gap: 2px;
  }
  
  .log-timestamp,
  .log-level {
    min-width: auto;
  }
}
</style>
