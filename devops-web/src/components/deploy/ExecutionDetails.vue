<template>
  <div class="execution-details">
    <n-descriptions :column="2" bordered size="small" class="mb-4">
      <n-descriptions-item label="执行ID">
        {{ execution.id }}
      </n-descriptions-item>
      <n-descriptions-item label="状态">
        <n-tag :type="statusType">
          {{ statusText }}
        </n-tag>
      </n-descriptions-item>
      <n-descriptions-item label="命令">
        <n-text code>{{ execution.command }}</n-text>
      </n-descriptions-item>
      <n-descriptions-item label="参数">
        <n-text code>{{ execution.args.join(' ') }}</n-text>
      </n-descriptions-item>
      <n-descriptions-item label="开始时间">
        <n-time :time="new Date(execution.startTime)" />
      </n-descriptions-item>
      <n-descriptions-item label="结束时间">
        <n-time v-if="execution.endTime" :time="new Date(execution.endTime)" />
        <span v-else>-</span>
      </n-descriptions-item>
      <n-descriptions-item label="退出码" v-if="execution.exitCode !== undefined">
        <n-tag :type="execution.exitCode === 0 ? 'success' : 'error'">
          {{ execution.exitCode }}
        </n-tag>
      </n-descriptions-item>
      <n-descriptions-item label="耗时" v-if="execution.endTime">
        {{ formatDuration(execution.startTime, execution.endTime) }}
      </n-descriptions-item>
    </n-descriptions>

    <!-- 日志输出 -->
    <n-tabs type="line" class="logs-tabs">
      <n-tab-pane name="output" tab="标准输出">
        <LogViewer
          :logs="logs?.output || []"
          :loading="logsLoading"
          :auto-scroll="execution.status === 'running'"
          @refresh="refreshLogs"
        />
      </n-tab-pane>
      <n-tab-pane name="error" tab="错误输出">
        <LogViewer
          :logs="logs?.error || []"
          :loading="logsLoading"
          :auto-scroll="execution.status === 'running'"
          @refresh="refreshLogs"
          type="error"
        />
      </n-tab-pane>
    </n-tabs>

    <!-- 操作按钮 -->
    <n-space class="mt-4">
      <n-button @click="refreshLogs" :loading="logsLoading">
        <template #icon>
          <n-icon><Refresh /></n-icon>
        </template>
        刷新日志
      </n-button>
      <n-button 
        v-if="execution.status === 'running'" 
        type="error" 
        @click="handleCancel"
        :loading="cancelling"
      >
        <template #icon>
          <n-icon><Stop /></n-icon>
        </template>
        取消执行
      </n-button>
      <n-button @click="downloadLogs">
        <template #icon>
          <n-icon><CloudDownload /></n-icon>
        </template>
        下载日志
      </n-button>
    </n-space>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMessage } from 'naive-ui'
import {
  NDescriptions,
  NDescriptionsItem,
  NTag,
  NText,
  NTime,
  NTabs,
  NTabPane,
  NButton,
  NSpace,
  NIcon
} from 'naive-ui'
import { Refresh, Stop, CloudDownload } from '@vicons/ionicons5'
import { deployApi, type CommandExecution } from '@/api/deploy'
import LogViewer from '@/components/deploy/LogViewer.vue'

interface Props {
  execution: CommandExecution
  workspace: string
}

const props = defineProps<Props>()
const message = useMessage()

// 响应式数据
const logs = ref<{ output: string[]; error: string[] } | null>(null)
const logsLoading = ref(false)
const cancelling = ref(false)
let refreshTimer: NodeJS.Timeout | null = null

// 计算属性
const statusType = computed(() => {
  const statusMap = {
    pending: 'default',
    running: 'info',
    completed: 'success',
    failed: 'error',
    cancelled: 'warning'
  }
  return statusMap[props.execution.status] || 'default'
})

const statusText = computed(() => {
  const statusMap = {
    pending: '等待中',
    running: '执行中',
    completed: '完成',
    failed: '失败',
    cancelled: '已取消'
  }
  return statusMap[props.execution.status] || '未知'
})

// 方法
const refreshLogs = async () => {
  logsLoading.value = true
  try {
    const result = await deployApi.getExecutionLogs(props.workspace, props.execution.id)
    logs.value = result.data
  } catch (error: any) {
    message.error(error.response?.data?.message || '获取日志失败')
  } finally {
    logsLoading.value = false
  }
}

const handleCancel = async () => {
  cancelling.value = true
  try {
    await deployApi.cancelExecution(props.workspace, props.execution.id)
    message.success('执行已取消')
    // 触发父组件刷新
    // emit('execution-cancelled')
  } catch (error: any) {
    message.error(error.response?.data?.message || '取消失败')
  } finally {
    cancelling.value = false
  }
}

const downloadLogs = () => {
  if (!logs.value) return
  
  const content = [
    '=== 标准输出 ===',
    ...logs.value.output,
    '',
    '=== 错误输出 ===',
    ...logs.value.error
  ].join('\n')
  
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `execution-${props.execution.id}-logs.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const formatDuration = (startTime: string, endTime: string) => {
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  const duration = end - start
  
  const seconds = Math.floor(duration / 1000) % 60
  const minutes = Math.floor(duration / (1000 * 60)) % 60
  const hours = Math.floor(duration / (1000 * 60 * 60))
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟${seconds}秒`
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds}秒`
  } else {
    return `${seconds}秒`
  }
}

const startAutoRefresh = () => {
  if (props.execution.status === 'running') {
    refreshTimer = setInterval(refreshLogs, 2000) // 每2秒刷新一次
  }
}

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// 监听执行状态变化
watch(() => props.execution.status, (newStatus) => {
  if (newStatus === 'running') {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
})

// 生命周期
onMounted(() => {
  refreshLogs()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.execution-details {
  height: 100%;
}

.logs-tabs {
  height: 400px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-4 {
  margin-top: 16px;
}
</style>