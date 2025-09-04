<template>
  <div class="pipeline-manager">
    <!-- 页面标题区域 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title text-h1">CI/CD 流水线管理</h1>
        <p class="page-subtitle text-subtitle">管理您的持续集成和持续部署流水线</p>
      </div>
      <div class="header-actions">
        <n-button type="primary" @click="createPipeline">
          创建流水线
        </n-button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ totalPipelines }}</div>
          <div class="stat-label">总流水线</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ activePipelines }}</div>
          <div class="stat-label">活跃流水线</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ totalDeployments }}</div>
          <div class="stat-label">总部署次数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ successRate }}%</div>
          <div class="stat-label">成功率</div>
        </div>
      </div>
    </div>

    <!-- 流水线列表 -->
    <div class="pipelines-section">
      <div class="section-header">
        <h2 class="section-title">流水线列表</h2>
        <div class="section-actions">
          <n-input
            v-model:value="searchQuery"
            placeholder="搜索流水线..."
            style="width: 240px"
          />
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredPipelines.length === 0" class="empty-state">
        <h3 class="empty-title">暂无流水线</h3>
        <p class="empty-description">
          {{ searchQuery ? '没有找到匹配的流水线' : '开始创建您的第一个CI/CD流水线' }}
        </p>
        <n-button v-if="!searchQuery" type="primary" @click="createPipeline">
          创建流水线
        </n-button>
      </div>

      <!-- 流水线卡片列表 -->
      <div v-else class="pipelines-grid">
        <div
          v-for="pipeline in filteredPipelines"
          :key="pipeline.id"
          class="pipeline-card"
        >
          <div class="card-header">
            <div class="pipeline-info">
              <h3 class="pipeline-name">{{ pipeline.name }}</h3>
              <div class="pipeline-meta">
                <span class="pipeline-type">{{ pipeline.type }}</span>
                <span class="pipeline-template">{{ pipeline.template }}</span>
              </div>
            </div>
            <div class="pipeline-status">
              <n-tag
                :type="getStatusType(pipeline.status)"
                size="small"
              >
                {{ getStatusText(pipeline.status) }}
              </n-tag>
            </div>
          </div>

          <div class="card-content">
            <div class="pipeline-stats">
              <div class="stat-item">
                <span class="stat-label">部署次数</span>
                <span class="stat-value">{{ pipeline.deployCount }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">最后部署</span>
                <span class="stat-value">
                  {{ pipeline.lastDeployAt ? formatDate(pipeline.lastDeployAt) : '从未部署' }}
                </span>
              </div>
            </div>
          </div>

          <div class="card-actions">
            <n-button
              size="small"
              type="primary"
              @click="executePipeline(pipeline)"
              :loading="pipeline.executing"
            >
              执行
            </n-button>
            <n-button size="small" @click="viewPipeline(pipeline)">
              查看
            </n-button>
            <n-dropdown
              :options="getPipelineMenuOptions(pipeline)"
              @select="handlePipelineAction"
            >
              <n-button size="small" quaternary>
                更多
              </n-button>
            </n-dropdown>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import { usePipelineStore, type Pipeline } from '@/stores/pipeline'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const pipelineStore = usePipelineStore()

// 搜索查询
const searchQuery = ref('')

// 计算属性
const filteredPipelines = computed(() => {
  if (!searchQuery.value) return pipelineStore.pipelines
  return pipelineStore.searchPipelines(searchQuery.value)
})

// 使用store中的计算属性
const { totalPipelines, activePipelines, totalDeployments, successRate } = pipelineStore

// 方法
const createPipeline = () => {
  // 跳转到应用部署页面来创建流水线
  const workspaceName = route.params.workspaceName
  router.push(`/workspace/${workspaceName}/manage/application/deploy`)
}

const executePipeline = async (pipeline: Pipeline) => {
  try {
    message.info(`正在执行流水线: ${pipeline.name}`)

    // 跳转到执行页面显示详细过程
    const workspaceName = route.params.workspaceName
    router.push({
      name: 'PipelineExecution',
      params: {
        workspaceName,
        pipelineId: pipeline.id
      }
    })

  } catch (error) {
    message.error(`流水线执行失败: ${error}`)
  }
}

const viewPipeline = (pipeline: any) => {
  message.info(`查看流水线: ${pipeline.name}`)
  // 这里可以跳转到流水线详情页面
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
    'never': '从未执行',
    'success': '执行成功',
    'failed': '执行失败',
    'running': '执行中'
  }
  return statusMap[status] || '未知'
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

const getPipelineMenuOptions = (pipeline: any) => [
  {
    label: '编辑',
    key: `edit-${pipeline.id}`,
    pipeline
  },
  {
    label: '复制',
    key: `copy-${pipeline.id}`,
    pipeline
  },
  {
    label: '删除',
    key: `delete-${pipeline.id}`,
    pipeline
  }
]

const handlePipelineAction = async (key: string) => {
  const [action, id] = key.split('-')
  const pipeline = pipelineStore.getPipelineById(id)

  switch (action) {
    case 'edit':
      message.info(`编辑流水线: ${pipeline?.name}`)
      break
    case 'copy':
      if (pipeline) {
        try {
          await pipelineStore.createPipeline({
            ...pipeline,
            name: `${pipeline.name} (副本)`
          })
          message.success('流水线复制成功')
        } catch (error) {
          message.error('复制流水线失败')
        }
      }
      break
    case 'delete':
      if (pipeline) {
        try {
          await pipelineStore.deletePipeline(id)
          message.success('流水线删除成功')
        } catch (error) {
          message.error('删除流水线失败')
        }
      }
      break
  }
}

onMounted(() => {
  // 加载流水线数据
  pipelineStore.loadPipelines()
})
</script>

<style scoped>
.pipeline-manager {
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

/* 统计信息样式 */
.stats-section {
  margin-bottom: 32px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-card {
  background: #ffffff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1F2937;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #6B7280;
}

/* 流水线列表样式 */
.pipelines-section {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #E5E7EB;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #F3F4F6;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1F2937;
  margin: 0;
}

/* 空状态样式 */
.empty-state {
  text-align: center;
  padding: 64px 24px;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #1F2937;
  margin: 0 0 8px 0;
}

.empty-description {
  font-size: 14px;
  color: #6B7280;
  margin: 0 0 24px 0;
}

/* 流水线卡片样式 */
.pipelines-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  padding: 24px;
}

.pipeline-card {
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 20px;
  background: #ffffff;
  transition: all 0.2s ease;
}

.pipeline-card:hover {
  border-color: #D1D5DB;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.pipeline-name {
  font-size: 16px;
  font-weight: 600;
  color: #1F2937;
  margin: 0 0 8px 0;
}

.pipeline-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #6B7280;
}

.pipeline-type,
.pipeline-template {
  background: #F3F4F6;
  padding: 2px 8px;
  border-radius: 4px;
}

.card-content {
  margin-bottom: 16px;
}

.pipeline-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-item .stat-label {
  font-size: 12px;
  color: #6B7280;
}

.stat-item .stat-value {
  font-size: 14px;
  font-weight: 500;
  color: #1F2937;
}

.card-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .pipeline-manager {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .pipelines-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}
</style>
