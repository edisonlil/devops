<template>
  <div class="deploy-preview">
    <div class="preview-header">
      <div class="header-left">
        <n-button text @click="goBack">
          <template #icon>
            <n-icon><ArrowBack /></n-icon>
          </template>
          修改配置
        </n-button>
        <n-divider vertical />
        <h2>部署预览 - {{ templateName }}</h2>
      </div>
    </div>

    <div class="preview-content">
      <n-spin :show="loading">
        <div class="preview-layout">
          <!-- 左侧配置摘要 -->
          <div class="config-summary">
            <n-card title="📋 配置摘要">
              <div class="summary-section">
                <h4>基础信息</h4>
                <div class="summary-grid">
                  <div class="summary-item">
                    <span class="label">实例名称:</span>
                    <span class="value">{{ config.instance_name }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">模板类型:</span>
                    <span class="value">{{ templateName }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">工作空间:</span>
                    <span class="value">{{ workspaceName }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">命名空间:</span>
                    <span class="value">{{ config.namespace }}</span>
                  </div>
                </div>
              </div>

              <div class="summary-section">
                <h4>资源配置</h4>
                <div class="summary-grid">
                  <div class="summary-item">
                    <span class="label">CPU:</span>
                    <span class="value">{{ config.cpu_limit }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">内存:</span>
                    <span class="value">{{ config.memory_limit }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">存储:</span>
                    <span class="value">{{ config.storage_size }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">副本数:</span>
                    <span class="value">{{ config.replicas }}</span>
                  </div>
                </div>
              </div>

              <div class="summary-section">
                <h4>高级配置</h4>
                <div class="summary-grid">
                  <div class="summary-item">
                    <span class="label">自动备份:</span>
                    <n-tag :type="config.backup_enabled ? 'success' : 'default'" size="small">
                      {{ config.backup_enabled ? '已启用' : '未启用' }}
                    </n-tag>
                  </div>
                  <div class="summary-item">
                    <span class="label">监控:</span>
                    <n-tag :type="config.monitoring_enabled ? 'success' : 'default'" size="small">
                      {{ config.monitoring_enabled ? '已启用' : '未启用' }}
                    </n-tag>
                  </div>
                  <div class="summary-item">
                    <span class="label">网络隔离:</span>
                    <n-tag :type="config.network_policy_enabled ? 'success' : 'default'" size="small">
                      {{ config.network_policy_enabled ? '已启用' : '未启用' }}
                    </n-tag>
                  </div>
                </div>
              </div>

              <!-- 网络配置 -->
              <div v-if="previewData?.connection_info" class="summary-section">
                <h4>🌐 网络配置</h4>
                <div class="connection-info">
                  <div class="connection-item">
                    <span class="connection-label">内部访问:</span>
                    <n-button text size="small" @click="copyToClipboard(previewData.connection_info.internal)">
                      {{ previewData.connection_info.internal }}
                      <template #icon>
                        <n-icon><Copy /></n-icon>
                      </template>
                    </n-button>
                  </div>
                  <div v-if="previewData.connection_info.external" class="connection-item">
                    <span class="connection-label">外部访问:</span>
                    <n-button text size="small" @click="copyToClipboard(previewData.connection_info.external)">
                      {{ previewData.connection_info.external }}
                      <template #icon>
                        <n-icon><Copy /></n-icon>
                      </template>
                    </n-button>
                  </div>
                </div>
              </div>
            </n-card>
          </div>

          <!-- 右侧预览和命令 -->
          <div class="preview-panel">
            <!-- CLI命令 -->
            <n-card title="📝 等效CLI命令" class="cli-card">
              <div class="cli-command">
                <n-code 
                  :code="previewData?.cli_command || '加载中...'" 
                  language="bash"
                  show-line-numbers
                />
              </div>
              <div class="cli-actions">
                <n-button size="small" @click="copyToClipboard(previewData?.cli_command || '')">
                  <template #icon>
                    <n-icon><Copy /></n-icon>
                  </template>
                  复制命令
                </n-button>
              </div>
            </n-card>

            <!-- YAML预览 -->
            <n-card title="📄 生成的配置文件" class="yaml-card">
              <div class="yaml-preview">
                <n-code 
                  :code="previewData?.yaml || '加载中...'" 
                  language="yaml"
                  show-line-numbers
                />
              </div>
              <div class="yaml-actions">
                <n-button size="small" @click="copyToClipboard(previewData?.yaml || '')">
                  <template #icon>
                    <n-icon><Copy /></n-icon>
                  </template>
                  复制配置
                </n-button>
                <n-button size="small" @click="downloadYaml">
                  <template #icon>
                    <n-icon><Download /></n-icon>
                  </template>
                  下载文件
                </n-button>
              </div>
            </n-card>

            <!-- 成本预估 -->
            <n-card title="💰 成本预估" class="cost-card">
              <div class="cost-summary">
                <div class="cost-item">
                  <span>CPU:</span>
                  <span>${{ costEstimation.cpu.toFixed(2) }}/月</span>
                </div>
                <div class="cost-item">
                  <span>内存:</span>
                  <span>${{ costEstimation.memory.toFixed(2) }}/月</span>
                </div>
                <div class="cost-item">
                  <span>存储:</span>
                  <span>${{ costEstimation.storage.toFixed(2) }}/月</span>
                </div>
                <div v-if="config.backup_enabled" class="cost-item">
                  <span>备份:</span>
                  <span>${{ costEstimation.backup.toFixed(2) }}/月</span>
                </div>
                <n-divider />
                <div class="cost-total">
                  <span>预估总成本:</span>
                  <span class="total-amount">${{ costEstimation.total.toFixed(2) }}/月</span>
                </div>
              </div>
            </n-card>
          </div>
        </div>
      </n-spin>
    </div>

    <!-- 底部操作栏 -->
    <div class="preview-footer">
      <n-space justify="space-between">
        <n-button @click="goBack">
          <template #icon>
            <n-icon><ArrowBack /></n-icon>
          </template>
          修改配置
        </n-button>
        
        <n-space>
          <n-button @click="saveAsTemplate">
            <template #icon>
              <n-icon><Save /></n-icon>
            </template>
            保存为模板
          </n-button>
          <n-button 
            type="primary" 
            size="large"
            @click="startDeployment"
            :loading="deploying"
          >
            <template #icon>
              <n-icon><Rocket /></n-icon>
            </template>
            🚀 开始部署
          </n-button>
        </n-space>
      </n-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { 
  ArrowBack, 
  Copy, 
  Download, 
  Save, 
  Rocket 
} from '@vicons/ionicons5'
import { middlewareApi } from '@/api/middleware'
import type { DeploymentConfig, CostEstimation } from '@/types/middleware'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const loading = ref(false)
const deploying = ref(false)
const previewData = ref<{
  yaml: string
  cli_command: string
  connection_info: {
    internal: string
    external?: string
  }
} | null>(null)

const costEstimation = ref<CostEstimation>({
  cpu: 0,
  memory: 0,
  storage: 0,
  backup: 0,
  total: 0
})

const workspaceName = computed(() => route.params.workspaceName as string)
const templateName = computed(() => route.params.templateName as string)
const instanceName = computed(() => route.params.instanceName as string)

// 从查询参数获取配置
const config = computed(() => {
  try {
    return JSON.parse(route.query.config as string || '{}')
  } catch {
    return {}
  }
})

const loadPreviewData = async () => {
  loading.value = true
  try {
    const deploymentConfig: DeploymentConfig = {
      instance_name: instanceName.value,
      template_name: templateName.value,
      workspace: workspaceName.value,
      namespace: config.value.namespace || 'middleware',
      parameters: config.value
    }

    const [previewResponse, costResponse] = await Promise.all([
      middlewareApi.previewConfig(workspaceName.value, deploymentConfig),
      middlewareApi.estimateCost(workspaceName.value, config.value)
    ])

    previewData.value = previewResponse
    costEstimation.value = costResponse
  } catch (error: any) {
    message.error(error.message || '获取预览数据失败')
  } finally {
    loading.value = false
  }
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  } catch (error) {
    message.error('复制失败')
  }
}

const downloadYaml = () => {
  if (!previewData.value?.yaml) {
    message.error('没有可下载的配置文件')
    return
  }

  const blob = new Blob([previewData.value.yaml], { type: 'text/yaml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${instanceName.value}-${templateName.value}.yaml`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  message.success('配置文件已下载')
}

const saveAsTemplate = () => {
  message.info('保存为模板功能开发中...')
}

const startDeployment = async () => {
  deploying.value = true
  try {
    const deploymentConfig: DeploymentConfig = {
      instance_name: instanceName.value,
      template_name: templateName.value,
      workspace: workspaceName.value,
      namespace: config.value.namespace || 'middleware',
      parameters: config.value
    }

    const response = await middlewareApi.deploy(workspaceName.value, deploymentConfig)
    
    message.success('部署已开始')
    
    // 跳转到部署进度页面
    router.push({
      name: 'MiddlewareProgress',
      params: {
        workspaceName: workspaceName.value,
        deploymentId: response.deploymentId
      }
    })
  } catch (error: any) {
    message.error(error.message || '启动部署失败')
  } finally {
    deploying.value = false
  }
}

const goBack = () => {
  router.push({
    name: 'MiddlewareConfig',
    params: {
      workspaceName: workspaceName.value,
      templateName: templateName.value,
      instanceName: instanceName.value
    }
  })
}

onMounted(() => {
  loadPreviewData()
})
</script>

<style scoped>
.deploy-preview {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.preview-header {
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  margin: 0;
  color: #333;
}

.preview-content {
  margin-bottom: 24px;
}

.preview-layout {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
}

.config-summary {
  height: fit-content;
}

.summary-section {
  margin-bottom: 24px;
}

.summary-section:last-child {
  margin-bottom: 0;
}

.summary-section h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

.summary-grid {
  display: grid;
  gap: 8px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.summary-item .label {
  color: #666;
}

.summary-item .value {
  color: #333;
  font-weight: 500;
}

.connection-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.connection-item {
  display: flex;
  align-items: center;
  font-size: 12px;
}

.connection-label {
  color: #666;
  margin-right: 8px;
  min-width: 60px;
}

.preview-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cli-card,
.yaml-card,
.cost-card {
  height: fit-content;
}

.cli-command,
.yaml-preview {
  max-height: 300px;
  overflow: auto;
  margin-bottom: 12px;
}

.cli-actions,
.yaml-actions {
  display: flex;
  gap: 8px;
}

.cost-summary {
  font-size: 14px;
}

.cost-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #666;
}

.cost-total {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  color: #333;
  font-size: 16px;
}

.total-amount {
  color: #1890ff;
}

.preview-footer {
  padding: 16px 0;
  border-top: 1px solid #f0f0f0;
  background: white;
  position: sticky;
  bottom: 0;
  z-index: 10;
}

@media (max-width: 1200px) {
  .preview-layout {
    grid-template-columns: 1fr;
  }
  
  .config-summary {
    order: 1;
  }
  
  .preview-panel {
    order: 0;
  }
}

@media (max-width: 768px) {
  .deploy-preview {
    padding: 16px;
  }
  
  .preview-header .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .cli-command,
  .yaml-preview {
    max-height: 200px;
  }
}
</style>
