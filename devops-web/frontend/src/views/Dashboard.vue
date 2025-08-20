<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon workspace">
              <el-icon><Folder /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.workspaces }}</div>
              <div class="stat-label">工作空间</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon deployments">
              <el-icon><Upload /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.deployments }}</div>
              <div class="stat-label">总部署数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon tools">
              <el-icon><Tools /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.installedTools }}</div>
              <div class="stat-label">已安装工具</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon recent">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.recentDeployments }}</div>
              <div class="stat-label">24小时部署</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="content-row">
      <!-- 当前工作空间 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>当前工作空间</span>
              <el-button type="primary" size="small" @click="$router.push('/workspace')">
                管理工作空间
              </el-button>
            </div>
          </template>
          
          <div v-if="activeWorkspace" class="workspace-info">
            <div class="workspace-name">
              <el-icon><Folder /></el-icon>
              {{ activeWorkspace.name }}
            </div>
            <div class="workspace-details">
              <el-descriptions :column="1" size="small">
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
            <div class="workspace-actions">
              <el-button size="small" @click="$router.push(`/workspace/${activeWorkspace.name}`)">
                查看详情
              </el-button>
              <el-button size="small" @click="$router.push(`/workspace/${activeWorkspace.name}/config`)">
                编辑配置
              </el-button>
            </div>
          </div>
          
          <el-empty v-else description="未设置活跃工作空间" />
        </el-card>
      </el-col>

      <!-- 快速操作 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>快速操作</span>
          </template>
          
          <div class="quick-actions">
            <el-button type="primary" size="large" @click="$router.push('/command')" class="action-btn">
              <el-icon><Terminal /></el-icon>
              生成部署命令
            </el-button>
            
            <el-button type="success" size="large" @click="$router.push('/tools')" class="action-btn">
              <el-icon><Tools /></el-icon>
              管理开发工具
            </el-button>
            
            <el-button type="info" size="large" @click="$router.push('/workspace/create')" class="action-btn">
              <el-icon><Plus /></el-icon>
              创建工作空间
            </el-button>
            
            <el-button type="warning" size="large" @click="$router.push('/deploy')" class="action-btn">
              <el-icon><Upload /></el-icon>
              查看部署历史
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近活动 -->
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card>
          <template #header>
            <span>最近活动</span>
          </template>
          
          <el-timeline v-if="recentActivities.length > 0">
            <el-timeline-item
              v-for="activity in recentActivities"
              :key="activity.id"
              :timestamp="formatTime(activity.timestamp)"
              :type="getActivityType(activity.type)"
            >
              <div class="activity-content">
                <div class="activity-title">{{ activity.title }}</div>
                <div class="activity-description">{{ activity.description }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
          
          <el-empty v-else description="暂无最近活动" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api/index.js'
import dayjs from 'dayjs'

const stats = ref({
  workspaces: 0,
  deployments: 0,
  installedTools: 0,
  recentDeployments: 0
})

const activeWorkspace = ref(null)
const recentActivities = ref([])

const loadDashboardData = async () => {
  try {
    // 加载统计数据
    const [workspacesRes, deployStatsRes, toolsRes] = await Promise.all([
      api.get('/workspace'),
      api.get('/deploy/stats/summary'),
      api.get('/tools/check')
    ])

    stats.value.workspaces = workspacesRes.data.length
    stats.value.deployments = deployStatsRes.data.totalDeployments
    stats.value.recentDeployments = deployStatsRes.data.recentDeployments
    stats.value.installedTools = toolsRes.data.installed.length

    // 加载当前活跃工作空间
    const activeRes = await api.get('/workspace/active')
    if (activeRes.data.activeWorkspace) {
      const workspaceRes = await api.get(`/workspace/${activeRes.data.activeWorkspace}`)
      activeWorkspace.value = workspaceRes.data
    }

    // 模拟最近活动数据
    recentActivities.value = [
      {
        id: 1,
        type: 'deploy',
        title: '部署完成',
        description: '成功部署应用到生产环境',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: 2,
        type: 'workspace',
        title: '创建工作空间',
        description: '创建了新的工作空间 "test-env"',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000)
      },
      {
        id: 3,
        type: 'tools',
        title: '安装工具',
        description: '成功安装 Docker 和 kubectl',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000)
      }
    ]

  } catch (error) {
    console.error('加载仪表板数据失败:', error)
  }
}

const formatTime = (time) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

const getActivityType = (type) => {
  const typeMap = {
    deploy: 'success',
    workspace: 'primary',
    tools: 'info',
    error: 'danger'
  }
  return typeMap[type] || 'info'
}

onMounted(() => {
  loadDashboardData()
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.stats-row {
  margin-bottom: 20px;
}

.content-row {
  margin-bottom: 20px;
}

.stat-card {
  height: 120px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  font-size: 24px;
  color: white;
}

.stat-icon.workspace {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.deployments {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.tools {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.recent {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 32px;
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

.workspace-details {
  margin-bottom: 20px;
}

.workspace-actions {
  display: flex;
  gap: 10px;
}

.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.action-btn {
  height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.action-btn .el-icon {
  font-size: 20px;
}

.activity-content {
  padding-left: 10px;
}

.activity-title {
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.activity-description {
  color: #606266;
  font-size: 14px;
}
</style>
