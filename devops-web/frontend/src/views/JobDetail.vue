<template>
  <div class="job-detail">
    <div class="detail-container">
      <div class="detail-header">
        <div class="job-info">
          <div class="job-icon">
            <el-icon><Box /></el-icon>
          </div>
          <div class="job-meta">
            <h1 class="job-name">{{ job.name }}</h1>
            <div class="job-tags">
              <el-tag :type="getStatusType(job.status)">{{ getStatusText(job.status) }}</el-tag>
              <span class="job-template">{{ job.template }}</span>
            </div>
          </div>
        </div>
        <div class="detail-actions">
          <el-button @click="editJob">
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
          <el-button 
            type="primary" 
            :loading="deploying"
            @click="redeploy"
            v-if="job.status !== 'running'"
          >
            <el-icon><Refresh /></el-icon>
            重新部署
          </el-button>
          <el-button 
            type="primary" 
            @click="viewLogs"
            v-if="job.status === 'running'"
          >
            <el-icon><Document /></el-icon>
            查看日志
          </el-button>
        </div>
      </div>

      <div class="detail-content">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="基本信息" name="info">
            <div class="info-section">
              <h3 class="section-title">作业配置</h3>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="作业名称">
                  {{ job.name }}
                </el-descriptions-item>
                <el-descriptions-item label="模板类型">
                  {{ job.template }}
                </el-descriptions-item>
                <el-descriptions-item label="Git 仓库">
                  <el-link :href="job.gitUrl" target="_blank" type="primary">
                    {{ job.gitUrl }}
                  </el-link>
                </el-descriptions-item>
                <el-descriptions-item label="分支">
                  {{ job.branch }}
                </el-descriptions-item>
                <el-descriptions-item label="构建路径">
                  {{ job.buildPath }}
                </el-descriptions-item>
                <el-descriptions-item label="状态">
                  <el-tag :type="getStatusType(job.status)">
                    {{ getStatusText(job.status) }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="创建时间">
                  {{ formatDateTime(job.createdAt) }}
                </el-descriptions-item>
                <el-descriptions-item label="最后部署">
                  {{ formatDateTime(job.lastDeploy) }}
                </el-descriptions-item>
              </el-descriptions>

              <div v-if="job.deployParams && job.deployParams.length > 0" class="params-section">
                <h3 class="section-title">部署参数</h3>
                <div class="params-grid">
                  <div 
                    v-for="param in job.deployParams"
                    :key="param.key"
                    class="param-item"
                  >
                    <div class="param-key">{{ param.key }}</div>
                    <div class="param-value">{{ param.value }}</div>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="部署历史" name="history">
            <div class="history-section">
              <div class="history-header">
                <h3 class="section-title">部署历史</h3>
                <el-button size="small" @click="loadHistory">
                  <el-icon><Refresh /></el-icon>
                  刷新
                </el-button>
              </div>
              
              <div class="history-timeline">
                <div 
                  v-for="record in deployHistory"
                  :key="record.id"
                  class="timeline-item"
                >
                  <div class="timeline-dot" :class="getStatusClass(record.status)">
                    <el-icon>
                      <component :is="getStatusIcon(record.status)" />
                    </el-icon>
                  </div>
                  <div class="timeline-content">
                    <div class="timeline-header">
                      <span class="timeline-title">{{ record.title }}</span>
                      <span class="timeline-time">{{ formatDateTime(record.createdAt) }}</span>
                    </div>
                    <div class="timeline-desc">{{ record.description }}</div>
                    <div class="timeline-meta">
                      <el-tag :type="getStatusType(record.status)" size="small">
                        {{ getStatusText(record.status) }}
                      </el-tag>
                      <span class="timeline-duration">耗时: {{ record.duration }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="运行日志" name="logs">
            <div class="logs-section">
              <div class="logs-header">
                <h3 class="section-title">运行日志</h3>
                <div class="logs-actions">
                  <el-button size="small" @click="refreshLogs">
                    <el-icon><Refresh /></el-icon>
                    刷新
                  </el-button>
                  <el-button size="small" @click="downloadLogs">
                    <el-icon><Download /></el-icon>
                    下载
                  </el-button>
                </div>
              </div>
              
              <div class="logs-container">
                <div class="logs-content" ref="logsRef">
                  <div 
                    v-for="(log, index) in logs"
                    :key="index"
                    class="log-line"
                    :class="getLogLevelClass(log.level)"
                  >
                    <span class="log-time">{{ formatLogTime(log.timestamp) }}</span>
                    <span class="log-level">{{ log.level }}</span>
                    <span class="log-message">{{ log.message }}</span>
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
import { ref, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const route = useRoute()
const emit = defineEmits(['update-header'])

// 响应式数据
const job = ref({})
const deployHistory = ref([])
const logs = ref([])
const activeTab = ref('info')
const deploying = ref(false)
const logsRef = ref()

// 方法
const loadJob = () => {
  // 模拟作业数据
  job.value = {
    id: route.params.jobId,
    name: '用户服务',
    template: 'Java Spring Boot',
    gitUrl: 'https://github.com/company/user-service.git',
    branch: 'main',
    buildPath: './',
    status: 'running',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    lastDeploy: new Date(Date.now() - 2 * 60 * 60 * 1000),
    deployParams: [
      { key: 'PORT', value: '8080' },
      { key: 'ENV', value: 'production' },
      { key: 'DB_HOST', value: 'mysql.internal' },
      { key: 'REDIS_URL', value: 'redis://redis.internal:6379' }
    ]
  }
}

const loadHistory = () => {
  // 模拟部署历史
  deployHistory.value = [
    {
      id: '1',
      title: '部署到生产环境',
      description: '版本 v1.2.3 部署成功',
      status: 'success',
      duration: '2分30秒',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: '2',
      title: '部署到测试环境',
      description: '版本 v1.2.2 部署失败，构建错误',
      status: 'failed',
      duration: '1分15秒',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    },
    {
      id: '3',
      title: '部署到生产环境',
      description: '版本 v1.2.1 部署成功',
      status: 'success',
      duration: '3分45秒',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    }
  ]
}

const loadLogs = () => {
  // 模拟日志数据
  logs.value = [
    { timestamp: new Date(), level: 'INFO', message: '应用启动中...' },
    { timestamp: new Date(), level: 'INFO', message: '连接数据库成功' },
    { timestamp: new Date(), level: 'INFO', message: '加载配置文件完成' },
    { timestamp: new Date(), level: 'WARN', message: '检测到配置项缺失，使用默认值' },
    { timestamp: new Date(), level: 'INFO', message: '服务启动完成，监听端口 8080' },
    { timestamp: new Date(), level: 'INFO', message: '健康检查通过' }
  ]
}

const editJob = () => {
  router.push(`/workspace/${route.params.id}/job/${route.params.jobId}/edit`)
}

const redeploy = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要重新部署作业 "${job.value.name}" 吗？`,
      '确认重新部署',
      {
        confirmButtonText: '重新部署',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    deploying.value = true
    // 模拟部署过程
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    job.value.status = 'running'
    job.value.lastDeploy = new Date()
    
    ElMessage.success('重新部署已启动')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('重新部署失败')
    }
  } finally {
    deploying.value = false
  }
}

const viewLogs = () => {
  activeTab.value = 'logs'
}

const refreshLogs = () => {
  loadLogs()
  nextTick(() => {
    if (logsRef.value) {
      logsRef.value.scrollTop = logsRef.value.scrollHeight
    }
  })
}

const downloadLogs = () => {
  ElMessage.info('下载日志功能开发中...')
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

const getStatusClass = (status) => {
  return `status-${status}`
}

const getStatusIcon = (status) => {
  const icons = {
    success: 'CircleCheck',
    failed: 'CircleClose',
    running: 'Loading',
    pending: 'Clock'
  }
  return icons[status] || 'QuestionFilled'
}

const getLogLevelClass = (level) => {
  return `log-${level.toLowerCase()}`
}

const formatDateTime = (date) => {
  if (!date) return '未知'
  return new Date(date).toLocaleString('zh-CN')
}

const formatLogTime = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('zh-CN')
}

// 生命周期
onMounted(() => {
  emit('update-header', {
    showBreadcrumb: true,
    breadcrumbText: '作业详情',
    showSearch: false,
    showCreateButton: false
  })
  
  loadJob()
  loadHistory()
  loadLogs()
})
</script>

<style scoped>
.job-detail {
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

.job-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.job-icon {
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

.job-name {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.job-tags {
  display: flex;
  align-items: center;
  gap: 12px;
}

.job-template {
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

.info-section {
  margin-bottom: 24px;
}

.params-section {
  margin-top: 24px;
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.param-item {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.param-key {
  font-weight: 500;
  color: #374151;
}

.param-value {
  color: #6b7280;
  font-family: monospace;
}

.history-section {
  margin-bottom: 16px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-timeline {
  margin-bottom: 16px;
}

.timeline-item {
  display: flex;
  gap: 16px;
}

.timeline-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.status-success {
  background: #dcfce7;
  color: #16a34a;
}

.status-failed {
  background: #fee2e2;
  color: #dc2626;
}

.status-running {
  background: #dbeafe;
  color: #2563eb;
}

.status-pending {
  background: #fef3c7;
  color: #d97706;
}

.timeline-content {
  flex: 1;
  padding-bottom: 16px;
  border-bottom: 1px solid #f3f4f6;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.timeline-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.timeline-time {
  font-size: 12px;
  color: #9ca3af;
}

.timeline-desc {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 12px;
}

.timeline-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.timeline-duration {
  font-size: 12px;
  color: #9ca3af;
}

.logs-section {
  margin-bottom: 16px;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logs-actions {
  display: flex;
  gap: 8px;
}

.logs-container {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #1f2937;
  color: #f9fafb;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.logs-content {
  height: 400px;
  overflow-y: auto;
  padding: 16px;
}

.log-line {
  display: flex;
  gap: 12px;
  margin-bottom: 4px;
  line-height: 1.4;
}

.log-time {
  color: #9ca3af;
  flex-shrink: 0;
  width: 80px;
}

.log-level {
  flex-shrink: 0;
  width: 50px;
  font-weight: 600;
}

.log-info .log-level {
  color: #3b82f6;
}

.log-warn .log-level {
  color: #f59e0b;
}

.log-error .log-level {
  color: #ef4444;
}

.log-message {
  flex: 1;
}

:deep(.el-tabs__item) {
  font-weight: 500;
}

:deep(.el-descriptions__label) {
  font-weight: 500;
}
</style>
