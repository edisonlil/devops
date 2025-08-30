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
        <div class="config-layout">
          <!-- 左侧配置表单 -->
          <div class="config-form">
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
  InformationCircle 
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
const templateInfo = ref<MiddlewareTemplate | null>(null)
const templateForm = ref<TemplateFormDefinition | null>(null)
const formRef = ref()

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

const goBack = () => {
  router.push(`/workspace/${workspaceName.value}/middleware/deploy`)
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
