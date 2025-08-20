<template>
  <div class="workspace-config">
    <div class="page-header">
      <h2>编辑配置 - {{ workspaceName }}</h2>
      <el-button @click="$router.back()">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
    </div>

    <el-card v-loading="loading">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="构建平台" prop="BUILD_PLATFORM">
          <el-radio-group v-model="form.BUILD_PLATFORM">
            <el-radio label="DOCKER_SWARM">Docker Swarm</el-radio>
            <el-radio label="KUBERNETES">Kubernetes</el-radio>
            <el-radio label="DOCKER_COMPOSE">Docker Compose</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="Harbor地址" prop="BUILD_HARBOR_ADDRESS">
          <el-input v-model="form.BUILD_HARBOR_ADDRESS" placeholder="例如: harbor.example.com" />
        </el-form-item>

        <el-form-item label="Harbor项目" prop="BUILD_HARBOR_PROJECT">
          <el-input v-model="form.BUILD_HARBOR_PROJECT" placeholder="例如: my-project" />
        </el-form-item>

        <!-- Docker Swarm 配置 -->
        <template v-if="form.BUILD_PLATFORM === 'DOCKER_SWARM'">
          <el-form-item label="Stack名称" prop="BUILD_DOCKER_STACK_NAME">
            <el-input v-model="form.BUILD_DOCKER_STACK_NAME" placeholder="例如: my-app" />
          </el-form-item>

          <el-form-item label="Swarm网络" prop="BUILD_DOCKER_SWARM_NETWORK">
            <el-input v-model="form.BUILD_DOCKER_SWARM_NETWORK" placeholder="例如: my-app-network" />
          </el-form-item>
        </template>

        <!-- Kubernetes 配置 -->
        <template v-if="form.BUILD_PLATFORM === 'KUBERNETES'">
          <el-form-item label="Namespace" prop="BUILD_K8S_NAMESPACE">
            <el-input v-model="form.BUILD_K8S_NAMESPACE" placeholder="例如: default" />
          </el-form-item>
        </template>

        <el-form-item label="启用模板" prop="BUILD_ENABEL_TEMPLATES">
          <el-input 
            v-model="form.BUILD_ENABEL_TEMPLATES" 
            placeholder="例如: template1,template2"
            type="textarea"
            :rows="2"
          />
          <div class="form-tip">启用的模板名称，多个用逗号分隔</div>
        </el-form-item>

        <el-form-item label="启用Dockerfile" prop="BUILD_ENABEL_DOCKERFILES">
          <el-input 
            v-model="form.BUILD_ENABEL_DOCKERFILES" 
            placeholder="例如: java-dockerfile,node-dockerfile"
            type="textarea"
            :rows="2"
          />
          <div class="form-tip">启用的Dockerfile名称，多个用逗号分隔</div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="saveConfig" :loading="saving">
            保存配置
          </el-button>
          <el-button @click="resetForm">重置</el-button>
          <el-button @click="validateConfig">验证配置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 配置预览 -->
    <el-card style="margin-top: 20px;">
      <template #header>
        <span>配置文件预览</span>
      </template>
      <el-input
        v-model="configPreview"
        type="textarea"
        :rows="15"
        readonly
        placeholder="配置文件内容将在这里显示"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../../api/index.js'

const route = useRoute()
const router = useRouter()
const workspaceName = route.params.name
const formRef = ref()
const loading = ref(false)
const saving = ref(false)
const configPreview = ref('')

const form = reactive({
  BUILD_PLATFORM: 'DOCKER_SWARM',
  BUILD_HARBOR_ADDRESS: '',
  BUILD_HARBOR_PROJECT: '',
  BUILD_DOCKER_STACK_NAME: '',
  BUILD_DOCKER_SWARM_NETWORK: '',
  BUILD_K8S_NAMESPACE: '',
  BUILD_ENABEL_TEMPLATES: '',
  BUILD_ENABEL_DOCKERFILES: ''
})

const rules = {
  BUILD_PLATFORM: [
    { required: true, message: '请选择构建平台', trigger: 'change' }
  ],
  BUILD_HARBOR_ADDRESS: [
    { required: true, message: '请输入Harbor地址', trigger: 'blur' }
  ],
  BUILD_HARBOR_PROJECT: [
    { required: true, message: '请输入Harbor项目名称', trigger: 'blur' }
  ]
}

const loadConfig = async () => {
  loading.value = true
  try {
    const response = await api.get(`/config/${workspaceName}`)
    Object.assign(form, response.data.config)
    updateConfigPreview()
  } catch (error) {
    ElMessage.error('加载配置失败')
  } finally {
    loading.value = false
  }
}

const saveConfig = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    saving.value = true
    
    await api.put(`/config/${workspaceName}`, {
      config: form
    })
    
    ElMessage.success('配置保存成功')
    router.push(`/workspace/${workspaceName}`)
  } catch (error) {
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}

const validateConfig = async () => {
  try {
    const response = await api.post('/config/validate', {
      config: form
    })
    
    if (response.data.valid) {
      ElMessage.success('配置验证通过')
    } else {
      const errors = response.data.errors || []
      const warnings = response.data.warnings || []
      
      if (errors.length > 0) {
        ElMessage.error(`配置错误: ${errors.join(', ')}`)
      }
      if (warnings.length > 0) {
        ElMessage.warning(`配置警告: ${warnings.join(', ')}`)
      }
    }
  } catch (error) {
    ElMessage.error('配置验证失败')
  }
}

const resetForm = () => {
  loadConfig()
}

const updateConfigPreview = () => {
  let preview = ''
  
  preview += `#构建平台，是 DOCKER_SWARM,KUBERNETES,DOCKER_COMPOSE\n`
  preview += `BUILD_PLATFORM="${form.BUILD_PLATFORM}"\n\n`
  
  if (form.BUILD_PLATFORM === 'DOCKER_SWARM') {
    preview += `BUILD_DOCKER_STACK_NAME="${form.BUILD_DOCKER_STACK_NAME}"\n\n`
    preview += `BUILD_DOCKER_SWARM_NETWORK="${form.BUILD_DOCKER_SWARM_NETWORK}"\n\n`
  }
  
  if (form.BUILD_PLATFORM === 'KUBERNETES') {
    preview += `#配置Kubernetes namespace\n`
    preview += `BUILD_K8S_NAMESPACE="${form.BUILD_K8S_NAMESPACE}"\n\n`
  }
  
  preview += `#配置harbor仓库地址\n`
  preview += `BUILD_HARBOR_ADDRESS="${form.BUILD_HARBOR_ADDRESS}"\n\n`
  
  preview += `#配置harbor仓库\n`
  preview += `BUILD_HARBOR_PROJECT="${form.BUILD_HARBOR_PROJECT}"\n\n`
  
  preview += `#启用dockerfile,路由dockerfile\n`
  preview += `BUILD_ENABEL_DOCKERFILES="${form.BUILD_ENABEL_DOCKERFILES}"\n\n`
  
  preview += `#启用模板\n`
  preview += `BUILD_ENABEL_TEMPLATES="${form.BUILD_ENABEL_TEMPLATES}"\n`
  
  configPreview.value = preview
}

// 监听表单变化，更新预览
watch(form, updateConfigPreview, { deep: true })

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.workspace-config {
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

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.el-form {
  max-width: 600px;
}
</style>
