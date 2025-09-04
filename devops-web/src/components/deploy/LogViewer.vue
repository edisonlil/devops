<template>
  <div class="log-viewer">
    <div class="log-header">
      <n-space justify="space-between">
        <n-space>
          <n-text :depth="2">共 {{ logs.length }} 行日志</n-text>
          <n-tag v-if="type === 'error'" type="error" size="small">错误</n-tag>
          <n-tag v-else type="info" size="small">输出</n-tag>
        </n-space>
        <n-space>
          <n-switch
            v-model:value="autoScroll"
            @update:value="handleAutoScrollChange"
          >
            <template #checked>自动滚动</template>
            <template #unchecked>手动滚动</template>
          </n-switch>
          <n-button size="small" @click="clearLogs">
            <template #icon>
              <n-icon><Trash /></n-icon>
            </template>
            清空
          </n-button>
          <n-button size="small" @click="copyLogs">
            <template #icon>
              <n-icon><Copy /></n-icon>
            </template>
            复制
          </n-button>
          <n-button size="small" @click="$emit('refresh')" :loading="loading">
            <template #icon>
              <n-icon><Refresh /></n-icon>
            </template>
            刷新
          </n-button>
        </n-space>
      </n-space>
    </div>

    <div class="log-content" ref="logContainerRef">
      <n-scrollbar style="max-height: 350px;">
        <div v-if="logs.length === 0" class="empty-logs">
          <n-empty description="暂无日志输出" />
        </div>
        <div v-else class="log-lines">
          <div
            v-for="(line, index) in visibleLogs"
            :key="index"
            class="log-line"
            :class="{ 'log-line-error': type === 'error' }"
          >
            <span class="log-line-number">{{ index + 1 }}</span>
            <span class="log-line-content">{{ line }}</span>
          </div>
        </div>
      </n-scrollbar>
    </div>

    <!-- 日志过滤 -->
    <div class="log-filter">
      <n-input
        v-model:value="filterText"
        placeholder="过滤日志内容..."
        size="small"
        clearable
        @input="handleFilter"
      >
        <template #prefix>
          <n-icon><Search /></n-icon>
        </template>
      </n-input>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import {
  NScrollbar,
  NEmpty,
  NSpace,
  NText,
  NTag,
  NSwitch,
  NButton,
  NIcon,
  NInput
} from 'naive-ui'
import { Trash, Copy, Refresh, Search } from '@vicons/ionicons5'

interface Props {
  logs: string[]
  loading?: boolean
  autoScroll?: boolean
  type?: 'output' | 'error'
}

interface Emits {
  (e: 'refresh'): void
  (e: 'clear'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  autoScroll: true,
  type: 'output'
})

const emit = defineEmits<Emits>()
const message = useMessage()

// 响应式数据
const logContainerRef = ref<HTMLElement>()
const autoScroll = ref(props.autoScroll)
const filterText = ref('')
const visibleLogs = ref<string[]>([])

// 计算属性
const filteredLogs = computed(() => {
  if (!filterText.value) return props.logs
  
  return props.logs.filter(line =>
    line.toLowerCase().includes(filterText.value.toLowerCase())
  )
})

// 方法
const scrollToBottom = () => {
  if (autoScroll.value && logContainerRef.value) {
    nextTick(() => {
      const scrollbar = logContainerRef.value?.querySelector('.n-scrollbar-content')
      if (scrollbar) {
        scrollbar.scrollTop = scrollbar.scrollHeight
      }
    })
  }
}

const handleAutoScrollChange = (value: boolean) => {
  autoScroll.value = value
  if (value) {
    scrollToBottom()
  }
}

const handleFilter = () => {
  visibleLogs.value = filteredLogs.value
  nextTick(() => {
    if (autoScroll.value) {
      scrollToBottom()
    }
  })
}

const clearLogs = () => {
  emit('clear')
  visibleLogs.value = []
}

const copyLogs = async () => {
  try {
    const content = visibleLogs.value.join('\n')
    await navigator.clipboard.writeText(content)
    message.success('日志已复制到剪贴板')
  } catch (error) {
    message.error('复制失败')
  }
}

const updateVisibleLogs = () => {
  visibleLogs.value = filteredLogs.value
  if (autoScroll.value) {
    scrollToBottom()
  }
}

// 监听器
watch(() => props.logs, () => {
  updateVisibleLogs()
})

watch(filteredLogs, () => {
  updateVisibleLogs()
})

// 生命周期
onMounted(() => {
  updateVisibleLogs()
})
</script>

<style scoped>
.log-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #e0e0e6;
  border-radius: 6px;
  overflow: hidden;
}

.log-header {
  padding: 12px;
  background-color: #fafafa;
  border-bottom: 1px solid #e0e0e6;
}

.log-content {
  flex: 1;
  background-color: #1e1e1e;
  color: #ffffff;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.empty-logs {
  padding: 40px;
  text-align: center;
  color: #999;
}

.log-lines {
  padding: 8px 0;
}

.log-line {
  display: flex;
  padding: 2px 0;
  min-height: 18px;
  white-space: pre-wrap;
  word-break: break-all;
}

.log-line:hover {
  background-color: #2d2d30;
}

.log-line-error {
  color: #f56565;
}

.log-line-number {
  display: inline-block;
  width: 50px;
  padding: 0 12px;
  color: #858585;
  text-align: right;
  user-select: none;
  flex-shrink: 0;
  background-color: #252526;
  border-right: 1px solid #3e3e42;
}

.log-line-content {
  padding: 0 12px;
  flex: 1;
  white-space: pre-wrap;
}

.log-filter {
  padding: 8px 12px;
  background-color: #fafafa;
  border-top: 1px solid #e0e0e6;
}

/* 滚动条样式 */
:deep(.n-scrollbar-rail) {
  background-color: #2d2d30;
}

:deep(.n-scrollbar-content) {
  background-color: #1e1e1e;
}
</style>