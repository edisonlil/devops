<template>
  <div class="application-manager">
    <div class="manager-header">
      <h2>应用管理</h2>
      <n-space>
        <n-button type="primary" @click="showDeployDialog = true">
          <template #icon>
            <n-icon><Add /></n-icon>
          </template>
          部署应用
        </n-button>
        <n-button @click="refreshData" :loading="loading">
          <template #icon>
            <n-icon><Refresh /></n-icon>
          </template>
          刷新
        </n-button>
      </n-space>
    </div>

    <!-- 功能提示 -->
    <div class="feature-notice">
      <n-alert type="info" :show-icon="false">
        <template #icon>
          <n-icon><InformationCircle /></n-icon>
        </template>
        <strong>应用管理功能开发中</strong>
        <p style="margin: 8px 0 0 0;">
          此功能将支持容器化应用的部署、管理和监控。包括：
        </p>
        <ul style="margin: 8px 0 0 20px; padding: 0;">
          <li>Docker 镜像部署</li>
          <li>Kubernetes 应用管理</li>
          <li>应用生命周期管理</li>
          <li>服务发现和负载均衡</li>
          <li>应用监控和日志</li>
        </ul>
      </n-alert>
    </div>

    <!-- 应用概览 -->
    <div class="stats-section">
      <div class="stats-grid">
        <n-card class="stat-card">
          <div class="stat-content">
            <div class="stat-value">0</div>
            <div class="stat-label">运行中应用</div>
          </div>
        </n-card>
        
        <n-card class="stat-card">
          <div class="stat-content">
            <div class="stat-value">0</div>
            <div class="stat-label">部署任务</div>
          </div>
        </n-card>
        
        <n-card class="stat-card">
          <div class="stat-content">
            <div class="stat-value">0</div>
            <div class="stat-label">服务数量</div>
          </div>
        </n-card>
        
        <n-card class="stat-card">
          <div class="stat-content">
            <div class="stat-value">$0.00</div>
            <div class="stat-label">月成本</div>
          </div>
        </n-card>
      </div>
    </div>

    <!-- 快速操作 -->
    <div class="quick-actions-section">
      <n-card title="🚀 快速开始">
        <div class="quick-actions">
          <div class="action-card" @click="showComingSoon('Docker 部署')">
            <div class="action-icon">🐳</div>
            <div class="action-title">Docker 部署</div>
            <div class="action-description">从 Docker 镜像快速部署应用</div>
          </div>
          
          <div class="action-card" @click="showComingSoon('Git 部署')">
            <div class="action-icon">📦</div>
            <div class="action-title">Git 部署</div>
            <div class="action-description">从 Git 仓库构建并部署应用</div>
          </div>
          
          <div class="action-card" @click="showComingSoon('应用商店')">
            <div class="action-icon">🏪</div>
            <div class="action-title">应用商店</div>
            <div class="action-description">从应用商店一键部署常用应用</div>
          </div>
          
          <div class="action-card" @click="showComingSoon('Helm Chart')">
            <div class="action-icon">⚓</div>
            <div class="action-title">Helm Chart</div>
            <div class="action-description">使用 Helm Chart 部署复杂应用</div>
          </div>
        </div>
      </n-card>
    </div>

    <!-- 应用列表 -->
    <div class="applications-section">
      <n-card title="应用列表">
        <template #header-extra>
          <n-space>
            <n-input 
              v-model:value="searchQuery" 
              placeholder="搜索应用..." 
              clearable
              style="width: 200px;"
            >
              <template #prefix>
                <n-icon><Search /></n-icon>
              </template>
            </n-input>
            <n-select
              v-model:value="statusFilter"
              placeholder="状态筛选"
              clearable
              style="width: 120px;"
              :options="statusOptions"
            />
          </n-space>
        </template>

        <n-empty description="暂无应用部署" />
      </n-card>
    </div>

    <!-- 部署应用对话框 -->
    <n-modal v-model:show="showDeployDialog" style="width: 600px;">
      <n-card title="部署应用" :bordered="false" size="huge">
        <template #header-extra>
          <n-button quaternary circle @click="showDeployDialog = false">
            <template #icon>
              <n-icon><Close /></n-icon>
            </template>
          </n-button>
        </template>
        
        <div class="deploy-options">
          <n-alert type="info" style="margin-bottom: 20px;">
            应用部署功能正在开发中，敬请期待！
          </n-alert>
          
          <div class="deploy-methods">
            <div class="method-card disabled">
              <div class="method-icon">🐳</div>
              <div class="method-content">
                <div class="method-title">Docker 镜像</div>
                <div class="method-description">从 Docker Hub 或私有仓库部署</div>
              </div>
              <div class="method-status">开发中</div>
            </div>
            
            <div class="method-card disabled">
              <div class="method-icon">📦</div>
              <div class="method-content">
                <div class="method-title">Git 仓库</div>
                <div class="method-description">从源码构建并部署</div>
              </div>
              <div class="method-status">开发中</div>
            </div>
            
            <div class="method-card disabled">
              <div class="method-icon">📄</div>
              <div class="method-content">
                <div class="method-title">YAML 配置</div>
                <div class="method-description">上传 Kubernetes YAML 文件</div>
              </div>
              <div class="method-status">开发中</div>
            </div>
          </div>
        </div>

        <template #footer>
          <div style="display: flex; justify-content: flex-end;">
            <n-button @click="showDeployDialog = false">关闭</n-button>
          </div>
        </template>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { Add, Refresh, Search, Close, InformationCircle } from '@vicons/ionicons5'

