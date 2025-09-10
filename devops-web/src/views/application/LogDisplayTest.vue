<template>
  <div style="padding: 20px;">
    <h2>日志显示优化测试</h2>
    
    <!-- 搜索和过滤 -->
    <div style="margin-bottom: 16px; display: flex; gap: 12px; align-items: center;">
      <n-input
        v-model:value="searchQuery"
        placeholder="搜索日志内容..."
        size="small"
        clearable
        style="max-width: 300px;"
      />
      
      <n-select
        v-model:value="levelFilter"
        placeholder="日志级别"
        size="small"
        clearable
        style="width: 120px;"
        :options="levelOptions"
      />
      
      <span v-if="searchQuery" style="font-size: 12px; color: #666;">
        找到 {{ filteredStats.matches }} 行，共 {{ filteredStats.total }} 行
      </span>
    </div>
    
    <!-- 日志显示 -->
    <div style="height: 500px; border: 1px solid #333; border-radius: 6px; overflow: hidden; display: flex; flex-direction: column;">
      <n-log
        :log="filteredContent"
        :font-size="13"
        :line-height="1.5"
        :hljs="hljs"
        language="log"
        style="height: 100%; background: #1e1e1e; flex: 1;"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import hljs from 'highlight.js/lib/core'

// 注册日志语法高亮
hljs.registerLanguage('log', () => ({
  contains: [
    {
      className: 'number',
      begin: /\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}/
    },
    {
      className: 'string',
      begin: /\[.*?\]/
    },
    {
      className: 'keyword',
      begin: /\b(ERROR|WARN|INFO|DEBUG|TRACE|FATAL)\b/,
      relevance: 10
    },
    {
      className: 'comment',
      begin: /#.*$/
    }
  ]
}))

const searchQuery = ref('')
const levelFilter = ref('')

const levelOptions = [
  { label: 'ERROR', value: 'ERROR' },
  { label: 'WARN', value: 'WARN' },
  { label: 'INFO', value: 'INFO' },
  { label: 'DEBUG', value: 'DEBUG' },
  { label: 'TRACE', value: 'TRACE' }
]

// 模拟日志内容
const logContent = `2024-01-15 10:30:15 [INFO] Application started successfully
2024-01-15 10:30:16 [DEBUG] Loading configuration from config.yaml
2024-01-15 10:30:17 [INFO] Database connection established
2024-01-15 10:30:18 [WARN] Deprecated API endpoint used: /api/v1/users
2024-01-15 10:30:19 [ERROR] Failed to connect to external service: timeout
2024-01-15 10:30:20 [INFO] Retrying connection in 5 seconds
2024-01-15 10:30:25 [INFO] Connection retry successful
2024-01-15 10:30:26 [DEBUG] Processing user request: GET /api/users
2024-01-15 10:30:27 [TRACE] SQL query executed: SELECT * FROM users WHERE active = 1
2024-01-15 10:30:28 [INFO] Request processed successfully
2024-01-15 10:30:29 [ERROR] Validation failed: email format invalid
2024-01-15 10:30:30 [WARN] Rate limit approaching for IP: 192.168.1.100
2024-01-15 10:30:31 [INFO] User authentication successful
2024-01-15 10:30:32 [DEBUG] Cache hit for key: user_profile_123
2024-01-15 10:30:33 [FATAL] Critical system error: out of memory
2024-01-15 10:30:34 [ERROR] Application shutting down due to fatal error`

// 过滤后的日志内容
const filteredContent = computed(() => {
  let lines = logContent.split('\n')
  
  // 级别过滤
  if (levelFilter.value) {
    lines = lines.filter(line => line.includes(levelFilter.value))
  }
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    lines = lines.filter(line => line.toLowerCase().includes(query))
  }
  
  return lines.join('\n')
})

// 统计信息
const filteredStats = computed(() => {
  const totalLines = logContent.split('\n').length
  const filteredLines = filteredContent.value.split('\n').length
  
  return {
    total: totalLines,
    matches: filteredLines
  }
})
</script>

<style scoped>
/* 日志显示优化样式 */
:deep(.n-log .hljs-keyword) {
  font-weight: bold;
}

:deep(.n-log .hljs-number) {
  color: #67c23a !important; /* 时间戳绿色 */
}

:deep(.n-log .hljs-string) {
  color: #e6a23c !important; /* 方括号内容橙色 */
}

:deep(.n-log .hljs-comment) {
  color: #909399 !important; /* 注释灰色 */
  font-style: italic;
}
</style>
