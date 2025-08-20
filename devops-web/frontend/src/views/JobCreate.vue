<template>
  <div class="job-create">
    <div class="create-container">
      <!-- 步骤指示器 -->
      <div class="steps">
        <el-steps :active="currentStep" align-center>
          <el-step title="选择模板" description="选择作业模板" />
          <el-step title="配置信息" description="配置作业参数" />
          <el-step title="完成创建" description="确认并创建" />
        </el-steps>
      </div>

      <!-- 步骤1: 选择模板 -->
      <div v-if="currentStep === 0" class="step-content">
        <div class="step-header">
          <h2 class="step-title">选择作业模板</h2>
          <p class="step-subtitle">选择适合您项目的模板</p>
        </div>

        <div class="template-filters">
          <div class="filter-sidebar">
            <h3 class="filter-title">分类</h3>
            <div class="filter-list">
              <div 
                v-for="category in categories"
                :key="category.value"
                class="filter-item"
                :class="{ active: selectedCategory === category.value }"
                @click="selectedCategory = category.value"
              >
                <el-icon class="filter-icon">
                  <component :is="category.icon" />
                </el-icon>
                <span class="filter-name">{{ category.label }}</span>
                <span class="filter-count">{{ category.count }}</span>
              </div>
            </div>
          </div>

          <div class="template-grid">
            <div 
              v-for="template in filteredTemplates"
              :key="template.id"
              class="template-card"
              :class="{ selected: selectedTemplate?.id === template.id }"
              @click="selectTemplate(template)"
            >
              <div class="template-header">
                <div class="template-icon">
                  <el-icon>
                    <component :is="template.icon" />
                  </el-icon>
                </div>
                <div class="template-info">
                  <h3 class="template-name">{{ template.name }}</h3>
                  <p class="template-desc">{{ template.description }}</p>
                </div>
              </div>
              <div class="template-tags">
                <el-tag 
                  v-for="tag in template.tags"
                  :key="tag"
                  size="small"
                  class="template-tag"
                >
                  {{ tag }}
                </el-tag>
              </div>
              <div class="template-version">
                <span class="version-label">版本:</span>
                <el-select 
                  v-model="template.selectedVersion" 
                  size="small"
                  @click.stop
                >
                  <el-option
                    v-for="version in template.versions"
                    :key="version"
                    :label="version"
                    :value="version"
                  />
                </el-select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤2: 配置信息 -->
      <div v-if="currentStep === 1" class="step-content">
        <div class="step-header">
          <h2 class="step-title">配置作业信息</h2>
          <p class="step-subtitle">配置 Git 仓库和部署参数</p>
        </div>

        <div class="config-form">
          <el-form
            ref="configFormRef"
            :model="jobConfig"
            :rules="configRules"
            label-position="top"
            size="large"
          >
            <div class="form-section">
              <h3 class="section-title">基础信息</h3>
              
              <el-form-item label="作业名称" prop="name">
                <el-input
                  v-model="jobConfig.name"
                  placeholder="请输入作业名称"
                  clearable
                />
              </el-form-item>

              <el-form-item label="Git 仓库地址" prop="gitUrl">
                <el-input
                  v-model="jobConfig.gitUrl"
                  placeholder="https://github.com/user/repo.git"
                  clearable
                >
                  <template #prepend>
                    <el-icon><Link /></el-icon>
                  </template>
                </el-input>
              </el-form-item>

              <div class="form-row">
                <el-form-item label="分支" prop="branch" class="form-col">
                  <el-input
                    v-model="jobConfig.branch"
                    placeholder="main"
                    clearable
                  />
                </el-form-item>
                <el-form-item label="构建路径" prop="buildPath" class="form-col">
                  <el-input
                    v-model="jobConfig.buildPath"
                    placeholder="./"
                    clearable
                  />
                </el-form-item>
              </div>
            </div>

            <div class="form-section">
              <h3 class="section-title">部署参数</h3>
              
              <div class="params-list">
                <div 
                  v-for="(param, index) in jobConfig.deployParams"
                  :key="index"
                  class="param-item"
                >
                  <el-input
                    v-model="param.key"
                    placeholder="参数名"
                    class="param-key"
                  />
                  <el-input
                    v-model="param.value"
                    placeholder="参数值"
                    class="param-value"
                  />
                  <el-button 
                    type="danger" 
                    text
                    @click="removeParam(index)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                
                <el-button 
                  type="primary" 
                  text
                  @click="addParam"
                  class="add-param-btn"
                >
                  <el-icon><Plus /></el-icon>
                  添加参数
                </el-button>
              </div>
            </div>
          </el-form>
        </div>
      </div>

      <!-- 步骤3: 确认创建 -->
      <div v-if="currentStep === 2" class="step-content">
        <div class="step-header">
          <h2 class="step-title">确认作业信息</h2>
          <p class="step-subtitle">请确认以下配置信息</p>
        </div>

        <div class="confirm-content">
          <div class="confirm-section">
            <h3 class="confirm-title">模板信息</h3>
            <div class="confirm-card">
              <div class="template-summary">
                <el-icon class="summary-icon">
                  <component :is="selectedTemplate?.icon" />
                </el-icon>
                <div class="summary-info">
                  <div class="summary-name">{{ selectedTemplate?.name }}</div>
                  <div class="summary-version">版本: {{ selectedTemplate?.selectedVersion }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="confirm-section">
            <h3 class="confirm-title">作业配置</h3>
            <div class="confirm-card">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="作业名称">{{ jobConfig.name }}</el-descriptions-item>
                <el-descriptions-item label="Git 仓库">{{ jobConfig.gitUrl }}</el-descriptions-item>
                <el-descriptions-item label="分支">{{ jobConfig.branch }}</el-descriptions-item>
                <el-descriptions-item label="构建路径">{{ jobConfig.buildPath }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </div>

          <div class="confirm-section" v-if="jobConfig.deployParams.length > 0">
            <h3 class="confirm-title">部署参数</h3>
            <div class="confirm-card">
              <div class="params-preview">
                <div 
                  v-for="param in jobConfig.deployParams"
                  :key="param.key"
                  class="param-preview"
                >
                  <span class="param-key">{{ param.key }}:</span>
                  <span class="param-value">{{ param.value }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="step-actions">
        <el-button 
          v-if="currentStep > 0"
          size="large"
          @click="prevStep"
        >
          上一步
        </el-button>
        <el-button 
          v-if="currentStep < 2"
          type="primary" 
          size="large"
          :disabled="!canNextStep"
          @click="nextStep"
        >
          下一步
        </el-button>
        <el-button 
          v-if="currentStep === 2"
          type="primary" 
          size="large"
          :loading="creating"
          @click="createJob"
        >
          创建作业
        </el-button>
        <el-button 
          size="large"
          @click="goBack"
        >
          取消
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { templatesApi, jobsApi } from '../api/index.js'

const router = useRouter()
const route = useRoute()
const emit = defineEmits(['update-header'])

// 响应式数据
const currentStep = ref(0)
const selectedCategory = ref('all')
const selectedTemplate = ref(null)
const creating = ref(false)
const configFormRef = ref()

const jobConfig = reactive({
  name: '',
  gitUrl: '',
  branch: 'main',
  buildPath: './',
  deployParams: [
    { key: 'PORT', value: '8080' },
    { key: 'ENV', value: 'production' }
  ]
})

// 模板分类
const categories = [
  { value: 'all', label: '全部模板', icon: 'Grid', count: 12 },
  { value: 'java', label: 'Java', icon: 'Coffee', count: 4 },
  { value: 'frontend', label: '前端', icon: 'Monitor', count: 3 },
  { value: 'go', label: 'Go', icon: 'Lightning', count: 2 },
  { value: 'python', label: 'Python', icon: 'Snake', count: 2 },
  { value: 'database', label: '数据库', icon: 'Database', count: 1 }
]

// 响应式数据
const templates = ref([])
const workspace = ref({})

// 计算属性
const filteredTemplates = computed(() => {
  if (selectedCategory.value === 'all') {
    return templates.value
  }
  return templates.value.filter(t => t.category === selectedCategory.value)
})

const canNextStep = computed(() => {
  if (currentStep.value === 0) {
    return selectedTemplate.value !== null
  }
  if (currentStep.value === 1) {
    return jobConfig.name && jobConfig.gitUrl
  }
  return true
})

// 表单验证规则
const configRules = {
  name: [
    { required: true, message: '请输入作业名称', trigger: 'blur' }
  ],
  gitUrl: [
    { required: true, message: '请输入 Git 仓库地址', trigger: 'blur' },
    { 
      pattern: /^https?:\/\/.+\.git$|^git@.+:.+\.git$/,
      message: '请输入有效的 Git 仓库地址',
      trigger: 'blur'
    }
  ],
  branch: [
    { required: true, message: '请输入分支名称', trigger: 'blur' }
  ]
}

// 方法
const selectTemplate = (template) => {
  selectedTemplate.value = template
}

const nextStep = async () => {
  if (currentStep.value === 1) {
    try {
      await configFormRef.value.validate()
    } catch (error) {
      return
    }
  }
  currentStep.value++
}

const prevStep = () => {
  currentStep.value--
}

const addParam = () => {
  jobConfig.deployParams.push({ key: '', value: '' })
}

const removeParam = (index) => {
  jobConfig.deployParams.splice(index, 1)
}

const createJob = async () => {
  creating.value = true
  try {
    const jobData = {
      workspaceId: route.params.id,
      name: jobConfig.name,
      templateId: selectedTemplate.value.id,
      gitUrl: jobConfig.gitUrl,
      branch: jobConfig.branch,
      buildPath: jobConfig.buildPath,
      deployParams: jobConfig.deployParams.filter(p => p.key && p.value)
    }

    await jobsApi.createJob(jobData)

    ElMessage.success('作业创建成功')
    router.push(`/workspace/${route.params.id}/workbench`)
  } catch (error) {
    console.error('创建作业失败:', error)
    ElMessage.error('创建作业失败')
  } finally {
    creating.value = false
  }
}

const goBack = () => {
  router.back()
}

// 加载工作空间信息
const loadWorkspace = async () => {
  try {
    const response = await api.get(`/workspace/${route.params.id}`)
    workspace.value = response.data
  } catch (error) {
    console.error('加载工作空间失败:', error)
    ElMessage.error('加载工作空间失败')
  }
}

// 加载模板列表
const loadTemplates = async () => {
  try {
    const platformType = workspace.value.config?.BUILD_PLATFORM
    const response = await templatesApi.getTemplates({
      workspaceId: route.params.id,
      platformType: platformType
    })

    templates.value = response.data.data.templates.map(template => ({
      ...template,
      selectedVersion: template.defaultVersion
    }))

    categories.value = response.data.data.categories
  } catch (error) {
    console.error('加载模板失败:', error)
    ElMessage.error('加载模板失败')
  }
}

// 生命周期
onMounted(async () => {
  emit('update-header', {
    showBreadcrumb: true,
    breadcrumbText: '新建作业',
    showSearch: false,
    showCreateButton: false
  })

  await loadWorkspace()
  await loadTemplates()
})
</script>

<style scoped>
.job-create {
  max-width: 1000px;
  margin: 0 auto;
}

.create-container {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.steps {
  padding: 32px 32px 0 32px;
  border-bottom: 1px solid #f3f4f6;
}

.step-content {
  padding: 32px;
  min-height: 500px;
}

.step-header {
  text-align: center;
  margin-bottom: 32px;
}

.step-title {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.step-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.template-filters {
  display: flex;
  gap: 24px;
}

.filter-sidebar {
  width: 200px;
  flex-shrink: 0;
}

.filter-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-item:hover {
  background: #f3f4f6;
}

.filter-item.active {
  background: #eff6ff;
  color: #3b82f6;
}

.filter-icon {
  font-size: 16px;
}

.filter-name {
  flex: 1;
  font-size: 14px;
}

.filter-count {
  font-size: 12px;
  color: #9ca3af;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 10px;
}

.template-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.template-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.template-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.template-card.selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.template-header {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.template-icon {
  width: 40px;
  height: 40px;
  background: #f3f4f6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #6b7280;
}

.template-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.template-desc {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.template-tags {
  margin-bottom: 12px;
}

.template-tag {
  margin-right: 8px;
  margin-bottom: 4px;
}

.template-version {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.version-label {
  color: #6b7280;
}

.config-form {
  max-width: 600px;
  margin: 0 auto;
}

.form-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.params-list {
  margin-bottom: 12px;
}

.param-item {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.param-key {
  flex: 1;
}

.param-value {
  flex: 2;
}

.add-param-btn {
  margin-top: 8px;
}

.confirm-content {
  max-width: 600px;
  margin: 0 auto;
}

.confirm-section {
  margin-bottom: 24px;
}

.confirm-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px 0;
}

.confirm-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.template-summary {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-icon {
  font-size: 24px;
  color: #3b82f6;
}

.summary-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.summary-version {
  font-size: 14px;
  color: #6b7280;
}

.params-preview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.param-preview {
  display: flex;
  gap: 8px;
  font-size: 14px;
}

.param-key {
  font-weight: 500;
  color: #374151;
}

.param-value {
  color: #6b7280;
}

.step-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 24px 32px;
  border-top: 1px solid #f3f4f6;
  background: #f9fafb;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #374151;
}

:deep(.el-steps) {
  margin-bottom: 24px;
}
</style>
