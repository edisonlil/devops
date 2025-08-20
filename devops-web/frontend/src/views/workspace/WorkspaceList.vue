<template>
  <div class="workspace-list">
    <div class="page-header">
      <h2>工作空间管理</h2>
      <el-button type="primary" @click="$router.push('/workspace/create')">
        <el-icon><Plus /></el-icon>
        创建工作空间
      </el-button>
    </div>

    <!-- 当前活跃工作空间 -->
    <el-card class="active-workspace-card" v-if="activeWorkspace">
      <template #header>
        <div class="card-header">
          <span>当前活跃工作空间</span>
          <el-tag type="success">活跃</el-tag>
        </div>
      </template>
      <div class="workspace-info">
        <div class="workspace-name">
          <el-icon><Folder /></el-icon>
          {{ activeWorkspace.name }}
        </div>
        <div class="workspace-details">
          <el-descriptions :column="3" size="small">
            <el-descriptions-item label="构建平台">
              {{ activeWorkspace.config.BUILD_PLATFORM || 'DOCKER_SWARM' }}
            </el-descriptions-item>
            <el-descriptions-item label="Harbor地址">
              {{ activeWorkspace.config.BUILD_HARBOR_ADDRESS || '未配置' }}
            </el-descriptions-item>
            <el-descriptions-item label="Namespace" v-if="activeWorkspace.config.BUILD_K8S_NAMESPACE">
              {{ activeWorkspace.config.BUILD_K8S_NAMESPACE }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
    </el-card>

    <!-- 工作空间列表 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>所有工作空间</span>
          <el-button size="small" @click="loadWorkspaces">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <el-table :data="workspaces" v-loading="loading">
        <el-table-column prop="name" label="名称" width="200">
          <template #default="{ row }">
            <div class="workspace-name-cell">
              <el-icon><Folder /></el-icon>
              <span>{{ row.name }}</span>
              <el-tag v-if="row.name === activeWorkspaceName" type="success" size="small">活跃</el-tag>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="config.BUILD_PLATFORM" label="构建平台" width="150">
          <template #default="{ row }">
            <el-tag :type="getPlatformType(row.config.BUILD_PLATFORM)">
              {{ row.config.BUILD_PLATFORM || 'DOCKER_SWARM' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="config.BUILD_HARBOR_ADDRESS" label="Harbor地址" width="200">
          <template #default="{ row }">
            {{ row.config.BUILD_HARBOR_ADDRESS || '未配置' }}
          </template>
        </el-table-column>
        
        <el-table-column prop="modifiedAt" label="修改时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.modifiedAt) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="300">
          <template #default="{ row }">
            <el-button size="small" @click="viewWorkspace(row.name)">
              查看详情
            </el-button>
            <el-button size="small" @click="editConfig(row.name)">
              编辑配置
            </el-button>
            <el-button 
              size="small" 
              type="success" 
              @click="setActive(row.name)"
              :disabled="row.name === activeWorkspaceName"
            >
              设为活跃
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deleteWorkspace(row.name)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../../api/index.js'
import dayjs from 'dayjs'

const router = useRouter()
const workspaces = ref([])
const activeWorkspace = ref(null)
const activeWorkspaceName = ref('')
const loading = ref(false)

const loadWorkspaces = async () => {
  loading.value = true
  try {
    const response = await api.get('/workspace')
    workspaces.value = response.data
    
    // 获取当前活跃工作空间
    const activeRes = await api.get('/workspace/active')
    activeWorkspaceName.value = activeRes.data.activeWorkspace
    
    if (activeWorkspaceName.value) {
      activeWorkspace.value = workspaces.value.find(w => w.name === activeWorkspaceName.value)
    }
  } catch (error) {
    ElMessage.error('加载工作空间失败')
  } finally {
    loading.value = false
  }
}

const viewWorkspace = (name) => {
  router.push(`/workspace/${name}`)
}

const editConfig = (name) => {
  router.push(`/workspace/${name}/config`)
}

const setActive = async (name) => {
  try {
    await api.post('/workspace/active', { workspace: name })
    ElMessage.success('活跃工作空间设置成功')
    loadWorkspaces()
  } catch (error) {
    ElMessage.error('设置活跃工作空间失败')
  }
}

const deleteWorkspace = async (name) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除工作空间 "${name}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    await api.delete(`/workspace/${name}`)
    ElMessage.success('工作空间删除成功')
    loadWorkspaces()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除工作空间失败')
    }
  }
}

const getPlatformType = (platform) => {
  const typeMap = {
    'KUBERNETES': 'primary',
    'DOCKER_SWARM': 'success',
    'DOCKER_COMPOSE': 'info'
  }
  return typeMap[platform] || 'info'
}

const formatTime = (time) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

onMounted(() => {
  loadWorkspaces()
})
</script>

<style scoped>
.workspace-list {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.active-workspace-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.workspace-info {
  padding: 10px 0;
}

.workspace-name {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
}

.workspace-name .el-icon {
  margin-right: 8px;
  color: #409EFF;
}

.workspace-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.workspace-name-cell .el-icon {
  color: #409EFF;
}
</style>
