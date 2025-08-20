<template>
  <div class="workspace-list">
    <!-- 页面标题和统计 -->
    <div class="page-header">
      <div class="header-info">
        <h1 class="page-title">DevOps 工作台</h1>
        <p class="page-subtitle">管理您的工作空间和部署作业</p>
      </div>
      <div class="stats">
        <div class="stat-item">
          <span class="stat-label">总计</span>
          <span class="stat-value">{{ workspaces.length }}</span>
        </div>
        <el-button @click="goToTemplates" type="primary" text>
          <el-icon><Setting /></el-icon>
          模板管理
        </el-button>
      </div>
    </div>

    <!-- 工作空间卡片网格 -->
    <div class="workspace-grid">
      <!-- 新建工作空间卡片 -->
      <div class="workspace-card create-card" @click="createWorkspace">
        <div class="create-content">
          <el-icon class="create-icon"><Plus /></el-icon>
          <span class="create-text">新建工作空间</span>
        </div>
      </div>

      <!-- 工作空间卡片 -->
      <div 
        v-for="workspace in filteredWorkspaces" 
        :key="workspace.id"
        class="workspace-card"
      >
        <div class="card-header">
          <div class="workspace-info">
            <div class="workspace-icon">
              <el-icon><Box /></el-icon>
            </div>
            <div class="workspace-details">
              <h3 class="workspace-name">{{ workspace.name }}</h3>
              <p class="workspace-platform">{{ workspace.platform }}</p>
            </div>
          </div>
          <el-dropdown trigger="click" @command="handleCommand">
            <el-button text class="more-btn">
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :command="{action: 'detail', workspace}">
                  <el-icon><View /></el-icon>
                  详情
                </el-dropdown-item>
                <el-dropdown-item :command="{action: 'edit', workspace}">
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-dropdown-item>
                <el-dropdown-item :command="{action: 'delete', workspace}" divided>
                  <el-icon><Delete /></el-icon>
                  删除
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <div class="card-content">
          <div class="workspace-meta">
            <div class="meta-item">
              <span class="meta-label">Harbor:</span>
              <span class="meta-value">{{ workspace.harborUrl || '未配置' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">作业数:</span>
              <span class="meta-value">{{ workspace.jobCount || 0 }}</span>
            </div>
          </div>

          <div class="job-status">
            <div class="status-dots">
              <span 
                v-for="i in Math.min(workspace.jobCount || 0, 5)" 
                :key="i"
                class="status-dot"
                :class="getJobStatusClass(i)"
              ></span>
              <span v-if="(workspace.jobCount || 0) > 5" class="status-more">
                +{{ workspace.jobCount - 5 }}
              </span>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <el-button 
            type="primary" 
            class="workbench-btn"
            @click="openWorkbench(workspace)"
          >
            <el-icon><Monitor /></el-icon>
            工作台
          </el-button>
          <div class="last-updated">
            {{ formatTime(workspace.updatedAt) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="workspaces.length === 0" class="empty-state">
      <el-icon class="empty-icon"><Box /></el-icon>
      <h3>还没有工作空间</h3>
      <p>创建您的第一个工作空间来开始使用 DevOps 工具</p>
      <el-button type="primary" @click="createWorkspace">
        <el-icon><Plus /></el-icon>
        创建工作空间
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api/index.js'

const router = useRouter()
const emit = defineEmits(['update-header'])

// 响应式数据
const workspaces = ref([])
const loading = ref(false)

// 接收搜索查询
const props = defineProps({
  searchQuery: {
    type: String,
    default: ''
  }
})

// 过滤工作空间
const filteredWorkspaces = computed(() => {
  if (!props.searchQuery) return workspaces.value
  return workspaces.value.filter(workspace => 
    workspace.name.toLowerCase().includes(props.searchQuery.toLowerCase()) ||
    workspace.platform.toLowerCase().includes(props.searchQuery.toLowerCase())
  )
})

// 方法
const loadWorkspaces = async () => {
  loading.value = true
  try {
    const response = await api.get('/workspace')
    workspaces.value = response.data.map(ws => ({
      ...ws,
      id: ws.name, // 使用 name 作为 id
      platform: ws.config?.BUILD_PLATFORM || 'Docker',
      harborUrl: ws.config?.BUILD_HARBOR_ADDRESS,
      jobCount: Math.floor(Math.random() * 8), // 模拟作业数量
      updatedAt: new Date()
    }))
  } catch (error) {
    console.error('加载工作空间失败:', error)
    ElMessage.error('加载工作空间失败')
  } finally {
    loading.value = false
  }
}

const createWorkspace = () => {
  router.push('/workspace/create')
}

const openWorkbench = (workspace) => {
  router.push(`/workspace/${workspace.id}/workbench`)
}

const handleCommand = ({ action, workspace }) => {
  switch (action) {
    case 'detail':
      router.push(`/workspace/${workspace.id}`)
      break
    case 'edit':
      router.push(`/workspace/${workspace.id}/edit`)
      break
    case 'delete':
      deleteWorkspace(workspace)
      break
  }
}

const deleteWorkspace = async (workspace) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除工作空间 "${workspace.name}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    
    await api.delete(`/workspace/${workspace.name}`)
    ElMessage.success('工作空间删除成功')
    loadWorkspaces()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除工作空间失败:', error)
      ElMessage.error('删除工作空间失败')
    }
  }
}

const getJobStatusClass = (index) => {
  const statuses = ['running', 'success', 'failed', 'pending']
  return statuses[index % statuses.length]
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

const goToTemplates = () => {
  router.push('/templates')
}

// 生命周期
onMounted(() => {
  // 更新头部状态
  emit('update-header', {
    showBreadcrumb: false,
    showSearch: true,
    searchPlaceholder: '搜索工作空间...',
    showCreateButton: true,
    createButtonText: '新建工作空间'
  })
  
  loadWorkspaces()
})
</script>

<style scoped>
.workspace-list {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.header-info {
  flex: 1;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

.workspace-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.workspace-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.workspace-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  transform: translateY(-2px);
}

.create-card {
  border: 2px dashed #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  background: #f9fafb;
}

.create-card:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.create-content {
  text-align: center;
  color: #6b7280;
}

.create-icon {
  font-size: 32px;
  margin-bottom: 12px;
  color: #9ca3af;
}

.create-text {
  font-size: 16px;
  font-weight: 500;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.workspace-info {
  display: flex;
  gap: 12px;
  flex: 1;
}

.workspace-icon {
  width: 40px;
  height: 40px;
  background: #eff6ff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  font-size: 20px;
}

.workspace-details {
  flex: 1;
}

.workspace-name {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.workspace-platform {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.more-btn {
  color: #6b7280;
  padding: 4px;
}

.card-content {
  margin-bottom: 20px;
}

.workspace-meta {
  margin-bottom: 16px;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.meta-label {
  color: #6b7280;
}

.meta-value {
  color: #1f2937;
  font-weight: 500;
}

.job-status {
  display: flex;
  align-items: center;
}

.status-dots {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.running {
  background-color: #10b981;
}

.status-dot.success {
  background-color: #3b82f6;
}

.status-dot.failed {
  background-color: #ef4444;
}

.status-dot.pending {
  background-color: #f59e0b;
}

.status-more {
  font-size: 12px;
  color: #6b7280;
  margin-left: 4px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.workbench-btn {
  height: 36px;
  border-radius: 6px;
  font-weight: 500;
}

.last-updated {
  font-size: 12px;
  color: #9ca3af;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #6b7280;
}

.empty-icon {
  font-size: 64px;
  color: #d1d5db;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 20px;
  color: #374151;
  margin: 0 0 8px 0;
}

.empty-state p {
  font-size: 16px;
  margin: 0 0 24px 0;
}
</style>
