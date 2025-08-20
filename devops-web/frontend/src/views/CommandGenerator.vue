<template>
  <div class="command-generator">
    <div class="page-header">
      <h2>命令生成器</h2>
    </div>

    <el-row :gutter="20">
      <!-- 参数配置 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>参数配置</span>
          </template>
          
          <el-form :model="form" label-width="120px">
            <el-form-item label="项目类型" required>
              <el-select v-model="form.projectType" placeholder="请选择项目类型">
                <el-option label="Java" value="java" />
                <el-option label="Vue" value="vue" />
                <el-option label="Go" value="go" />
                <el-option label="Node.js" value="node" />
              </el-select>
            </el-form-item>

            <el-form-item label="Git URL" required>
              <el-input v-model="form.gitUrl" placeholder="https://github.com/user/repo.git" />
            </el-form-item>

            <el-form-item label="Git分支">
              <el-input v-model="form.gitBranch" placeholder="main" />
            </el-form-item>

            <el-form-item label="构建工具" v-if="form.projectType === 'java'">
              <el-select v-model="form.buildTool" placeholder="请选择构建工具">
                <el-option label="Maven" value="maven" />
                <el-option label="Gradle" value="gradle" />
              </el-select>
            </el-form-item>

            <el-form-item label="Java选项" v-if="form.projectType === 'java'">
              <el-input v-model="form.javaOpts" placeholder="-Xmx512m" />
            </el-form-item>

            <el-form-item label="Dockerfile">
              <el-input v-model="form.dockerfile" placeholder="java" />
            </el-form-item>

            <el-form-item label="模板">
              <el-input v-model="form.template" placeholder="template" />
            </el-form-item>

            <el-form-item label="构建命令" v-if="form.projectType === 'vue'">
              <el-input v-model="form.buildCmds" placeholder="npm run build" />
            </el-form-item>

            <el-form-item label="构建环境">
              <el-select v-model="form.buildEnv" placeholder="请选择环境">
                <el-option label="开发环境" value="dev" />
                <el-option label="测试环境" value="test" />
                <el-option label="灰度环境" value="gray" />
                <el-option label="生产环境" value="prod" />
              </el-select>
            </el-form-item>

            <el-form-item label="工作空间">
              <el-select v-model="form.workspace" placeholder="请选择工作空间">
                <el-option 
                  v-for="ws in workspaces" 
                  :key="ws.name" 
                  :label="ws.name" 
                  :value="ws.name" 
                />
              </el-select>
            </el-form-item>

            <el-form-item label="Namespace">
              <el-input v-model="form.namespace" placeholder="default" />
            </el-form-item>

            <el-form-item label="作业名称" required>
              <el-input v-model="form.jobName" placeholder="my-app" />
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 命令预览和执行 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>生成的命令</span>
              <div>
                <el-button size="small" @click="generateCommand">
                  <el-icon><Refresh /></el-icon>
                  生成命令
                </el-button>
                <el-button size="small" @click="copyCommand" :disabled="!generatedCommand">
                  <el-icon><CopyDocument /></el-icon>
                  复制
                </el-button>
              </div>
            </div>
          </template>
          
          <el-input
            v-model="generatedCommand"
            type="textarea"
            :rows="6"
            readonly
            placeholder="生成的命令将在这里显示"
          />
          
          <div style="margin-top: 15px;">
            <el-button 
              type="primary" 
              @click="executeCommand" 
              :disabled="!generatedCommand"
              :loading="executing"
            >
              <el-icon><CaretRight /></el-icon>
              执行命令
            </el-button>
            <el-button @click="validateCommand" :disabled="!generatedCommand">
              <el-icon><CircleCheck /></el-icon>
              验证命令
            </el-button>
          </div>
        </el-card>

        <!-- 执行结果 -->
        <el-card style="margin-top: 20px;" v-if="executionResult">
          <template #header>
            <div class="card-header">
              <span>执行结果</span>
              <el-tag :type="executionResult.status === 'success' ? 'success' : 'danger'">
                {{ executionResult.status }}
              </el-tag>
            </div>
          </template>
          
          <el-input
            v-model="executionOutput"
            type="textarea"
            :rows="10"
            readonly
            placeholder="执行输出将在这里显示"
          />
        </el-card>
      </el-col>
    </el-row>

    <!-- 命令历史 -->
    <el-card style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span>命令历史</span>
          <el-button size="small" @click="loadHistory">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>
      
      <el-table :data="commandHistory" v-loading="loadingHistory">
        <el-table-column prop="command" label="命令" min-width="300" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startTime" label="执行时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.startTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button size="small" @click="useCommand(row.command)">
              使用
            </el-button>
            <el-button size="small" @click="viewExecution(row.id)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import api, { wsClient } from '../api/index.js'
