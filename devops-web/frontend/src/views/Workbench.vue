<template>
  <div class="workbench">
    <!-- 工作空间信息 -->
    <div class="workspace-info">
      <div class="info-header">
        <div class="workspace-details">
          <div class="workspace-icon">
            <el-icon><Box /></el-icon>
          </div>
          <div class="workspace-meta">
            <h1 class="workspace-name">{{ workspace.name }}</h1>
            <div class="workspace-config">
              <el-tag size="small" type="info">{{ workspace.platform }}</el-tag>
              <span class="config-item">Harbor: {{ workspace.harborUrl }}</span>
            </div>
          </div>
        </div>
        <div class="workspace-actions">
          <el-button @click="editWorkspace">
            <el-icon><Edit /></el-icon>
            编辑工作空间
          </el-button>
        </div>
      </div>
    </div>

    <!-- 作业统计 -->
    <div class="job-stats">
      <div class="stat-card">
        <div class="stat-icon running">
          <el-icon><VideoPlay /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.running }}</div>
          <div class="stat-label">运行中</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon success">
          <el-icon><CircleCheck /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.success }}</div>
          <div class="stat-label">已完成</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon failed">
          <el-icon><CircleClose /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.failed }}</div>
          <div class="stat-label">失败</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon total">
          <el-icon><DataBoard /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">总计</div>
        </div>
      </div>
    </div>

    <!-- 作业列表 -->
    <div class="job-list">
      <div class="list-header">
        <h2 class="list-title">作业列表</h2>
        <div class="list-filters">
          <el-select v-model="statusFilter" placeholder="状态筛选" clearable size="small">
            <el-option label="运行中" value="running" />
            <el-option label="已完成" value="success" />
            <el-option label="失败" value="failed" />
            <el-option label="等待中" value="pending" />
          </el-select>
        </div>
      </div>

      <div class="job-cards">
        <!-- 新建作业卡片 -->
        <div class="job-card create-job-card" @click="createJob">
          <div class="create-job-content">
            <el-icon class="create-job-icon"><Plus /></el-icon>
            <span class="create-job-text">新建作业</span>
          </div>
        </div>

        <!-- 作业卡片 -->
        <div 
          v-for="job in filteredJobs" 
          :key="job.id"
          class="job-card"
          @click="viewJob(job)"
        >
          <div class="job-header">
            <div class="job-info">
              <h3 class="job-name">{{ job.name }}</h3>
              <div class="job-meta">
                <el-tag 
                  :type="getStatusType(job.status)" 
                  size="small"
                  class="job-status"
                >
                  {{ getStatusText(job.status) }}
                </el-tag>
                <span class="job-template">{{ job.template }}</span>
              </div>
            </div>
            <el-dropdown trigger="click" @command="handleJobCommand">
              <el-button text class="job-more">
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="{action: 'view', job}">
                    <el-icon><View /></el-icon>
                    查看详情
                  </el-dropdown-item>
                  <el-dropdown-item :command="{action: 'logs', job}">
                    <el-icon><Document /></el-icon>
                    查看日志
                  </el-dropdown-item>
                  <el-dropdown-item :command="{action: 'redeploy', job}" v-if="job.status !== 'running'">
                    <el-icon><Refresh /></el-icon>
                    重新部署
                  </el-dropdown-item>
                  <el-dropdown-item :command="{action: 'edit', job}">
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-dropdown-item>
                  <el-dropdown-item :command="{action: 'delete', job}" divided>
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <div class="job-content">
            <div class="job-git">
              <el-icon class="git-icon"><Link /></el-icon>
              <span class="git-url">{{ job.gitUrl }}</span>
            </div>
            <div class="job-branch">
              <el-icon class="branch-icon"><Branch /></el-icon>
              <span class="branch-name">{{ job.branch }}</span>
            </div>
          </div>

          <div class="job-footer">
            <div class="job-time">
              <span class="time-label">最后部署:</span>
              <span class="time-value">{{ formatTime(job.lastDeploy) }}</span>
            </div>
            <div class="job-actions">
              <el-button 
                v-if="job.status === 'running'"
                size="small" 
                type="primary" 
                text
                @click.stop="viewLogs(job)"
              >
                查看日志
              </el-button>
              <el-button 
                v-else
                size="small" 
                type="primary"
                @click.stop="redeploy(job)"
              >
                重新部署
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="jobs.length === 0" class="empty-jobs">
        <el-icon class="empty-icon"><Box /></el-icon>
        <h3>还没有作业</h3>
        <p>创建您的第一个作业来开始部署</p>
        <el-button type="primary" @click="createJob">
          <el-icon><Plus /></el-icon>
          新建作业
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api/index.js'

const router = useRouter()
const route = useRoute()
const emit = defineEmits(['update-header'])

// 响应式数据
const workspace = ref({})
const jobs = ref([])
const statusFilter = ref('')
const loading = ref(false)

// 接收搜索查询
const props = defineProps({
  searchQuery: {
    type: String,
    default: ''
  }
})

// 计算属性
const stats = computed(() => {
  const running = jobs.value.filter(job => job.status === 'running').length
  const success = jobs.value.filter(job => job.status === 'success').length
  const failed = jobs.value.filter(job => job.status === 'failed').length
  const total = jobs.value.length

  return { running, success, failed, total }
})

