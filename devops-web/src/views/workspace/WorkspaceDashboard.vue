<template>
  <div class="workspace-dashboard">
    <div class="dashboard-header">
      <h2>工作空间概览</h2>
      <n-space>
        <n-button @click="refreshData" :loading="loading">
          <template #icon>
            <n-icon><Refresh /></n-icon>
          </template>
          刷新数据
        </n-button>
      </n-space>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <div class="stats-grid">
        <n-card class="stat-card">
          <n-statistic label="中间件总数" :value="summary?.overview.totalInstances || 0">
            <template #suffix>个</template>
          </n-statistic>
        </n-card>
        
        <n-card class="stat-card">
          <n-statistic label="运行中" :value="summary?.overview.runningInstances || 0" value-style="color: #52c41a;">
            <template #suffix>个</template>
          </n-statistic>
        </n-card>
        
        <n-card class="stat-card">
          <n-statistic label="异常" :value="summary?.overview.errorInstances || 0" value-style="color: #ff4d4f;">
            <template #suffix>个</template>
          </n-statistic>
        </n-card>
        
        <n-card class="stat-card">
          <n-statistic label="月成本" :value="summary?.overview.totalCost || 0" :precision="2">
            <template #prefix>$</template>
          </n-statistic>
        </n-card>
      </div>
    </div>

    <!-- 资源使用情况 -->
    <div class="resources-section">
      <n-card title="资源使用情况">
        <div class="resources-grid">
          <div class="resource-item">
            <div class="resource-header">
              <span class="resource-label">CPU</span>
              <span class="resource-value">
                {{ summary?.resources.cpu.used || 0 }} / {{ summary?.resources.cpu.total || 0 }} {{ summary?.resources.cpu.unit || 'Cores' }}
              </span>
            </div>
            <n-progress 
              type="line" 
              :percentage="cpuUsagePercentage" 
              :color="getProgressColor(cpuUsagePercentage)"
            />
          </div>
          
          <div class="resource-item">
            <div class="resource-header">
              <span class="resource-label">内存</span>
              <span class="resource-value">
                {{ summary?.resources.memory.used || 0 }} / {{ summary?.resources.memory.total || 0 }} {{ summary?.resources.memory.unit || 'Gi' }}
              </span>
            </div>
            <n-progress 
              type="line" 
              :percentage="memoryUsagePercentage" 
              :color="getProgressColor(memoryUsagePercentage)"
            />
          </div>
          
          <div class="resource-item">
            <div class="resource-header">
              <span class="resource-label">存储</span>
              <span class="resource-value">
                {{ summary?.resources.storage.used || 0 }} / {{ summary?.resources.storage.total || 0 }} {{ summary?.resources.storage.unit || 'Gi' }}
              </span>
            </div>
            <n-progress 
              type="line" 
              :percentage="storageUsagePercentage" 
              :color="getProgressColor(storageUsagePercentage)"
            />
          </div>
        </div>
      </n-card>
    </div>

    <!-- 最近活动 -->
    <div class="activities-section">
      <n-card title="最近活动">
        <n-empty v-if="!summary?.recentActivities?.length" description="暂无活动记录" />
        <div v-else class="activities-list">
          <div 
            v-for="activity in summary.recentActivities" 
            :key="activity.id"
            class="activity-item"
          >
            <div class="activity-icon">
              <n-icon :color="getActivityColor(activity.status)">
                <component :is="getActivityIcon(activity.type)" />
              </n-icon>
            </div>
            <div class="activity-content">
              <div class="activity-title">{{ activity.message }}</div>
              <div class="activity-meta">
                <span>{{ activity.user }}</span>
                <span>{{ formatTime(activity.timestamp) }}</span>
              </div>
            </div>
            <div class="activity-status">
              <n-tag :type="getStatusTagType(activity.status)" size="small">
                {{ getStatusText(activity.status) }}
              </n-tag>
            </div>
          </div>
        </div>
      </n-card>
    </div>

    <!-- 快速操作 -->
    <div class="quick-actions-section">
      <n-card title="快速操作">
        <n-space>
          <n-button type="primary" @click="goToMiddleware">
            <template #icon>
              <n-icon><Rocket /></n-icon>
            </template>
            部署中间件
          </n-button>
          <n-button @click="goToTemplates">
            <template #icon>
              <n-icon><Document /></n-icon>
            </template>
            管理模板
          </n-button>
          <n-button @click="viewInstances">
            <template #icon>
              <n-icon><List /></n-icon>
            </template>
            查看实例
          </n-button>
        </n-space>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { Refresh, Rocket, Document, List, CheckmarkCircle, CloseCircle, Time } from '@vicons/ionicons5'