import dayjs from 'dayjs'

const workspaces = ref([])
const generatedCommand = ref('')
const executing = ref(false)
const executionResult = ref(null)
const executionOutput = ref('')
const commandHistory = ref([])
const loadingHistory = ref(false)

const form = reactive({
  projectType: 'java',
  gitUrl: '',
  gitBranch: 'main',
  buildTool: 'maven',
  javaOpts: '',
  dockerfile: '',
  template: '',
  buildCmds: '',
  buildEnv: 'dev',
  workspace: '',
  namespace: '',
  jobName: ''
})

const loadWorkspaces = async () => {
  try {
    const response = await api.get('/workspace')
    workspaces.value = response.data
    
    // 设置默认工作空间
    if (workspaces.value.length > 0 && !form.workspace) {
      const activeRes = await api.get('/workspace/active')
      form.workspace = activeRes.data.activeWorkspace || workspaces.value[0].name
    }
  } catch (error) {
    ElMessage.error('加载工作空间失败')
  }
}

const generateCommand = async () => {
  try {
    const response = await api.post('/command/generate', form)
    generatedCommand.value = response.data.command
  } catch (error) {
    ElMessage.error('生成命令失败')
  }
}

const copyCommand = async () => {
  try {
    await navigator.clipboard.writeText(generatedCommand.value)
    ElMessage.success('命令已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

const validateCommand = async () => {
  try {
    const response = await api.post('/command/validate', {
      command: generatedCommand.value
    })
    
    if (response.data.valid) {
      ElMessage.success('命令验证通过')
    } else {
      const warnings = response.data.warnings || []
      if (warnings.length > 0) {
        ElMessage.warning(`命令警告: ${warnings.join(', ')}`)
      }
    }
  } catch (error) {
    ElMessage.error('命令验证失败')
  }
}

const executeCommand = async () => {
  executing.value = true
  executionResult.value = null
  executionOutput.value = ''
  
  try {
    const response = await api.post('/command/execute', {
      command: generatedCommand.value
    })
    
    const executionId = response.data.executionId
    
    // 监听执行输出
    wsClient.on('command_output', (data) => {
      if (data.executionId === executionId) {
        executionOutput.value += data.data.content
      }
    })
    
    // 监听执行完成
    wsClient.on('command_complete', (data) => {
      if (data.executionId === executionId) {
        executionResult.value = data.data
        executing.value = false
        loadHistory()
      }
    })
    
    // 监听执行错误
    wsClient.on('command_error', (data) => {
      if (data.executionId === executionId) {
        executionResult.value = { status: 'error', error: data.data.error }
        executing.value = false
      }
    })
    
  } catch (error) {
    ElMessage.error('执行命令失败')
    executing.value = false
  }
}

const loadHistory = async () => {
  loadingHistory.value = true
  try {
    const response = await api.get('/command/history?limit=10')
    commandHistory.value = response.data.executions
  } catch (error) {
    ElMessage.error('加载命令历史失败')
  } finally {
    loadingHistory.value = false
  }
}

const useCommand = (command) => {
  generatedCommand.value = command
  ElMessage.success('命令已加载')
}

const viewExecution = (id) => {
  // TODO: 实现查看执行详情
  ElMessage.info('查看执行详情功能开发中')
}

const formatTime = (time) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

// 监听表单变化，自动生成命令
watch(form, () => {
  if (form.projectType && form.gitUrl && form.jobName) {
    generateCommand()
  }
}, { deep: true })

onMounted(() => {
  loadWorkspaces()
  loadHistory()
  wsClient.connect()
})
</script>

<style scoped>
.command-generator {
  padding: 0;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
