<template>
  <div class="job-edit">
    <div class="edit-container">
      <div class="edit-header">
        <h1 class="edit-title">编辑作业</h1>
        <p class="edit-subtitle">修改作业配置信息</p>
      </div>

      <div class="edit-form">
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          size="large"
        >
          <div class="form-section">
            <h3 class="section-title">基础信息</h3>
            
            <el-form-item label="作业名称" prop="name">
              <el-input
                v-model="form.name"
                placeholder="请输入作业名称"
                clearable
              />
            </el-form-item>

            <el-form-item label="模板类型">
              <el-input
                :value="form.template"
                disabled
              />
              <div class="form-tip">
                模板类型创建后不可修改
              </div>
            </el-form-item>

            <el-form-item label="Git 仓库地址" prop="gitUrl">
              <el-input
                v-model="form.gitUrl"
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
                  v-model="form.branch"
                  placeholder="main"
                  clearable
                />
              </el-form-item>
              <el-form-item label="构建路径" prop="buildPath" class="form-col">
                <el-input
                  v-model="form.buildPath"
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
                v-for="(param, index) in form.deployParams"
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

          <div class="form-actions">
            <el-button size="large" @click="goBack">
              取消
            </el-button>
            <el-button 
              type="primary" 
              size="large" 
              :loading="saving"
              @click="saveJob"
            >
              保存修改
            </el-button>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const emit = defineEmits(['update-header'])

// 响应式数据
const formRef = ref()
const saving = ref(false)

const form = reactive({
  name: '',
  template: '',
  gitUrl: '',
  branch: 'main',
  buildPath: './',
  deployParams: []
})

// 表单验证规则
const rules = {
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
const loadJob = () => {
  // 模拟加载作业数据
  const jobData = {
    name: '用户服务',
    template: 'Java Spring Boot',
    gitUrl: 'https://github.com/company/user-service.git',
    branch: 'main',
    buildPath: './',
    deployParams: [
      { key: 'PORT', value: '8080' },
      { key: 'ENV', value: 'production' },
      { key: 'DB_HOST', value: 'mysql.internal' },
      { key: 'REDIS_URL', value: 'redis://redis.internal:6379' }
    ]
  }

  Object.assign(form, jobData)
}

const addParam = () => {
  form.deployParams.push({ key: '', value: '' })
}

const removeParam = (index) => {
  form.deployParams.splice(index, 1)
}

const goBack = () => {
  router.back()
}

const saveJob = async () => {
  try {
    await formRef.value.validate()
    
    saving.value = true
    
    // 模拟保存过程
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    ElMessage.success('作业保存成功')
    router.push(`/workspace/${route.params.id}/job/${route.params.jobId}`)
    
  } catch (error) {
    console.error('保存作业失败:', error)
    ElMessage.error('保存作业失败')
  } finally {
    saving.value = false
  }
}

// 生命周期
onMounted(() => {
  emit('update-header', {
    showBreadcrumb: true,
    breadcrumbText: '编辑作业',
    showSearch: false,
    showCreateButton: false
  })
  
  loadJob()
})
</script>

<style scoped>
.job-edit {
  max-width: 800px;
  margin: 0 auto;
}

.edit-container {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.edit-header {
  padding: 32px 32px 0 32px;
  text-align: center;
}

.edit-title {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.edit-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0 0 32px 0;
}

.edit-form {
  padding: 0 32px 32px 32px;
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

.form-tip {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
  line-height: 1.4;
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

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

:deep(.el-input__inner) {
  border-radius: 6px;
}

:deep(.el-button) {
  border-radius: 6px;
  font-weight: 500;
}

:deep(.el-input.is-disabled .el-input__inner) {
  background-color: #f9fafb;
  color: #6b7280;
}
</style>