const message = useMessage()

const loading = ref(false)
const showDeployDialog = ref(false)
const searchQuery = ref('')
const statusFilter = ref<string | null>(null)

const statusOptions = [
  { label: '运行中', value: 'running' },
  { label: '已停止', value: 'stopped' },
  { label: '部署中', value: 'deploying' },
  { label: '异常', value: 'error' }
]

const refreshData = async () => {
  loading.value = true
  try {
    // 这里将来会调用实际的API获取应用列表
    await new Promise(resolve => setTimeout(resolve, 1000))
  } catch (error: any) {
    message.error(error.message || '获取应用列表失败')
  } finally {
    loading.value = false
  }
}

const showComingSoon = (feature: string) => {
  message.info(`${feature} 功能开发中，敬请期待！`)
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.application-manager {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.manager-header h2 {
  margin: 0;
  color: #333;
}

.feature-notice {
  margin-bottom: 24px;
}

.stats-section {
  margin-bottom: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  text-align: center;
}

.stat-content {
  padding: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.quick-actions-section {
  margin-bottom: 24px;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border: 2px solid #f0f0f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.action-card:hover {
  border-color: #1890ff;
  background: rgba(24, 144, 255, 0.05);
}

.action-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.action-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.action-description {
  font-size: 14px;
  color: #666;
  line-height: 1.4;
}

.applications-section {
  margin-bottom: 24px;
}

.deploy-options {
  width: 100%;
}

.deploy-methods {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.method-card {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 2px solid #f0f0f0;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.method-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.method-card:not(.disabled):hover {
  border-color: #1890ff;
  background: rgba(24, 144, 255, 0.05);
}

.method-icon {
  font-size: 24px;
  margin-right: 16px;
  flex-shrink: 0;
}

.method-content {
  flex: 1;
}

.method-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.method-description {
  font-size: 14px;
  color: #666;
}

.method-status {
  font-size: 12px;
  color: #faad14;
  background: rgba(250, 173, 20, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

@media (max-width: 768px) {
  .application-manager {
    padding: 16px;
  }
  
  .manager-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }
  
  .quick-actions {
    grid-template-columns: 1fr;
  }
  
  .method-card {
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }
  
  .method-icon {
    margin-right: 0;
    margin-bottom: 8px;
  }
}
</style>
