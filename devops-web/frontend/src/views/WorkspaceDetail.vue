<template>
  <div class="workspace-detail">
    <div class="detail-container">
      <div class="detail-header">
        <div class="workspace-info">
          <div class="workspace-icon">
            <el-icon><Box /></el-icon>
          </div>
          <div class="workspace-meta">
            <h1 class="workspace-name">{{ workspace.name }}</h1>
            <div class="workspace-tags">
              <el-tag type="info">{{ workspace.platform }}</el-tag>
              <span class="created-time">创建于 {{ formatDate(workspace.createdAt) }}</span>
            </div>
          </div>
        </div>
        <div class="detail-actions">
          <el-button @click="editWorkspace">
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
          <el-button type="primary" @click="openWorkbench">
            <el-icon><Monitor /></el-icon>
            进入工作台
          </el-button>
        </div>
      </div>

      <div class="detail-content">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="配置信息" name="config">
            <div class="config-section">
              <h3 class="section-title">基础配置</h3>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="工作空间名称">
                  {{ workspace.name }}
                </el-descriptions-item>
                <el-descriptions-item label="构建平台">
                  {{ workspace.platform }}
                </el-descriptions-item>
                <el-descriptions-item label="Harbor 地址">
                  {{ workspace.harborUrl || '未配置' }}
                </el-descriptions-item>
                <el-descriptions-item label="创建时间">
                  {{ formatDateTime(workspace.createdAt) }}
                </el-descriptions-item>
                <el-descriptions-item label="最后更新" v-if="workspace.updatedAt">
                  {{ formatDateTime(workspace.updatedAt) }}
                </el-descriptions-item>
              </el-descriptions>

              <div v-if="workspace.platform === 'KUBERNETES'" class="k8s-config">
                <h3 class="section-title">Kubernetes 配置</h3>
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="Namespace">
                    {{ workspace.namespace || '未配置' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="Kubeconfig 路径">
                    {{ workspace.kubeconfigPath || '未配置' }}
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="作业列表" name="jobs">
            <div class="jobs-section">
              <div class="jobs-header">
                <h3 class="section-title">作业列表</h3>
                <el-button type="primary" size="small" @click="createJob">
                  <el-icon><Plus /></el-icon>
                  新建作业
                </el-button>
              </div>
              
              <div v-if="jobs.length === 0" class="empty-jobs">
                <el-icon class="empty-icon"><Box /></el-icon>
                <p>还没有作业</p>
                <el-button type="primary" @click="createJob">
                  <el-icon><Plus /></el-icon>
                  创建第一个作业
                </el-button>
              </div>

              <div v-else class="jobs-list">
                <div 
                  v-for="job in jobs"
                  :key="job.id"
                  class="job-item"
                  @click="viewJob(job)"
                >
                  <div class="job-info">
                    <h4 class="job-name">{{ job.name }}</h4>
                    <p class="job-desc">{{ job.template }} • {{ job.branch }}</p>
                  </div>
                  <div class="job-status">
                    <el-tag :type="getStatusType(job.status)" size="small">
                      {{ getStatusText(job.status) }}
                    </el-tag>
                  </div>
                  <div class="job-time">
                    {{ formatTime(job.lastDeploy) }}
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="部署历史" name="history">
            <div class="history-section">
              <h3 class="section-title">部署历史</h3>
              <div class="history-list">
                <div 
                  v-for="record in deployHistory"
                  :key="record.id"
                  class="history-item"
                >
                  <div class="history-icon">
                    <el-icon :class="getHistoryIconClass(record.status)">
                      <component :is="getHistoryIcon(record.status)" />
                    </el-icon>
                  </div>
                  <div class="history-content">
                    <div class="history-title">{{ record.jobName }}</div>
                    <div class="history-desc">{{ record.description }}</div>
                    <div class="history-time">{{ formatDateTime(record.createdAt) }}</div>
                  </div>
                  <div class="history-status">
                    <el-tag :type="getStatusType(record.status)" size="small">
                      {{ getStatusText(record.status) }}
                    </el-tag>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../api/index.js'

const router = useRouter()
const route = useRoute()
const emit = defineEmits(['update-header'])

// 响应式数据
const workspace = ref({})
const jobs = ref([])
const deployHistory = ref([])
const activeTab = ref('config')

// 方法
const loadWorkspace = async () => {
  try {
    const response = await api.get(`/workspace/${route.params.id}`)
    workspace.value = {
      ...response.data,
      platform: response.data.config?.BUILD_PLATFORM || 'Docker',
      harborUrl: response.data.config?.BUILD_HARBOR_ADDRESS,
      namespace: response.data.config?.BUILD_K8S_NAMESPACE,
      kubeconfigPath: response.data.config?.BUILD_K8S_KUBECONFIG,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  } catch (error) {
    console.error('加载工作空间失败:', error)
    ElMessage.error('加载工作空间失败')
  }
}

const loadJobs = () => {
  // 模拟作业数据
  jobs.value = [
    {
      id: '1',
      name: '用户服务',
      template: 'Java Spring Boot',
      branch: 'main',
      status: 'running',
      lastDeploy: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: '2',
      name: '订单服务',
      template: 'Java Spring Boot',
      branch: 'develop',
      status: 'success',
      lastDeploy: new Date(Date.now() - 24 * 60 * 60 * 1000)
    }
  ]
}

const loadDeployHistory = () => {
  // 模拟部署历史
  deployHistory.value = [
    {
      id: '1',
      jobName: '用户服务',
      description: '部署到生产环境',
      status: 'success',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: '2',
      jobName: '订单服务',
      description: '部署到测试环境',
      status: 'failed',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    },
    {
      id: '3',
      jobName: '前端应用',
      description: '部署到生产环境',
      status: 'success',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    }
  ]
}

const editWorkspace = () => {
  router.push(`/workspace/${route.params.id}/edit`)
}

const openWorkbench = () => {
  router.push(`/workspace/${route.params.id}/workbench`)
}

const createJob = () => {
  router.push(`/workspace/${route.params.id}/job/create`)
}

const viewJob = (job) => {
  router.push(`/workspace/${route.params.id}/job/${job.id}`)
}

const getStatusType = (status) => {
  const types = {
    running: 'success',
    success: 'info',
    failed: 'danger',
    pending: 'warning'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    running: '运行中',
    success: '已完成',
    failed: '失败',
    pending: '等待中'
  }
  return texts[status] || '未知'
}

const getHistoryIcon = (status) => {
  const icons = {
    success: 'CircleCheck',
    failed: 'CircleClose',
    running: 'Loading',
    pending: 'Clock'
  }
  return icons[status] || 'QuestionFilled'
}

const getHistoryIconClass = (status) => {
  const classes = {
    success: 'success-icon',
    failed: 'failed-icon',
    running: 'running-icon',
    pending: 'pending-icon'
  }
  return classes[status] || ''
}

const formatDate = (date) => {
  if (!date) return '未知'
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatDateTime = (date) => {
  if (!date) return '未知'
  return new Date(date).toLocaleString('zh-CN')
}

const formatTime = (date) => {
  if (!date) return '未知'
  const now = new Date()
  const diff = now - new Date(date)
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (days > 0) return `${days}天前`
  if (hours > 0) return `${hours}小时前`
  if (minutes > 0) return `${minutes}分钟前`
  return '刚刚'
}

// 生命周期
onMounted(async () => {
  emit('update-header', {
    showBreadcrumb: true,
    breadcrumbText: '工作空间详情',
    showSearch: false,
    showCreateButton: false
  })
  
  await loadWorkspace()
  loadJobs()
  loadDeployHistory()
})
</script>

<style scoped>
.workspace-detail {
  max-width: 1000px;
  margin: 0 auto;
}

.detail-container {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #f3f4f6;
}

.workspace-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.workspace-icon {
  width: 48px;
  height: 48px;
  background: #eff6ff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  font-size: 24px;
}

.workspace-name {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.workspace-tags {
  display: flex;
  align-items: center;
  gap: 12px;
}

.created-time {
  font-size: 14px;
  color: #6b7280;
}

.detail-actions {
  display: flex;
  gap: 12px;
}

.detail-content {
  padding: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.config-section {
  margin-bottom: 24px;
}

.k8s-config {
  margin-top: 24px;
}

.jobs-section {
  margin-bottom: 16px;
}

.jobs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty-jobs {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.empty-icon {
  font-size: 48px;
  color: #d1d5db;
  margin-bottom: 16px;
}

.jobs-list {
  margin-bottom: 12px;
}

.job-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.job-item:hover {
  border-color: #3b82f6;
  background: #f9fafb;
}

.job-info {
  flex: 1;
}

.job-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.job-desc {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.job-time {
  font-size: 12px;
  color: #9ca3af;
}

.history-section {
  margin-bottom: 16px;
}

.history-list {
  margin-bottom: 12px;
}

.history-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.history-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.success-icon {
  background: #dcfce7;
  color: #16a34a;
}

.failed-icon {
  background: #fee2e2;
  color: #dc2626;
}

.running-icon {
  background: #dbeafe;
  color: #2563eb;
}

.pending-icon {
  background: #fef3c7;
  color: #d97706;
}

.history-content {
  flex: 1;
}

.history-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.history-desc {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 8px;
}

.history-time {
  font-size: 12px;
  color: #9ca3af;
}

:deep(.el-tabs__item) {
  font-weight: 500;
}

:deep(.el-descriptions__label) {
  font-weight: 500;
}
</style>
