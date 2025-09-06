<template>
  <div class="parameter-config">
    <div class="config-header">
      <div class="header-left">
        <n-button text @click="goBack">
          <template #icon>
            <n-icon><ArrowBack /></n-icon>
          </template>
          返回选择
        </n-button>
        <n-divider vertical />
        <h2>{{ templateInfo?.name }} 部署配置</h2>
      </div>
    </div>

    <div class="config-content">
      <n-spin :show="loading">
        <!-- 视图切换选项卡 -->
        <div class="view-tabs">
          <n-tabs 
            v-model:value="currentView" 
            type="segment" 
            size="large"
            @update:value="handleViewChange"
          >
            <n-tab-pane name="config" tab="📝 配置参数">
            </n-tab-pane>
            <n-tab-pane name="preview" tab="👀 预览模板">
            </n-tab-pane>
          </n-tabs>
        </div>

        <div class="config-layout">
          <!-- 左侧配置表单 -->
          <div class="config-form" v-show="currentView === 'config'">
            <!-- 配置表单内容 -->
            <div class="form-container">
            <n-card title="配置参数">
              <n-form
                ref="formRef"
                :model="formData"
                :rules="formRules"
                label-placement="top"
                require-mark-placement="right-hanging"
              >
                <!-- 基础配置 -->
                <div class="form-section">
                  <h3>📋 基础配置</h3>
                  <n-form-item label="实例名称" path="instance_name">
                    <n-input 
                      v-model:value="formData.instance_name" 
                      placeholder="cache-server"
                      :status="getFieldStatus('instance_name')"
                    />
                    <template #feedback>
                      <span v-if="getFieldMessage('instance_name')">
                        {{ getFieldMessage('instance_name') }}
                      </span>
                    </template>
                  </n-form-item>

                  <n-form-item label="命名空间" path="namespace">
                    <n-select
                      v-model:value="formData.namespace"
                      :options="namespaceOptions"
                      placeholder="选择命名空间"
                    />
                  </n-form-item>
                </div>

                <!-- 资源配置 -->
                <div class="form-section">
                  <h3>📊 资源配置</h3>
                  
                  <n-form-item label="CPU" path="cpu_limit">
                    <ResourceSlider
                      v-model:value="formData.cpu_limit"
                      :options="cpuOptions"
                      label="CPU"
                      unit="Cores"
                    />
                  </n-form-item>

                  <n-form-item label="内存" path="memory_limit">
                    <ResourceSlider
                      v-model:value="formData.memory_limit"
                      :options="memoryOptions"
                      label="内存"
                      unit=""
                    />
                  </n-form-item>

                  <n-form-item label="存储大小" path="storage_size">
                    <n-input-number
                      v-model:value="storageValue"
                      :min="1"
                      :max="1000"
                      style="width: 120px;"
                    />
                    <n-select
                      v-model:value="storageUnit"
                      :options="storageUnitOptions"
                      style="width: 80px; margin-left: 8px;"
                    />
                  </n-form-item>

                  <n-form-item label="副本数量" path="replicas">
                    <n-input-number
                      v-model:value="formData.replicas"
                      :min="1"
                      :max="10"
                      style="width: 120px;"
                    />
                  </n-form-item>
                </div>

                <!-- 动态表单字段 -->
                <div v-if="templateForm" class="form-section">
                  <h3>🔧 {{ templateInfo?.type }} 特定配置</h3>
                  <DynamicFormFields
                    v-model:value="formData"
                    :form-definition="templateForm"
                    @validate="handleFieldValidation"
                  />
                </div>

                <!-- 高级配置 -->
                <div class="form-section">
                  <n-collapse>
                    <n-collapse-item title="🚀 高级配置 (可选)" name="advanced">
                      <n-form-item label="备份设置">
                        <n-switch v-model:value="formData.backup_enabled" />
                        <span style="margin-left: 8px;">启用自动备份</span>
                      </n-form-item>

                      <n-form-item label="监控设置">
                        <n-switch v-model:value="formData.monitoring_enabled" />
                        <span style="margin-left: 8px;">启用监控</span>
                      </n-form-item>

                      <n-form-item label="网络策略">
                        <n-switch v-model:value="formData.network_policy_enabled" />
                        <span style="margin-left: 8px;">启用网络隔离</span>
                      </n-form-item>
                    </n-collapse-item>
                  </n-collapse>
                </div>
              </n-form>
            </n-card>
            </div>
          </div>

          <!-- 模板预览视图 -->
          <div class="template-preview" v-show="currentView === 'preview'">
            <n-card title="模板预览" class="preview-card">
              <template #header-extra>
                <n-space>
                  <n-tag type="info" size="small">只读</n-tag>
                  <n-button size="small" quaternary @click="refreshPreview" :loading="renderingPreview">
                    刷新预览
                  </n-button>
                </n-space>
              </template>

              <div class="preview-content">
                <n-spin :show="renderingPreview">
                  <div v-if="renderedTemplate" class="template-files">
                    <!-- 文件选择器 -->
                    <div class="file-selector">
                      <n-select
                        v-model:value="selectedFile"
                        :options="templateFiles"
                        placeholder="选择文件查看"
                        size="small"
                        style="width: 250px;"
                      />
                    </div>

                    <!-- 文件内容显示 -->
                    <div class="file-content">
                      <div class="file-header">
                        <span class="file-name">{{ selectedFile || '请选择文件' }}</span>
                        <n-button-group size="small">
                          <n-button @click="copyToClipboard">复制</n-button>
                          <n-button @click="downloadFile">下载</n-button>
                        </n-button-group>
                      </div>
                      
                      <div class="code-viewer">
                        <pre><code v-html="highlightedCode"></code></pre>
                      </div>
                    </div>
                  </div>

                  <div v-else class="empty-preview">
                    <n-empty description="暂无预览内容">
                      <template #icon>
                        <n-icon size="48"><DocumentText /></n-icon>
                      </template>
                      <template #extra>
                        <n-button size="small" @click="refreshPreview">
                          生成预览
                        </n-button>
                      </template>
                    </n-empty>
                  </div>
                </n-spin>
              </div>
            </n-card>
          </div>

          <!-- 右侧信息面板 -->
          <div class="info-panel">
            <!-- 成本预估 -->
            <n-card title="💰 预估成本" class="cost-card">
              <div class="cost-breakdown">
                <div class="cost-item">
                  <span>CPU:</span>
                  <span>${{ costEstimation.cpu.toFixed(2) }}</span>
                </div>
                <div class="cost-item">
                  <span>内存:</span>
                  <span>${{ costEstimation.memory.toFixed(2) }}</span>
                </div>
                <div class="cost-item">
                  <span>存储:</span>
                  <span>${{ costEstimation.storage.toFixed(2) }}</span>
                </div>
                <div v-if="formData.backup_enabled" class="cost-item">
                  <span>备份:</span>
                  <span>${{ costEstimation.backup.toFixed(2) }}</span>
                </div>
                <n-divider />
                <div class="cost-total">
                  <span>总计:</span>
                  <span>${{ costEstimation.total.toFixed(2) }}/月</span>
                </div>
              </div>
            </n-card>

            <!-- 智能建议 -->
            <n-card title="💡 智能建议" class="tips-card">
              <div v-if="!recommendations.length" class="no-tips">
                <n-icon size="24" color="#52c41a"><CheckmarkCircle /></n-icon>
                <span>配置看起来不错！</span>
              </div>
              <div v-else class="recommendations">
                <div 
                  v-for="tip in recommendations" 
                  :key="tip.message"
                  class="tip-item"
                  :class="tip.type"
                >
                  <n-icon :color="getTipColor(tip.type)">
                    <component :is="getTipIcon(tip.type)" />
                  </n-icon>
                  <span>{{ tip.message }}</span>
                </div>
              </div>
            </n-card>

            <!-- 工作空间建议 -->
            <n-card title="🏢 工作空间建议" class="workspace-tips-card">
              <div class="workspace-tip">
                已应用 {{ workspaceName }} 环境的默认安全配置
              </div>
            </n-card>
          </div>
        </div>
      </n-spin>
    </div>

    <!-- 底部操作栏 -->
    <div class="config-footer">
      <n-space justify="space-between">
        <n-button @click="goBack">
          <template #icon>
            <n-icon><ArrowBack /></n-icon>
          </template>
          返回选择
        </n-button>
        
        <n-space>
          <n-button @click="resetForm">重置</n-button>
          <n-button 
            type="primary" 
            @click="previewConfig"
            :disabled="!isFormValid"
            :loading="validating"
          >
            预览配置
            <template #icon>
              <n-icon><ArrowForward /></n-icon>
            </template>
          </n-button>
        </n-space>
      </n-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { 
  ArrowBack, 
  ArrowForward, 
  CheckmarkCircle, 
  Warning, 
  InformationCircle,
  DocumentText 
} from '@vicons/ionicons5'
import { middlewareApi } from '@/api/middleware'
import type { 
  MiddlewareTemplate, 
  TemplateFormDefinition, 
  CostEstimation 
} from '@/types/middleware'
import ResourceSlider from '@/components/middleware/ResourceSlider.vue'
import DynamicFormFields from '@/components/middleware/DynamicFormFields.vue'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const loading = ref(false)
const validating = ref(false)
const renderingPreview = ref(false)
const templateInfo = ref<MiddlewareTemplate | null>(null)
const templateForm = ref<TemplateFormDefinition | null>(null)
const formRef = ref()

