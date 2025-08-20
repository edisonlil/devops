<template>
  <div class="deploy-management">
    <div class="page-header">
      <h2>部署管理</h2>
      <div class="header-actions">
        <el-button @click="loadDeployments">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button @click="showCleanupDialog">
          <el-icon><Delete /></el-icon>
          清理
        </el-button>
      </div>
    </div>

    <!-- 统计信息 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><Upload /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.totalDeployments }}</div>
              <div class="stat-label">总部署数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><Folder /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.totalWorkspaces }}</div>
              <div class="stat-label">工作空间数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.recentDeployments }}</div>
              <div class="stat-label">24小时部署</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><DataAnalysis /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ Object.keys(stats.workspaceStats || {}).length }}</div>
              <div class="stat-label">活跃工作空间</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 部署列表 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>部署历史</span>
          <div class="header-filters">
            <el-select v-model="selectedWorkspace" placeholder="选择工作空间" clearable @change="loadDeployments">
              <el-option label="全部工作空间" value="" />
              <el-option 
                v-for="ws in workspaces" 
                :key="ws.name" 
                :label="ws.name" 
                :value="ws.name" 
              />
            </el-select>
          </div>
        </div>
      </template>

      <el-table :data="deployments" v-loading="loading">
        <el-table-column prop="workspace" label="工作空间" width="150">
          <template #default="{ row }">
            <el-tag>{{ row.workspace }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="jobName" label="作业名称" width="200" />
        
        <el-table-column prop="filename" label="文件名" width="250">
          <template #default="{ row }">
            <div class="filename-cell">
              <el-icon><Document /></el-icon>
              <span>{{ row.filename }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="size" label="文件大小" width="120">
          <template #default="{ row }">
            {{ formatFileSize(row.size) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="modifiedAt" label="修改时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.modifiedAt) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="viewDeployment(row)">
              查看
            </el-button>
            <el-button size="small" type="danger" @click="deleteDeployment(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadDeployments"
          @current-change="loadDeployments"
        />
      </div>
    </el-card>

    <!-- 查看部署文件对话框 -->
    <el-dialog v-model="viewDialogVisible" title="查看部署文件" width="80%">
      <div v-if="currentDeployment">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="工作空间">{{ currentDeployment.workspace }}</el-descriptions-item>
          <el-descriptions-item label="作业名称">{{ currentDeployment.jobName }}</el-descriptions-item>
          <el-descriptions-item label="文件名">{{ currentDeployment.filename }}</el-descriptions-item>
          <el-descriptions-item label="文件大小">{{ formatFileSize(currentDeployment.size) }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatTime(currentDeployment.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="修改时间">{{ formatTime(currentDeployment.modifiedAt) }}</el-descriptions-item>
        </el-descriptions>
        
        <div style="margin-top: 20px;">
          <h4>文件内容:</h4>
          <el-input
            v-model="currentDeploymentContent"
            type="textarea"
            :rows="20"
            readonly
          />
        </div>
      </div>
    </el-dialog>

    <!-- 清理对话框 -->
    <el-dialog v-model="cleanupDialogVisible" title="清理部署文件" width="500px">
      <el-form :model="cleanupForm" label-width="120px">
        <el-form-item label="工作空间">
          <el-select v-model="cleanupForm.workspace" placeholder="选择工作空间" clearable>
            <el-option label="全部工作空间" value="" />
            <el-option 
              v-for="ws in workspaces" 
              :key="ws.name" 
              :label="ws.name" 
              :value="ws.name" 
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="保留天数">
          <el-input-number v-model="cleanupForm.daysOld" :min="1" :max="365" />
          <div class="form-tip">删除指定天数之前的部署文件</div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="cleanupDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="performCleanup" :loading="cleaning">
          确认清理
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api/index.js'
import dayjs from 'dayjs'

const deployments = ref([])
const workspaces = ref([])
const stats = ref({})
const loading = ref(false)
const selectedWorkspace = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const viewDialogVisible = ref(false)
const currentDeployment = ref(null)
const currentDeploymentContent = ref('')

const cleanupDialogVisible = ref(false)
const cleaning = ref(false)
const cleanupForm = reactive({
  workspace: '',
  daysOld: 30
})

const loadDeployments = async () => {
  loading.value = true
  try {
    const params = {
      limit: pageSize.value,
      offset: (currentPage.value - 1) * pageSize.value
    }
    
    if (selectedWorkspace.value) {
      params.workspace = selectedWorkspace.value
    }
    
    const response = await api.get('/deploy/history', { params })
    deployments.value = response.data.deployments
    total.value = response.data.total
  } catch (error) {
    ElMessage.error('加载部署历史失败')
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const response = await api.get('/deploy/stats/summary')
    stats.value = response.data
  } catch (error) {
    ElMessage.error('加载统计信息失败')
  }
}

const loadWorkspaces = async () => {
  try {
    const response = await api.get('/workspace')
    workspaces.value = response.data
  } catch (error) {
    ElMessage.error('加载工作空间失败')
  }
}

const viewDeployment = async (deployment) => {
  try {
    const response = await api.get(`/deploy/${deployment.workspace}/${deployment.filename}`)
    currentDeployment.value = response.data
    currentDeploymentContent.value = response.data.content
    viewDialogVisible.value = true
  } catch (error) {
    ElMessage.error('加载部署文件失败')
  }
}

const deleteDeployment = async (deployment) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除部署文件 "${deployment.filename}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    await api.delete(`/deploy/${deployment.workspace}/${deployment.filename}`)
    ElMessage.success('部署文件删除成功')
    loadDeployments()
    loadStats()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除部署文件失败')
    }
  }
}

const showCleanupDialog = () => {
  cleanupDialogVisible.value = true
}

const performCleanup = async () => {
  cleaning.value = true
  try {
    const response = await api.post('/deploy/cleanup', cleanupForm)
    ElMessage.success(response.data.message)
    cleanupDialogVisible.value = false
    loadDeployments()
    loadStats()
  } catch (error) {
    ElMessage.error('清理失败')
  } finally {
    cleaning.value = false
  }
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatTime = (time) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

onMounted(() => {
  loadWorkspaces()
  loadDeployments()
  loadStats()
})
</script>

<style scoped>
.deploy-management {
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

.header-actions {
  display: flex;
  gap: 10px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  height: 100px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 20px;
  color: white;
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-filters {
  display: flex;
  gap: 10px;
}

.filename-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filename-cell .el-icon {
  color: #409EFF;
}

.pagination-wrapper {
  margin-top: 20px;
  text-align: right;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}
</style>