import { useWorkspaceStore } from '@/stores/workspace'
import type { WorkspaceSummary } from '@/types/workspace'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const workspaceStore = useWorkspaceStore()

const loading = ref(false)
const summary = ref<WorkspaceSummary | null>(null)

const workspaceName = computed(() => route.params.workspaceName as string)

// 计算资源使用百分比
const cpuUsagePercentage = computed(() => {
  if (!summary.value?.resources.cpu) return 0
  const { used, total } = summary.value.resources.cpu
  return total > 0 ? Math.round((used / total) * 100) : 0
})

const memoryUsagePercentage = computed(() => {
  if (!summary.value?.resources.memory) return 0
  const { used, total } = summary.value.resources.memory
  return total > 0 ? Math.round((used / total) * 100) : 0
})

const storageUsagePercentage = computed(() => {
  if (!summary.value?.resources.storage) return 0
  const { used, total } = summary.value.resources.storage
  return total > 0 ? Math.round((used / total) * 100) : 0
})

const getProgressColor = (percentage: number) => {
  if (percentage < 60) return '#52c41a'
  if (percentage < 80) return '#faad14'
  return '#ff4d4f'
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'deploy': return Rocket
    case 'scale': return List
    case 'delete': return CloseCircle
    case 'backup': return Document
    default: return CheckmarkCircle
  }
}

const getActivityColor = (status: string) => {
  switch (status) {
    case 'success': return '#52c41a'
    case 'failed': return '#ff4d4f'
    case 'running': return '#1890ff'
    default: return '#666'
  }
}

const getStatusTagType = (status: string) => {
  switch (status) {
    case 'success': return 'success'
    case 'failed': return 'error'
    case 'running': return 'info'
    default: return 'default'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'success': return '成功'
    case 'failed': return '失败'
    case 'running': return '运行中'
    default: return '未知'
  }
}

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const refreshData = async () => {
  loading.value = true
  try {
    summary.value = await workspaceStore.getWorkspaceSummary(workspaceName.value)
  } catch (error: any) {
    message.error(error.message || '获取工作空间概览失败')
  } finally {
    loading.value = false
  }
}

const goToMiddleware = () => {
  router.push(`/workspace/${workspaceName.value}/middleware`)
}

const goToTemplates = () => {
  router.push(`/workspace/${workspaceName.value}/template`)
}

const viewInstances = () => {
  router.push(`/workspace/${workspaceName.value}/middleware`)
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.workspace-dashboard {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.dashboard-header h2 {
  margin: 0;
  color: #333;
}

.stats-section {
  margin-bottom: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  text-align: center;
}

.resources-section,
.activities-section,
.quick-actions-section {
  margin-bottom: 24px;
}

.resources-grid {
  display: grid;
  gap: 16px;
}

.resource-item {
  margin-bottom: 16px;
}

.resource-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.resource-label {
  font-weight: 500;
  color: #333;
}

.resource-value {
  color: #666;
  font-size: 14px;
}

.activities-list {
  max-height: 300px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  margin-right: 12px;
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.activity-meta {
  font-size: 12px;
  color: #666;
  display: flex;
  gap: 12px;
}

.activity-status {
  margin-left: 12px;
}

@media (max-width: 768px) {
  .workspace-dashboard {
    padding: 16px;
  }
  
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }
}
</style>