// 视图切换相关
const currentView = ref('config') // 'config' | 'preview'
const renderedTemplate = ref<Record<string, string> | null>(null)
const selectedFile = ref('')
const templateFiles = ref<Array<{ label: string; value: string }>>([])
const highlightedCode = ref('')

const workspaceName = computed(() => route.params.workspaceName as string)
const templateName = computed(() => route.params.templateName as string)

// 表单数据
const formData = ref({
  instance_name: '',
  namespace: 'middleware',
  cpu_limit: '500m',
  memory_limit: '2Gi',
  storage_size: '5Gi',
  replicas: 1,
  backup_enabled: true,
  monitoring_enabled: true,
  network_policy_enabled: false
})

// 存储大小分离处理
const storageValue = ref(5)
const storageUnit = ref('Gi')

// 表单验证规则
const formRules = {
  instance_name: [
    { required: true, message: '请输入实例名称' },
    { pattern: /^[a-z0-9-]+$/, message: '只能包含小写字母、数字和连字符' }
  ],
  namespace: [
    { required: true, message: '请选择命名空间' }
  ]
}

// 选项配置
const namespaceOptions = [
  { label: 'middleware', value: 'middleware' },
  { label: 'default', value: 'default' },
  { label: 'production', value: 'production' },
  { label: 'development', value: 'development' }
]

