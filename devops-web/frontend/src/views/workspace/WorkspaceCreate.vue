<template>
  <div class="workspace-create">
    <div class="page-header">
      <h2>创建工作空间</h2>
      <el-button @click="$router.back()">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
    </div>

    <el-card>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="工作空间名称" prop="name">
          <el-input 
            v-model="form.name" 
            placeholder="请输入工作空间名称（只能包含字母、数字、下划线、连字符）"
            @input="validateName"
          />
          <div class="form-tip">工作空间名称将用作目录名，请使用英文字母、数字、下划线或连字符</div>
        </el-form-item>

        <el-form-item label="构建平台" prop="platform">
          <el-radio-group v-model="form.platform">
            <el-radio label="DOCKER_SWARM">Docker Swarm</el-radio>
            <el-radio label="KUBERNETES">Kubernetes</el-radio>
            <el-radio label="DOCKER_COMPOSE">Docker Compose</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="Harbor地址" prop="harborAddress">
          <el-input 
            v-model="form.harborAddress" 
            placeholder="例如: harbor.example.com"
          />
          <div class="form-tip">Docker镜像仓库地址</div>
        </el-form-item>

        <el-form-item label="Harbor项目" prop="harborProject">
          <el-input 
            v-model="form.harborProject" 
            placeholder="例如: my-project"
          />
          <div class="form-tip">Harbor中的项目名称</div>
        </el-form-item>

        <!-- Docker Swarm 特有配置 -->
        <template v-if="form.platform === 'DOCKER_SWARM'">
          <el-form-item label="Stack名称" prop="stackName">
            <el-input 
              v-model="form.stackName" 
              placeholder="例如: my-app"
            />
            <div class="form-tip">Docker Stack的名称</div>
          </el-form-item>

          <el-form-item label="Swarm网络" prop="swarmNetwork">
            <el-input 
              v-model="form.swarmNetwork" 
              placeholder="例如: my-app-network"
            />
            <div class="form-tip">Docker Swarm网络名称</div>
          </el-form-item>
        </template>

        <!-- Kubernetes 特有配置 -->
        <template v-if="form.platform === 'KUBERNETES'">
          <el-form-item label="Namespace" prop="namespace">
            <el-input 
              v-model="form.namespace" 
              placeholder="例如: default"
            />
            <div class="form-tip">Kubernetes命名空间</div>
          </el-form-item>
        </template>

        <el-form-item label="启用模板" prop="enabledTemplates">
          <el-input 
            v-model="form.enabledTemplates" 
            placeholder="例如: template1,template2"
          />
          <div class="form-tip">启用的模板名称，多个用逗号分隔</div>
        </el-form-item>

        <el-form-item label="启用Dockerfile" prop="enabledDockerfiles">
          <el-input 
            v-model="form.enabledDockerfiles" 
            placeholder="例如: java-dockerfile,node-dockerfile"
          />
          <div class="form-tip">启用的Dockerfile名称，多个用逗号分隔</div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="createWorkspace" :loading="creating">
            创建工作空间
          </el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../../api/index.js'

const router = useRouter()
const formRef = ref()
const creating = ref(false)

const form = reactive({
  name: '',
  platform: 'DOCKER_SWARM',
  harborAddress: 'harbor.example.com',
  harborProject: '',
  stackName: '',
  swarmNetwork: '',
  namespace: 'default',
  enabledTemplates: '',
  enabledDockerfiles: ''
})

const rules = {
  name: [
    { required: true, message: '请输入工作空间名称', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_-]+$/, message: '只能包含字母、数字、下划线、连字符', trigger: 'blur' }
  ],
  platform: [
    { required: true, message: '请选择构建平台', trigger: 'change' }
  ],
  harborAddress: [
    { required: true, message: '请输入Harbor地址', trigger: 'blur' }
  ],
  harborProject: [
    { required: true, message: '请输入Harbor项目名称', trigger: 'blur' }
  ]
}

// 监听工作空间名称变化，自动填充相关字段
watch(() => form.name, (newName) => {
  if (newName) {
    if (!form.harborProject) {
      form.harborProject = newName
    }
    if (form.platform === 'DOCKER_SWARM') {
      if (!form.stackName) {
        form.stackName = newName
      }
      if (!form.swarmNetwork) {
        form.swarmNetwork = `${newName}-network`
      }
    }
    if (form.platform === 'KUBERNETES' && !form.namespace) {
      form.namespace = newName
    }
  }
})

// 监听平台变化，调整默认值
watch(() => form.platform, (newPlatform) => {
  if (newPlatform === 'KUBERNETES' && !form.namespace) {
    form.namespace = form.name || 'default'
  }
})

const validateName = () => {
  if (formRef.value) {
    formRef.value.validateField('name')
  }
}

const createWorkspace = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    creating.value = true
    
    const config = {
      BUILD_PLATFORM: form.platform,
      BUILD_HARBOR_ADDRESS: form.harborAddress,
      BUILD_HARBOR_PROJECT: form.harborProject,
      BUILD_ENABEL_TEMPLATES: form.enabledTemplates,
      BUILD_ENABEL_DOCKERFILES: form.enabledDockerfiles
    }
    
    if (form.platform === 'DOCKER_SWARM') {
      config.BUILD_DOCKER_STACK_NAME = form.stackName
      config.BUILD_DOCKER_SWARM_NETWORK = form.swarmNetwork
    } else if (form.platform === 'KUBERNETES') {
      config.BUILD_K8S_NAMESPACE = form.namespace
    }
    
    await api.post('/workspace', {
      name: form.name,
      config
    })
    
    ElMessage.success('工作空间创建成功')
    router.push('/workspace')
  } catch (error) {
    ElMessage.error('创建工作空间失败')
  } finally {
    creating.value = false
  }
}

const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
}
</script>

<style scoped>
.workspace-create {
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
