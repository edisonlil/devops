<template>
  <div 
    class="function-card" 
    :class="{ disabled: !enabled }"
    @click="handleClick"
  >
    <div class="card-header">
      <div class="icon-wrapper">
        <component :is="iconComponent" class="card-icon" />
      </div>
      <div v-if="stats && stats.length > 0" class="card-stats-header">
        <div v-for="stat in stats" :key="stat.label" class="stat-item-header">
          <span class="stat-value-header">{{ stat.value }}</span>
          <span class="stat-label-header">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <div class="card-content">
      <h3 class="card-title">{{ title }}</h3>
      <p class="card-description">{{ description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Status {
  type: 'success' | 'warning' | 'error' | 'info'
  text: string
}

interface Stat {
  label: string
  value: string | number
}

interface Props {
  title: string
  description: string
  icon: string
  enabled?: boolean
  status?: Status
  stats?: Stat[]
}

const props = withDefaults(defineProps<Props>(), {
  enabled: true
})

const emit = defineEmits<{
  click: []
}>()

// 动态图标组件
const iconComponent = computed(() => {
  // 这里可以根据icon名称返回对应的SVG组件
  // 暂时返回一个通用的SVG模板
  return {
    template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      ${getIconPath(props.icon)}
    </svg>`
  }
})

const getIconPath = (iconName: string): string => {
  const icons: Record<string, string> = {
    middleware: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>',
    application: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="7" y="7" width="10" height="10" rx="1" ry="1"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    monitoring: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    cicd: '<circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>',
    storage: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/>',
    network: '<circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>',
    security: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><circle cx="12" cy="16" r="1"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
  }
  return icons[iconName] || icons.application
}

const handleClick = () => {
  if (props.enabled) {
    emit('click')
  }
}
</script>

<style scoped>
.function-card {
  background: #ffffff;
  border: none;
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
  height: 180px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
}

.function-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
}

.function-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.function-card.disabled:hover {
  transform: none;
  box-shadow: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.icon-wrapper {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.2);
}

.card-icon {
  width: 24px;
  height: 24px;
  color: #ffffff;
}



.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 17px;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0 0 8px 0;
  line-height: 1.3;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
}

.card-description {
  font-size: 14px;
  color: #86868b;
  margin: 0 0 16px 0;
  line-height: 1.4;
  flex: 1;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
}

.card-stats-header {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-start;
}

.stat-item-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 32px;
}

.stat-value-header {
  font-size: 14px;
  font-weight: 600;
  color: #1d1d1f;
  line-height: 1.2;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
}

.stat-label-header {
  font-size: 10px;
  color: #86868b;
  line-height: 1.2;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  text-align: center;
  white-space: nowrap;
}
</style>
