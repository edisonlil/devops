<template>
  <div class="workspace-detail">
    <div class="page-header">
      <h2>工作空间详情 - {{ workspaceName }}</h2>
      <div class="header-actions">
        <el-button @click="$router.push(`/workspace/${workspaceName}/config`)">
          <el-icon><Edit /></el-icon>
          编辑配置
        </el-button>
        <el-button @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
      </div>
    </div>

    <el-row :gutter="20" v-loading="loading">
      <!-- 基本信息 -->
      <el-col :span="24">
        <el-card>
          <template #header>
            <span>基本信息</span>
          </template>
          <el-descriptions :column="2" border v-if="workspace">
            <el-descriptions-item label="工作空间名称">{{ workspace.name }}</el-descriptions-item>
            <el-descriptions-item label="构建平台">
              <el-tag :type="getPlatformType(workspace.config.BUILD_PLATFORM)">
                {{ workspace.config.BUILD_PLATFORM || 'DOCKER_SWARM' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="Harbor地址">{{ workspace.config.BUILD_HARBOR_ADDRESS || '未配置' }}</el-descriptions-item>
            <el-descriptions-item label="Harbor项目">{{ workspace.config.BUILD_HARBOR_PROJECT || '未配置' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatTime(workspace.createdAt) }}</el-descriptions-item>
            <el-descriptions-item label="修改时间">{{ formatTime(workspace.modifiedAt) }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <!-- 配置详情 -->
      <el-col :span="12" style="margin-top: 20px;">
        <el-card>
          <template #header>
            <span>配置详情</span>
          </template>
          <el-descriptions :column="1" v-if="workspace">
            <el-descriptions-item 
              v-if="workspace.config.BUILD_DOCKER_STACK_NAME" 
              label="Stack名称"
            >
              {{ workspace.config.BUILD_DOCKER_STACK_NAME }}
            </el-descriptions-item>
            <el-descriptions-item 
              v-if="workspace.config.BUILD_DOCKER_SWARM_NETWORK" 
              label="Swarm网络"
            >
              {{ workspace.config.BUILD_DOCKER_SWARM_NETWORK }}
            </el-descriptions-item>
            <el-descriptions-item 
              v-if="workspace.config.BUILD_K8S_NAMESPACE" 
              label="K8s Namespace"
            >
              {{ workspace.config.BUILD_K8S_NAMESPACE }}
            </el-descriptions-item>
            <el-descriptions-item label="启用模板">
              {{ workspace.config.BUILD_ENABEL_TEMPLATES || '无' }}
            </el-descriptions-item>
            <el-descriptions-item label="启用Dockerfile">
              {{ workspace.config.BUILD_ENABEL_DOCKERFILES || '无' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <!-- 文件统计 -->
      <el-col :span="12" style="margin-top: 20px;">
        <el-card>
          <template #header>
            <span>文件统计</span>
          </template>
          <div class="file-stats" v-if="workspace">
            <div class="stat-item">
              <el-icon><Document /></el-icon>
              <span class="stat-label">配置文件:</span>
              <span class="stat-value">{{ workspace.hasConfig ? '已配置' : '未配置' }}</span>
            </div>
            <div class="stat-item">
              <el-icon><Files /></el-icon>
              <span class="stat-label">Dockerfile:</span>
              <span class="stat-value">{{ workspace.dockerfiles.length }} 个</span>
            </div>
            <div class="stat-item">
              <el-icon><Document /></el-icon>
              <span class="stat-label">模板文件:</span>
              <span class="stat-value">{{ workspace.templates.length }} 个</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- Dockerfile列表 -->
      <el-col :span="12" style="margin-top: 20px;" v-if="workspace && workspace.dockerfiles.length > 0">
        <el-card>
          <template #header>
            <span>Dockerfile 文件</span>
          </template>
          <div class="file-list">
            <div v-for="dockerfile in workspace.dockerfiles" :key="dockerfile" class="file-item">
              <el-icon><Document /></el-icon>
              <span>{{ dockerfile }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 模板列表 -->
      <el-col :span="12" style="margin-top: 20px;" v-if="workspace && workspace.templates.length > 0">
        <el-card>
          <template #header>
            <span>模板文件</span>
          </template>
          <div class="file-list">
            <div v-for="template in workspace.templates" :key="template" class="file-item">
              <el-icon><Document /></el-icon>
              <span>{{ template }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../../api/index.js'
import dayjs from 'dayjs'

const route = useRoute()
const workspaceName = route.params.name
const workspace = ref(null)
const loading = ref(false)

const loadWorkspace = async () => {
  loading.value = true
  try {
    const response = await api.get(`/workspace/${workspaceName}`)
    workspace.value = response.data
  } catch (error) {
    ElMessage.error('加载工作空间详情失败')
  } finally {
    loading.value = false
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
  loadWorkspace()
})
</script>

<style scoped>
.workspace-detail {
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

.file-stats {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  font-weight: 500;
  color: #606266;
}

.stat-value {
  color: #303133;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-item .el-icon {
  color: #409EFF;
}
</style>