const filteredJobs = computed(() => {
  let filtered = jobs.value

  // 状态筛选
  if (statusFilter.value) {
    filtered = filtered.filter(job => job.status === statusFilter.value)
  }

  // 搜索筛选
  if (props.searchQuery) {
    filtered = filtered.filter(job => 
      job.name.toLowerCase().includes(props.searchQuery.toLowerCase()) ||
      job.gitUrl.toLowerCase().includes(props.searchQuery.toLowerCase()) ||
      job.template.toLowerCase().includes(props.searchQuery.toLowerCase())
    )
  }

  return filtered
})

// 方法
const loadWorkspace = async () => {
  try {
    const response = await api.get(`/workspace/${route.params.id}`)
    workspace.value = {
      ...response.data,
      platform: response.data.config?.BUILD_PLATFORM || 'Docker',
      harborUrl: response.data.config?.BUILD_HARBOR_ADDRESS || '未配置'
    }
  } catch (error) {
    console.error('加载工作空间失败:', error)
    ElMessage.error('加载工作空间失败')
  }
}

const loadJobs = async () => {
  // 模拟作业数据
  jobs.value = [
    {
      id: '1',
      name: '用户服务',
      template: 'Java Spring Boot',
      gitUrl: 'https://github.com/company/user-service',
      branch: 'main',
      status: 'running',
      lastDeploy: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: '2',
      name: '订单服务',
      template: 'Java Spring Boot',
      gitUrl: 'https://github.com/company/order-service',
      branch: 'develop',
      status: 'success',
      lastDeploy: new Date(Date.now() - 24 * 60 * 60 * 1000)
    },
    {
      id: '3',
      name: '前端应用',
      template: 'Vue.js',
      gitUrl: 'https://github.com/company/frontend-app',
      branch: 'main',
      status: 'failed',
      lastDeploy: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    }
  ]
}

const createJob = () => {
  router.push(`/workspace/${route.params.id}/job/create`)
}

const viewJob = (job) => {
  router.push(`/workspace/${route.params.id}/job/${job.id}`)
}

const editWorkspace = () => {
  router.push(`/workspace/${route.params.id}/edit`)
}

const handleJobCommand = ({ action, job }) => {
  switch (action) {
    case 'view':
      viewJob(job)
      break
    case 'logs':
      viewLogs(job)
      break
    case 'redeploy':
      redeploy(job)
      break
    case 'edit':
      router.push(`/workspace/${route.params.id}/job/${job.id}/edit`)
      break
    case 'delete':
      deleteJob(job)
      break
  }
}

const viewLogs = (job) => {
  // 实现查看日志逻辑
  ElMessage.info('查看日志功能开发中...')
}

const redeploy = async (job) => {
  try {
    await ElMessageBox.confirm(
      `确定要重新部署作业 "${job.name}" 吗？`,
      '确认重新部署',
      {
        confirmButtonText: '重新部署',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    ElMessage.success('重新部署已启动')
    // 实现重新部署逻辑
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('重新部署失败')
    }
  }
}

const deleteJob = async (job) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除作业 "${job.name}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    
    jobs.value = jobs.value.filter(j => j.id !== job.id)
    ElMessage.success('作业删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除作业失败')
    }
  }
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
    breadcrumbText: '工作台',
    showSearch: true,
    searchPlaceholder: '搜索作业...',
    showCreateButton: true,
    createButtonText: '新建作业'
  })
  
  await loadWorkspace()
  await loadJobs()
})
</script>

<style scoped>
.workbench {
  max-width: 1200px;
  margin: 0 auto;
}

.workspace-info {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.workspace-details {
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

.workspace-config {
  display: flex;
  align-items: center;
  gap: 12px;
}

.config-item {
  font-size: 14px;
  color: #6b7280;
}

.job-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-icon.running {
  background: #dcfce7;
  color: #16a34a;
}

.stat-icon.success {
  background: #dbeafe;
  color: #2563eb;
}

.stat-icon.failed {
  background: #fee2e2;
  color: #dc2626;
}

.stat-icon.total {
  background: #f3f4f6;
  color: #374151;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.job-list {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.list-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.job-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.job-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.job-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.create-job-card {
  border: 2px dashed #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
  background: #f9fafb;
}

.create-job-card:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.create-job-content {
  text-align: center;
  color: #6b7280;
}

.create-job-icon {
  font-size: 24px;
  margin-bottom: 8px;
  color: #9ca3af;
}

.create-job-text {
  font-size: 14px;
  font-weight: 500;
}

.job-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.job-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.job-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.job-template {
  font-size: 12px;
  color: #6b7280;
}

.job-more {
  color: #6b7280;
  padding: 4px;
}

.job-content {
  margin-bottom: 16px;
}

.job-git, .job-branch {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #6b7280;
}

.git-icon, .branch-icon {
  font-size: 16px;
}

.job-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.job-time {
  font-size: 12px;
  color: #9ca3af;
}

.time-label {
  margin-right: 4px;
}

.empty-jobs {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.empty-icon {
  font-size: 48px;
  color: #d1d5db;
  margin-bottom: 16px;
}

.empty-jobs h3 {
  font-size: 18px;
  color: #374151;
  margin: 0 0 8px 0;
}

.empty-jobs p {
  font-size: 14px;
  margin: 0 0 20px 0;
}
</style>