const cpuOptions = ['100m', '200m', '500m', '1000m', '2000m', '4000m']
const memoryOptions = ['512Mi', '1Gi', '2Gi', '4Gi', '8Gi', '16Gi']
const storageUnitOptions = [
  { label: 'Gi', value: 'Gi' },
  { label: 'Ti', value: 'Ti' }
]

// 成本预估
const costEstimation = ref<CostEstimation>({
  cpu: 0,
  memory: 0,
  storage: 0,
  backup: 0,
  total: 0
})

// 智能建议
const recommendations = ref<Array<{
  type: 'info' | 'warning' | 'error'
  message: string
}>>([])

const isFormValid = ref(false)

// 监听存储值变化
watch([storageValue, storageUnit], ([value, unit]) => {
  formData.value.storage_size = `${value}${unit}`
})

// 监听表单数据变化，更新成本预估
watch(formData, async (newData) => {
  await updateCostEstimation()
  updateRecommendations()
}, { deep: true })

const loadTemplateInfo = async () => {
  loading.value = true
  try {
    const [templateResponse, formResponse] = await Promise.all([
      middlewareApi.getTemplate(workspaceName.value, templateName.value),
      middlewareApi.getTemplateForm(workspaceName.value, templateName.value)
    ])
    
    templateInfo.value = templateResponse
    templateForm.value = formResponse.form
    
    // 设置默认实例名称
    if (!formData.value.instance_name) {
      formData.value.instance_name = `${templateInfo.value.type}-${Date.now().toString(36).slice(-4)}`
    }
  } catch (error: any) {
    message.error(error.message || '获取模板信息失败')
  } finally {
    loading.value = false
  }
}

