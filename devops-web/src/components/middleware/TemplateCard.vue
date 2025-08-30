<template>
  <n-card class="template-card" hoverable @click="$emit('select', template)">
    <div class="card-header">
      <div class="template-icon">{{ template.icon }}</div>
      <div class="template-info">
        <div class="template-name">{{ template.name }}</div>
        <div class="template-type">{{ template.type }}</div>
      </div>
      <div class="template-badges">
        <n-tag 
          size="small" 
          :type="getDifficultyTagType(template.difficulty)"
          class="difficulty-badge"
        >
          {{ getDifficultyText(template.difficulty) }}
        </n-tag>
        <n-tag 
          v-if="template.source === 'workspace'" 
          size="small" 
          type="warning"
          class="source-badge"
        >
          自定义
        </n-tag>
      </div>
    </div>

    <div class="card-content">
      <p class="template-description">{{ template.description }}</p>
      
      <div class="template-meta">
        <div class="meta-item">
          <span class="meta-label">分类:</span>
          <span class="meta-value">{{ getCategoryLabel(template.category) }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">版本:</span>
          <span class="meta-value">{{ template.version }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">作者:</span>
          <span class="meta-value">{{ template.author }}</span>
        </div>
      </div>

      <div class="template-platforms">
        <span class="platforms-label">支持平台:</span>
        <n-space size="small">
          <n-tag 
            v-for="platform in template.platforms" 
            :key="platform"
            size="small"
            type="info"
          >
            {{ getPlatformLabel(platform) }}
          </n-tag>
        </n-space>
      </div>

      <div v-if="template.tags.length" class="template-tags">
        <n-space size="small">
          <n-tag 
            v-for="tag in template.tags" 
            :key="tag"
            size="small"
            :type="getTagType(tag)"
          >
            {{ tag }}
          </n-tag>
        </n-space>
      </div>
    </div>

    <div class="card-footer">
      <n-button type="primary" block @click.stop="$emit('select', template)">
        选择此模板
      </n-button>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import type { MiddlewareTemplate } from '@/types/middleware'

defineProps<{
  template: MiddlewareTemplate
}>()

defineEmits<{
  select: [template: MiddlewareTemplate]
}>()

const getDifficultyTagType = (difficulty: string) => {
  switch (difficulty) {
    case 'simple': return 'success'
    case 'recommended': return 'warning'
    case 'intermediate': return 'info'
    case 'advanced': return 'error'
    default: return 'default'
  }
}

const getDifficultyText = (difficulty: string) => {
  switch (difficulty) {
    case 'simple': return '简单 ✨'
    case 'recommended': return '推荐 ⭐'
    case 'intermediate': return '中级'
    case 'advanced': return '高级'
    default: return difficulty
  }
}

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    'cache': '缓存系统',
    'database': '数据库',
    'message-queue': '消息队列',
    'search': '搜索引擎',
    'other': '其他'
  }
  return labels[category] || category
}

const getPlatformLabel = (platform: string) => {
  const labels: Record<string, string> = {
    'kubernetes': 'Kubernetes',
    'docker-swarm': 'Docker Swarm',
    'docker-compose': 'Docker Compose'
  }
  return labels[platform] || platform
}

const getTagType = (tag: string) => {
  if (tag.includes('推荐') || tag.includes('⭐')) return 'warning'
  if (tag.includes('简单') || tag.includes('✨')) return 'success'
  if (tag.includes('高可用') || tag.includes('集群')) return 'info'
  if (tag.includes('自定义')) return 'warning'
  return 'default'
}
</script>

<style scoped>
.template-card {
  cursor: pointer;
  transition: all 0.2s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.template-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  position: relative;
}

.template-icon {
  font-size: 32px;
  margin-right: 12px;
  flex-shrink: 0;
}

.template-info {
  flex: 1;
  min-width: 0;
}

.template-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  word-break: break-word;
}

.template-type {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.template-badges {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-description {
  color: #666;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
  flex: 1;
}

.template-meta {
  display: grid;
  gap: 4px;
}

.meta-item {
  display: flex;
  font-size: 12px;
}

.meta-label {
  color: #999;
  min-width: 40px;
  margin-right: 8px;
}

.meta-value {
  color: #666;
  font-weight: 500;
}

.template-platforms {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.platforms-label {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.template-tags {
  margin-top: 4px;
}

.card-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

@media (max-width: 768px) {
  .template-card {
    margin-bottom: 16px;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .template-badges {
    position: static;
    flex-direction: row;
    margin-top: 8px;
  }
  
  .template-icon {
    font-size: 28px;
    margin-right: 8px;
    margin-bottom: 8px;
  }
  
  .template-platforms {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
