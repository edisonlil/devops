<template>
  <div class="log-viewer" :style="{ height: height }">
    <n-spin :show="loading" style="height: 100%;">
      <div 
        ref="logContainer"
        class="log-container"
        :style="{
          height: '100%',
          backgroundColor: backgroundColor,
          borderRadius: borderRadius,
          border: border,
          overflow: 'auto',
          padding: '12px',
          fontFamily: 'Consolas, Monaco, Courier New, monospace',
          fontSize: fontSize + 'px',
          lineHeight: lineHeight,
          color: textColor
        }"
        @scroll="handleScroll"
      >
        <div 
          v-if="!log || log.trim() === ''"
          class="empty-state"
          :style="{ color: '#999', textAlign: 'center', padding: '20px' }"
        >
          {{ emptyText }}
        </div>
        <pre 
          v-else
          class="log-content"
          :style="{
            margin: '0',
            padding: '0',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            background: 'transparent'
          }"
        >{{ log }}</pre>
      </div>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from 'vue'

interface Props {
  log?: string
  loading?: boolean
  height?: string
  backgroundColor?: string
  textColor?: string
  fontSize?: number
  lineHeight?: number | string
  borderRadius?: string
  border?: string
  emptyText?: string
  autoScroll?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  log: '',
  loading: false,
  height: '100%',
  backgroundColor: '#1e1e1e',
  textColor: '#e6e6e6',
  fontSize: 13,
  lineHeight: 1.5,
  borderRadius: '6px',
  border: '1px solid #333',
  emptyText: '暂无日志内容',
  autoScroll: true
})

const emit = defineEmits<{
  'reach-top': []
  'reach-bottom': []
  'scroll': [event: Event]
}>()

const logContainer = ref<HTMLElement>()

const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = target
  
  // 检查是否滚动到顶部
  if (scrollTop === 0) {
    emit('reach-top')
  }
  
  // 检查是否滚动到底部
  if (scrollTop + clientHeight >= scrollHeight - 1) {
    emit('reach-bottom')
  }
  
  emit('scroll', event)
}

const scrollToBottom = () => {
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
}

const scrollToTop = () => {
  if (logContainer.value) {
    logContainer.value.scrollTop = 0
  }
}

const scrollTo = (options: { top?: number; behavior?: 'smooth' | 'auto' }) => {
  if (logContainer.value) {
    logContainer.value.scrollTo({
      top: options.top || 0,
      behavior: options.behavior || 'auto'
    })
  }
}

// 监听日志内容变化，自动滚动到底部
watch(() => props.log, () => {
  if (props.autoScroll) {
    nextTick(() => {
      scrollToBottom()
    })
  }
}, { flush: 'post' })

// 组件挂载后滚动到底部
onMounted(() => {
  if (props.autoScroll && props.log) {
    nextTick(() => {
      scrollToBottom()
    })
  }
})

// 暴露方法给父组件
defineExpose({
  scrollToBottom,
  scrollToTop,
  scrollTo
})
</script>

<style scoped>
.log-viewer {
  position: relative;
}

.log-container {
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: #666 #2a2a2a;
}

.log-container::-webkit-scrollbar {
  width: 8px;
}

.log-container::-webkit-scrollbar-track {
  background: #2a2a2a;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb {
  background: #666;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb:hover {
  background: #888;
}

.log-content {
  /* 确保内容不会被滚动条遮挡 */
  padding-right: 8px;
}

/* 深色主题下的文本选择样式 */
.log-container ::selection {
  background: rgba(255, 255, 255, 0.2);
}
</style>