const updateCostEstimation = async () => {
  try {
    const response = await middlewareApi.estimateCost(workspaceName.value, formData.value)
    costEstimation.value = response
  } catch (error) {
    console.error('成本预估失败:', error)
  }
}

const updateRecommendations = () => {
  const tips: Array<{ type: 'info' | 'warning' | 'error', message: string }> = []
  
  // 内存建议
  const memoryMB = parseMemory(formData.value.memory_limit)
  if (memoryMB < 1024) {
    tips.push({
      type: 'warning',
      message: '生产环境建议至少1Gi内存以确保稳定性'
    })
  }
  
  // 副本数建议
  if (formData.value.replicas === 1 && templateName.value.includes('cluster')) {
    tips.push({
      type: 'info',
      message: '集群模式建议至少3个副本以确保高可用'
    })
  }
  
  // 备份建议
  if (!formData.value.backup_enabled) {
    tips.push({
      type: 'warning',
      message: '建议启用备份以保护重要数据'
    })
  }
  
  // 成本建议
  if (costEstimation.value.total > 100) {
    tips.push({
      type: 'info',
      message: '成本较高，可考虑调整资源配置以优化成本'
    })
  }
  
  recommendations.value = tips
}

const parseMemory = (memoryStr: string): number => {
  if (memoryStr.endsWith('Gi')) {
    return parseInt(memoryStr) * 1024
  }
  if (memoryStr.endsWith('Mi')) {
    return parseInt(memoryStr)
  }
  return 0
}

const getTipColor = (type: string) => {
  switch (type) {
    case 'warning': return '#faad14'
    case 'error': return '#ff4d4f'
    case 'info': return '#1890ff'
    default: return '#666'
  }
}

const getTipIcon = (type: string) => {
  switch (type) {
    case 'warning': return Warning
    case 'error': return Warning
    case 'info': return InformationCircle
    default: return InformationCircle
  }
}

const getFieldStatus = (fieldName: string) => {
  // 这里应该实现字段验证状态逻辑
  return undefined
}

const getFieldMessage = (fieldName: string) => {
  // 这里应该实现字段验证消息逻辑
  return ''
}

const handleFieldValidation = (valid: boolean) => {
  isFormValid.value = valid
}

const resetForm = () => {
  formData.value = {
    instance_name: `${templateInfo.value?.type}-${Date.now().toString(36).slice(-4)}`,
    namespace: 'middleware',
    cpu_limit: '500m',
    memory_limit: '2Gi',
    storage_size: '5Gi',
    replicas: 1,
    backup_enabled: true,
    monitoring_enabled: true,
    network_policy_enabled: false
  }
  storageValue.value = 5
  storageUnit.value = 'Gi'
}

const previewConfig = async () => {
  validating.value = true
  try {
    // 验证表单
    await formRef.value?.validate()
    
    // 跳转到预览页面
    router.push({
      name: 'MiddlewarePreview',
      params: {
        workspaceName: workspaceName.value,
        templateName: templateName.value,
        instanceName: formData.value.instance_name
      },
      query: {
        config: JSON.stringify(formData.value)
      }
    })
  } catch (error) {
    message.error('请检查表单配置')
  } finally {
    validating.value = false
  }
}

// 视图切换处理
const handleViewChange = (view: string) => {
  if (view === 'preview' && !renderedTemplate.value) {
    // 切换到预览时自动生成预览
    refreshPreview()
  }
}

// 刷新模板预览
const refreshPreview = async () => {
  renderingPreview.value = true
  try {
    // 调用API渲染模板
    const response = await middlewareApi.renderTemplate(
      workspaceName.value, 
      templateName.value, 
      formData.value
    )
    
    renderedTemplate.value = response.files
    
    // 构建文件选项
    templateFiles.value = Object.keys(response.files).map(filename => ({
      label: filename,
      value: filename
    }))
    
    // 默认选择第一个文件
    if (templateFiles.value.length > 0) {
      selectedFile.value = templateFiles.value[0].value
      updateHighlightedCode()
    }
    
    message.success('模板预览生成成功')
  } catch (error: any) {
    message.error(error.message || '生成模板预览失败')
    console.error('模板渲染失败:', error)
  } finally {
    renderingPreview.value = false
  }
}

