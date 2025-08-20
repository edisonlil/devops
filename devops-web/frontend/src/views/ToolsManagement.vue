<template>
  <div class="tools-management">
    <div class="page-header">
      <h2>工具管理</h2>
      <div class="header-actions">
        <el-button @click="checkEnvironment">
          <el-icon><Refresh /></el-icon>
          检查环境
        </el-button>
        <el-button type="primary" @click="showInstallDialog">
          <el-icon><Download /></el-icon>
          安装工具
        </el-button>
      </div>
    </div>

    <!-- 环境状态概览 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="8">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon installed">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ summary.installed }}</div>
              <div class="stat-label">已安装</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon missing">
              <el-icon><CircleClose /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ summary.missing }}</div>
              <div class="stat-label">缺失</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon total">
              <el-icon><Tools /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ summary.total }}</div>
              <div class="stat-label">总计</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 工具列表 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>开发工具状态</span>
          <div class="header-filters">
            <el-select v-model="selectedCategory" placeholder="选择分类" clearable @change="filterTools">
              <el-option label="全部分类" value="" />
              <el-option 
                v-for="(label, key) in categories" 
                :key="key" 
                :label="label" 
                :value="key" 
              />
            </el-select>
            <el-select v-model="selectedStatus" placeholder="选择状态" clearable @change="filterTools">
              <el-option label="全部状态" value="" />
              <el-option label="已安装" value="installed" />
              <el-option label="缺失" value="missing" />
            </el-select>
          </div>
        </div>
      </template>

      <el-table :data="filteredTools" v-loading="loading">
        <el-table-column prop="name" label="工具名称" width="150">
          <template #default="{ row }">
            <div class="tool-name">
              <el-icon><Tools /></el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <el-tag :type="getCategoryType(row.category)">
              {{ categories[row.category] || row.category }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="description" label="描述" min-width="200" />
        
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'installed' ? 'success' : 'danger'">
              {{ row.status === 'installed' ? '已安装' : '缺失' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button 
              v-if="row.status === 'missing'"
              size="small" 
              type="primary" 
              @click="installSingleTool(row.name)"
            >
              安装
            </el-button>
            <el-button 
              v-else
              size="small" 
              disabled
            >
              已安装
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 安装历史 -->
    <el-card style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span>安装历史</span>
          <el-button size="small" @click="loadInstallHistory">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>
      
      <el-table :data="installHistory" v-loading="loadingHistory">
        <el-table-column prop="tools" label="安装工具" min-width="200">
          <template #default="{ row }">
            <el-tag v-for="tool in row.tools" :key="tool" style="margin-right: 5px;">
              {{ tool }}
            </el-tag>
            <span v-if="row.all">全部工具</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="startTime" label="开始时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.startTime) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="duration" label="耗时" width="100">
          <template #default="{ row }">
            {{ formatDuration(row.duration) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button size="small" @click="viewInstallLog(row.id)">
              查看日志
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 安装工具对话框 -->
    <el-dialog v-model="installDialogVisible" title="安装开发工具" width="600px">
      <el-form :model="installForm" label-width="120px">
        <el-form-item label="安装方式">
          <el-radio-group v-model="installForm.mode">
            <el-radio label="all">安装全部工具</el-radio>
            <el-radio label="selected">选择特定工具</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="选择工具" v-if="installForm.mode === 'selected'">
          <el-checkbox-group v-model="installForm.selectedTools">
            <el-checkbox 
              v-for="tool in missingTools" 
              :key="tool.name" 
              :label="tool.name"
            >
              {{ tool.name }} ({{ tool.description }})
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        
        <el-form-item label="Java版本" v-if="needsJavaVersion">
          <el-select v-model="installForm.javaVersion" placeholder="选择Java版本">
            <el-option label="Java 8" value="8" />
            <el-option label="Java 11" value="11" />
            <el-option label="Java 17" value="17" />
            <el-option label="Java 21" value="21" />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="installDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="performInstall" :loading="installing">
          开始安装
        </el-button>
      </template>
    </el-dialog>

    <!-- 安装进度对话框 -->
    <el-dialog v-model="progressDialogVisible" title="安装进度" width="700px" :close-on-click-modal="false">
      <div class="install-progress">
        <el-progress :percentage="installProgress" :status="installStatus" />
        <div class="progress-text">{{ installProgressText }}</div>
        
        <div class="install-output">
          <el-input
            v-model="installOutput"
            type="textarea"
            :rows="15"
            readonly
            placeholder="安装输出将在这里显示..."
          />
        </div>
      </div>
      
      <template #footer>
        <el-button @click="progressDialogVisible = false" :disabled="installing">
          {{ installing ? '安装中...' : '关闭' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api, { wsClient } from '../api/index.js'
import dayjs from 'dayjs'

const tools = ref([])
const categories = ref({})
const summary = ref({ total: 0, installed: 0, missing: 0 })
const loading = ref(false)
const selectedCategory = ref('')
const selectedStatus = ref('')

const installHistory = ref([])
const loadingHistory = ref(false)

const installDialogVisible = ref(false)
const progressDialogVisible = ref(false)
const installing = ref(false)
const installProgress = ref(0)
const installStatus = ref('')
const installProgressText = ref('')
const installOutput = ref('')

const installForm = reactive({
  mode: 'selected',
  selectedTools: [],
  javaVersion: '8'
})

const filteredTools = computed(() => {
  let result = tools.value
  
  if (selectedCategory.value) {
    result = result.filter(tool => tool.category === selectedCategory.value)
  }
  
  if (selectedStatus.value) {
    result = result.filter(tool => tool.status === selectedStatus.value)
  }
  
  return result
})

const missingTools = computed(() => {
  return tools.value.filter(tool => tool.status === 'missing')
})

const needsJavaVersion = computed(() => {
  if (installForm.mode === 'all') return true
  return installForm.selectedTools.includes('java')
})

const checkEnvironment = async () => {
  loading.value = true
  try {
    const [supportedRes, checkRes] = await Promise.all([
      api.get('/tools/supported'),
      api.get('/tools/check-simple')  // 使用简化接口
    ])

    categories.value = supportedRes.data.categories
    summary.value = checkRes.data.summary
    tools.value = checkRes.data.tools
  } catch (error) {
    ElMessage.error('检查环境失败')
    console.error('Environment check error:', error)
  } finally {
    loading.value = false
  }
}

const filterTools = () => {
  // 触发计算属性重新计算
}

const showInstallDialog = () => {
  installForm.selectedTools = []
  installDialogVisible.value = true
}

const installSingleTool = (toolName) => {
  installForm.mode = 'selected'
  installForm.selectedTools = [toolName]
  performInstall()
}

const performInstall = async () => {
  installing.value = true
  installProgress.value = 0
  installStatus.value = ''
  installProgressText.value = '准备安装...'
  installOutput.value = ''
  
  installDialogVisible.value = false
  progressDialogVisible.value = true
  
  try {
    const params = {
      all: installForm.mode === 'all',
      tools: installForm.mode === 'selected' ? installForm.selectedTools : undefined,
      javaVersion: installForm.javaVersion
    }
    
    const response = await api.post('/tools/install', params)
    const installationId = response.data.installationId
    
    // 监听安装输出
    wsClient.on('tool_install_output', (data) => {
      if (data.installationId === installationId) {
        installOutput.value += data.data.content
        updateInstallProgress(data.data.content)
      }
    })
    
    // 监听安装完成
    wsClient.on('tool_install_complete', (data) => {
      if (data.installationId === installationId) {
        installing.value = false
        installProgress.value = 100
        installStatus.value = data.data.status === 'success' ? 'success' : 'exception'
        installProgressText.value = data.data.status === 'success' ? '安装完成' : '安装失败'
        
        if (data.data.status === 'success') {
          ElMessage.success('工具安装完成')
          checkEnvironment()
        } else {
          ElMessage.error('工具安装失败')
        }
        
        loadInstallHistory()
      }
    })
    
    // 监听安装错误
    wsClient.on('tool_install_error', (data) => {
      if (data.installationId === installationId) {
        installing.value = false
        installStatus.value = 'exception'
        installProgressText.value = '安装出错'
        ElMessage.error(`安装出错: ${data.data.error}`)
      }
    })
    
  } catch (error) {
    installing.value = false
    installStatus.value = 'exception'
    installProgressText.value = '安装失败'
    ElMessage.error('启动安装失败')
  }
}

const updateInstallProgress = (output) => {
  // 简单的进度估算逻辑
  const lines = installOutput.value.split('\n').length
  const estimatedProgress = Math.min(90, lines * 2)
  installProgress.value = estimatedProgress
  
  // 更新进度文本
  if (output.includes('Installing')) {
    installProgressText.value = '正在安装工具...'
  } else if (output.includes('Downloading')) {
    installProgressText.value = '正在下载...'
  } else if (output.includes('Configuring')) {
    installProgressText.value = '正在配置...'
  }
}

const loadInstallHistory = async () => {
  loadingHistory.value = true
  try {
    const response = await api.get('/tools/install/history?limit=10')
    installHistory.value = response.data.installations
  } catch (error) {
    ElMessage.error('加载安装历史失败')
  } finally {
    loadingHistory.value = false
  }
}

const viewInstallLog = (id) => {
  // TODO: 实现查看安装日志
  ElMessage.info('查看安装日志功能开发中')
}

const getCategoryType = (category) => {
  const typeMap = {
    'basic': 'info',
    'container': 'success',
    'kubernetes': 'primary',
    'java': 'warning',
    'nodejs': 'success',
    'other': 'info'
  }
  return typeMap[category] || 'info'
}

const getStatusType = (status) => {
  const typeMap = {
    'running': 'warning',
    'success': 'success',
    'failed': 'danger',
    'error': 'danger'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status) => {
  const textMap = {
    'running': '进行中',
    'success': '成功',
    'failed': '失败',
    'error': '错误'
  }
  return textMap[status] || status
}

const formatTime = (time) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

const formatDuration = (duration) => {
  if (!duration) return '-'
  const seconds = Math.floor(duration / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`
  } else {
    return `${remainingSeconds}秒`
  }
}

onMounted(() => {
  checkEnvironment()
  loadInstallHistory()
  wsClient.connect()
})
</script>

<style scoped>
.tools-management {
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
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 20px;
  color: white;
}

.stat-icon.installed {
  background: linear-gradient(135deg, #67C23A 0%, #85CE61 100%);
}

.stat-icon.missing {
  background: linear-gradient(135deg, #F56C6C 0%, #F78989 100%);
}

.stat-icon.total {
  background: linear-gradient(135deg, #409EFF 0%, #66B1FF 100%);
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

.tool-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-name .el-icon {
  color: #409EFF;
}

.install-progress {
  padding: 20px 0;
}

.progress-text {
  text-align: center;
  margin: 10px 0;
  color: #606266;
}

.install-output {
  margin-top: 20px;
}
</style>
