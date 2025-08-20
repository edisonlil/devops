<template>
  <div class="workspace-create">
    <div class="create-container">
      <div class="create-header">
        <h1 class="create-title">新建工作空间</h1>
        <p class="create-subtitle">配置您的工作空间基础信息</p>
      </div>

      <div class="create-form">
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          size="large"
        >
          <div class="form-section">
            <h3 class="section-title">基础信息</h3>
            
            <el-form-item label="工作空间名称" prop="name">
              <el-input
                v-model="form.name"
                placeholder="请输入工作空间名称"
                clearable
              />
              <div class="form-tip">
                工作空间名称将用作目录名，建议使用英文和数字
              </div>
            </el-form-item>

            <el-form-item label="构建平台" prop="platform">
              <el-select
                v-model="form.platform"
                placeholder="请选择构建平台"
                style="width: 100%"
              >
                <el-option
                  v-for="platform in platforms"
                  :key="platform.value"
                  :label="platform.label"
                  :value="platform.value"
                >
                  <div class="platform-option">
                    <el-icon class="platform-icon">
                      <component :is="platform.icon" />
                    </el-icon>
                    <div class="platform-info">
                      <div class="platform-name">{{ platform.label }}</div>
                      <div class="platform-desc">{{ platform.description }}</div>
                    </div>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>

            <el-form-item label="Harbor 地址" prop="harborUrl">
              <el-input
                v-model="form.harborUrl"
                placeholder="请输入 Harbor 镜像仓库地址"
                clearable
              >
                <template #prepend>https://</template>
              </el-input>
              <div class="form-tip">
                用于存储构建的 Docker 镜像，例如：harbor.company.com
              </div>
            </el-form-item>
          </div>

          <div class="form-section" v-if="form.platform === 'KUBERNETES'">
            <h3 class="section-title">Kubernetes 配置</h3>
            
            <el-form-item label="Namespace" prop="namespace">
              <el-input
                v-model="form.namespace"
                placeholder="请输入 Kubernetes Namespace"
                clearable
              />
            </el-form-item>

            <el-form-item label="Kubeconfig 路径" prop="kubeconfigPath">
              <el-input
                v-model="form.kubeconfigPath"
                placeholder="请输入 kubeconfig 文件路径"
                clearable
              />
            </el-form-item>
          </div>

          <div class="form-actions">
            <el-button size="large" @click="goBack">
              取消
            </el-button>
            <el-button 
              type="primary" 
              size="large" 
              :loading="creating"
              @click="createWorkspace"
            >
              创建工作空间
            </el-button>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../api/index.js'

const router = useRouter()
const emit = defineEmits(['update-header'])

// 响应式数据
const formRef = ref()
const creating = ref(false)

const form = reactive({
  name: '',
  platform: 'DOCKER_SWARM',
  harborUrl: '',
  namespace: '',
  kubeconfigPath: ''
})

const platforms = [
  {
    value: 'DOCKER_SWARM',
    label: 'Docker Swarm',
    description: '适用于简单的容器编排',
    icon: 'Box'
  },
  {
    value: 'KUBERNETES',
    label: 'Kubernetes',
    description: '适用于复杂的容器编排',
    icon: 'Grid'
  },
  {
    value: 'DOCKER_COMPOSE',
    label: 'Docker Compose',
    description: '适用于本地开发环境',
    icon: 'Files'
  }
]

const rules = {
  name: [
    { required: true, message: '请输入工作空间名称', trigger: 'blur' },
    { 
      pattern: /^[a-zA-Z0-9_-]+$/, 
      message: '工作空间名称只能包含字母、数字、下划线和横线', 
      trigger: 'blur' 
    }
  ],
  platform: [
    { required: true, message: '请选择构建平台', trigger: 'change' }
  ],
  harborUrl: [
    { required: true, message: '请输入 Harbor 地址', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      message: '请输入有效的域名地址',
      trigger: 'blur'
    }
  ],
  namespace: [
    { 
      required: true, 
      message: '请输入 Kubernetes Namespace', 
      trigger: 'blur',
      validator: (rule, value, callback) => {
        if (form.platform === 'KUBERNETES' && !value) {
          callback(new Error('Kubernetes 平台需要配置 Namespace'))
        } else {
          callback()
        }
      }
    }
  ]
}

// 方法
const goBack = () => {
  router.back()
}

const createWorkspace = async () => {
  try {
    await formRef.value.validate()
    
    creating.value = true
    
    const workspaceData = {
      name: form.name,
      config: {
        BUILD_PLATFORM: form.platform,
        BUILD_HARBOR_ADDRESS: form.harborUrl
      }
    }

    // 如果是 Kubernetes 平台，添加额外配置
    if (form.platform === 'KUBERNETES') {
      workspaceData.config.BUILD_K8S_NAMESPACE = form.namespace
      if (form.kubeconfigPath) {
        workspaceData.config.BUILD_K8S_KUBECONFIG = form.kubeconfigPath
      }
    }

    await api.post('/workspace', workspaceData)
    
    ElMessage.success('工作空间创建成功')
    router.push('/')
    
  } catch (error) {
    console.error('创建工作空间失败:', error)
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('创建工作空间失败')
    }
  } finally {
    creating.value = false
  }
}

// 生命周期
onMounted(() => {
  emit('update-header', {
    showBreadcrumb: true,
    breadcrumbText: '新建工作空间',
    showSearch: false,
    showCreateButton: false
  })
})
</script>

<style scoped>
.workspace-create {
  max-width: 800px;
  margin: 0 auto;
}

.create-container {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.create-header {
  padding: 32px 32px 0 32px;
  text-align: center;
}

.create-title {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.create-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0 0 32px 0;
}

.create-form {
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

.platform-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.platform-icon {
  font-size: 20px;
  color: #3b82f6;
}

.platform-info {
  flex: 1;
}

.platform-name {
  font-weight: 500;
  color: #1f2937;
}

.platform-desc {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
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

:deep(.el-select .el-input__inner) {
  border-radius: 6px;
}

:deep(.el-button) {
  border-radius: 6px;
  font-weight: 500;
}
</style>