// 更新代码高亮
const updateHighlightedCode = () => {
  if (!renderedTemplate.value || !selectedFile.value) {
    highlightedCode.value = ''
    return
  }
  
  const content = renderedTemplate.value[selectedFile.value] || ''
  // 简单的代码高亮，可以后续集成更高级的高亮库
  highlightedCode.value = escapeHtml(content)
}

// HTML转义
const escapeHtml = (text: string) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// 复制到剪贴板
const copyToClipboard = async () => {
  if (!renderedTemplate.value || !selectedFile.value) return
  
  try {
    const content = renderedTemplate.value[selectedFile.value]
    await navigator.clipboard.writeText(content)
    message.success('已复制到剪贴板')
  } catch (error) {
    message.error('复制失败')
    console.error('复制失败:', error)
  }
}

// 下载文件
const downloadFile = () => {
  if (!renderedTemplate.value || !selectedFile.value) return
  
  const content = renderedTemplate.value[selectedFile.value]
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = selectedFile.value
  a.click()
  URL.revokeObjectURL(url)
}

// 监听选中文件变化
watch(selectedFile, () => {
  updateHighlightedCode()
})

const goBack = () => {
  // 检查是否有历史记录可以返回
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    // 如果没有历史记录，默认返回模板选择页面
    router.push(`/workspace/${workspaceName.value}/middleware/deploy`)
  }
}

onMounted(() => {
  loadTemplateInfo()
})
</script>

<style scoped>
.parameter-config {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.config-header {
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

.config-content {
  margin-bottom: 24px;
}

.config-layout {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 24px;
}

.config-form {
  min-height: 600px;
}

.form-section {
  margin-bottom: 32px;
}

.form-section h3 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.info-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cost-card,
.tips-card,
.workspace-tips-card {
  height: fit-content;
}

.cost-breakdown {
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

.no-tips {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #52c41a;
  font-size: 14px;
}

.recommendations {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.4;
}

.workspace-tip {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

.config-footer {
  padding: 16px 0;
  border-top: 1px solid #f0f0f0;
  background: white;
  position: sticky;
  bottom: 0;
  z-index: 10;
}

/* 视图切换选项卡样式 */
.view-tabs {
  margin-bottom: 24px;
}

.view-tabs :deep(.n-tabs-nav) {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 4px;
}

.view-tabs :deep(.n-tabs-tab) {
  border-radius: 6px;
  font-weight: 500;
}

/* 模板预览样式 */
.template-preview {
  grid-column: 1 / -1; /* 占满整个宽度 */
}

.preview-card {
  min-height: 600px;
}

.preview-content {
  height: 100%;
}

.template-files {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.file-selector {
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e8e9eb;
}

.file-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #e8e9eb;
  overflow: hidden;
}

.file-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e8e9eb;
}

.file-name {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 14px;
  font-weight: 600;
  color: #24292f;
}

.code-viewer {
  flex: 1;
  padding: 16px;
  background: #ffffff;
  overflow: auto;
  max-height: 500px;
}

.code-viewer pre {
  margin: 0;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #24292f;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.code-viewer code {
  background: none;
  padding: 0;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
}

.empty-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

/* 配置表单容器样式调整 */
.form-container {
  width: 100%;
}

/* 预览时调整布局 */
.config-layout:has(.template-preview[style*="display: block"]) {
  grid-template-columns: 1fr;
}

.config-layout:has(.template-preview[style*="display: block"]) .info-panel {
  display: none;
}

@media (max-width: 1200px) {
  .config-layout {
    grid-template-columns: 1fr;
  }
  
  .info-panel {
    order: -1;
  }
}

@media (max-width: 768px) {
  .parameter-config {
    padding: 16px;
  }
  
  .config-header .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
