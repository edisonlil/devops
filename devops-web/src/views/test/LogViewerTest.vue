<template>
  <div style="padding: 20px;">
    <h1>Log Viewer 测试</h1>
    
    <div style="margin-bottom: 20px;">
      <n-button @click="generateTestLogs" type="primary">生成测试日志</n-button>
      <n-button @click="clearLogs" style="margin-left: 10px;">清空日志</n-button>
      <n-button @click="toggleLoading" style="margin-left: 10px;">
        {{ loading ? '停止加载' : '开始加载' }}
      </n-button>
    </div>

    <div style="height: 500px; border: 1px solid #ccc; border-radius: 6px;">
      <LogViewer 
        :log="logContent" 
        :loading="loading"
        style="height: 100%;"
      />
    </div>

    <div style="margin-top: 20px; color: #666;">
      当前日志行数: {{ logLines }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import LogViewer from '@femessage/log-viewer'

const logContent = ref('')
const loading = ref(false)
const logLines = ref(0)

const generateTestLogs = () => {
  const logs = []
  const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG']
  const messages = [
    'Application started successfully',
    'Database connection established',
    'User authentication failed',
    'Processing request from client',
    'Cache miss for key: user_123',
    'Memory usage: 85%',
    'Network timeout occurred',
    'File upload completed'
  ]

  for (let i = 0; i < 100; i++) {
    const timestamp = new Date(Date.now() - (100 - i) * 1000).toISOString()
    const level = levels[Math.floor(Math.random() * levels.length)]
    const message = messages[Math.floor(Math.random() * messages.length)]
    logs.push(`[${timestamp}] [${level}] ${message} - Line ${i + 1}`)
  }

  logContent.value = logs.join('\n')
  logLines.value = logs.length
}

const clearLogs = () => {
  logContent.value = ''
  logLines.value = 0
}

const toggleLoading = () => {
  loading.value = !loading.value
}

// 初始化一些测试日志
generateTestLogs()
</script>

<style scoped>
h1 {
  color: #333;
  margin-bottom: 20px;
}
</style>
