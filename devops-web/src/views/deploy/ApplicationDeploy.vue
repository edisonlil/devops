<template>
  <div class="application-deploy">
    <div class="page-header">
      <h2>应用部署</h2>
      <n-space>
        <n-button @click="showDeployModal = true" type="primary">
          <template #icon>
            <n-icon><Add /></n-icon>
          </template>
          新建部署
        </n-button>
        <n-button @click="refreshData" :loading="loading">
          <template #icon>
            <n-icon><Refresh /></n-icon>
          </template>
          刷新
        </n-button>
      </n-space>
    </div>

    <!-- 服务器选择 -->
    <n-card title="目标服务器" class="mb-4">
      <n-select
        v-model:value="selectedServerId"
        :options="serverOptions"
        placeholder="选择目标服务器"
        @update:value="handleServerChange"
        :loading="loading"
      />
      
      <div v-if="selectedServer" class="server-info mt-3">
        <n-descriptions :column="4" size="small">
          <n-descriptions-item label="状态">
            <n-tag :type="selectedServer.status === 'connected' ? 'success' : 'error'">
              {{ selectedServer.status === 'connected' ? '已连接' : '未连接' }}
            </n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="主机">
            {{ selectedServer.host }}:{{ selectedServer.port }}
          </n-descriptions-item>
          <n-descriptions-item label="用户">
            {{ selectedServer.username }}
          </n-descriptions-item>
          <n-descriptions-item label="DevOps状态">
            <n-tag v-if="devopsStatus" :type="devopsStatus.isInstalled ? 'success' : 'error'">
              {{ devopsStatus.isInstalled ? '已安装' : '未安装' }}
            </n-tag>
            <n-spin v-else size="small" />
          </n-descriptions-item>
        </n-descriptions>
      </div>
    </n-card>

    <!-- 应用列表 -->
    <n-card title="部署的应用">
      <n-data-table
        :columns="applicationColumns"
        :data="applications"
        :loading="applicationsLoading"
        :pagination="false"
        :row-key="(row: any) => row.id"
        empty-text="暂无应用部署"
      />
    </n-card>

    <!-- 部署配置对话框 -->
    <n-modal v-model:show="showDeployModal">
      <n-card
        style="width: 800px; max-height: 80vh; overflow: auto"
        title="新建应用部署"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
      >
        <template #header-extra>
          <n-button quaternary @click="showDeployModal = false">
            <n-icon><Close /></n-icon>
          </n-button>
        </template>

        <n-form
          ref="deployFormRef"
          :model="deployForm"
          :rules="deployRules"
          label-placement="left"
          label-width="120px"
        >
          <!-- 基本信息 -->
          <n-divider title-placement="left">基本信息</n-divider>
          
          <n-form-item label="应用名称" path="name">
            <n-input v-model:value="deployForm.name" placeholder="应用名称，只能包含小写字母、数字和连字符" />
          </n-form-item>
          
          <n-form-item label="应用类型" path="type">
            <n-select
              v-model:value="deployForm.type"
              :options="applicationTypes"
              placeholder="选择应用类型"
            />
          </n-form-item>
          
          <!-- 代码源配置 -->
          <n-divider title-placement="left">代码源配置</n-divider>
          
          <n-form-item label="代码源类型" path="sourceType">
            <n-radio-group v-model:value="deployForm.sourceType">
              <n-radio value="git">Git</n-radio>
              <n-radio value="svn">SVN</n-radio>
            </n-radio-group>
          </n-form-item>
          
          <n-form-item 
            v-if="deployForm.sourceType === 'git'" 
            label="Git URL" 
            path="gitUrl"
          >
            <n-input v-model:value="deployForm.gitUrl" placeholder="Git 仓库地址" />
          </n-form-item>
          
          <n-form-item 
            v-if="deployForm.sourceType === 'svn'" 
            label="SVN URL" 
            path="svnUrl"
          >
            <n-input v-model:value="deployForm.svnUrl" placeholder="SVN 仓库地址" />
          </n-form-item>
          
          <n-form-item 
            v-if="deployForm.sourceType === 'git'" 
            label="分支" 
            path="branch"
          >
            <n-input v-model:value="deployForm.branch" placeholder="Git 分支名称" />
          </n-form-item>
          
          <!-- 构建配置 -->
          <n-divider title-placement="left">构建配置</n-divider>
          
          <n-form-item 
            v-if="['java'].includes(deployForm.type)" 
            label="构建工具" 
            path="buildTool"
          >
            <n-select
              v-model:value="deployForm.buildTool"
              :options="buildTools"
              placeholder="选择构建工具"
            />
          </n-form-item>
          
          <n-form-item label="模板" path="template">
            <n-select
              v-model:value="deployForm.template"
              :options="templateOptions"
              placeholder="选择部署模板"
              :loading="templatesLoading"
            />
          </n-form-item>
          
          <!-- 部署配置 -->
          <n-divider title-placement="left">部署配置</n-divider>
          
          <n-form-item label="命名空间" path="namespace">
            <n-input v-model:value="deployForm.namespace" placeholder="Kubernetes 命名空间" />
          </n-form-item>
          
          <!-- 端口配置 -->
          <n-divider title-placement="left">端口配置</n-divider>
          
          <n-form-item label="应用端口" path="ports.app">
            <n-input-number 
              v-model:value="deployForm.ports.app" 
              :min="1" 
              :max="65535" 
              placeholder="容器内应用端口"
            />
          </n-form-item>
          
          <n-form-item label="暴露端口" path="ports.expose">
            <n-input-number 
              v-model:value="deployForm.ports.expose" 
              :min="1" 
              :max="65535" 
              placeholder="NodePort 暴露端口"
            />
          </n-form-item>
          
          <!-- 资源配置 -->
          <n-divider title-placement="left">资源配置</n-divider>
          
          <n-form-item label="CPU 限制" path="resources.cpu">
            <n-input v-model:value="deployForm.resources.cpu" placeholder="如：1000m, 1" />
          </n-form-item>
          
          <n-form-item label="内存限制" path="resources.memory">
            <n-input v-model:value="deployForm.resources.memory" placeholder="如：2Gi, 1024Mi" />
          </n-form-item>
          
          <n-form-item label="存储大小" path="resources.storage">
            <n-input v-model:value="deployForm.resources.storage" placeholder="如：10Gi, 5GB" />
          </n-form-item>
        </n-form>

        <template #footer>
          <n-space justify="end">
            <n-button @click="showDeployModal = false">取消</n-button>
            <n-button @click="previewDeploy" :loading="previewing">预览命令</n-button>
            <n-button type="primary" @click="startDeploy" :loading="deploying">开始部署</n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>

    <!-- 命令预览对话框 -->
    <n-modal v-model:show="showPreviewModal">
      <n-card
        style="width: 700px"
        title="部署命令预览"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
      >
        <template #header-extra>
          <n-button quaternary @click="showPreviewModal = false">
            <n-icon><Close /></n-icon>
          </n-button>
        </template>

        <div class="command-preview">
          <n-text>将在远程服务器执行以下命令：</n-text>
          <n-code :code="previewCommand" language="bash" class="mt-2" />
        </div>

        <template #footer>
          <n-space justify="end">
            <n-button @click="showPreviewModal = false">取消</n-button>
            <n-button type="primary" @click="confirmDeploy" :loading="deploying">确认部署</n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import {
  NCard,
  NSelect,
  NDescriptions,
  NDescriptionsItem,
  NTag,
  NSpin,
  NDataTable,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NRadioGroup,
  NRadio,
  NDivider,
  NButton,
  NSpace,
  NIcon,
  NText,
  NCode,
  type DataTableColumns,
  type FormInst
} from 'naive-ui'
import { Add, Refresh, Close, Play, Stop, Trash, Eye } from '@vicons/ionicons5'
import { deployApi, type RemoteServer, type ApplicationDeployment } from '@/api/deploy'
import { APPLICATION_TYPES } from '@/types/application'

const route = useRoute()
const router = useRouter()
const message = useMessage()

// 响应式数据
const loading = ref(false)
const applicationsLoading = ref(false)
const templatesLoading = ref(false)
const deploying = ref(false)
const previewing = ref(false)
const servers = ref<RemoteServer[]>([])
const selectedServerId = ref<string>('')
const applications = ref<ApplicationDeployment[]>([])
const devopsStatus = ref<any>(null)
const showDeployModal = ref(false)
const showPreviewModal = ref(false)
const previewCommand = ref('')
const deployFormRef = ref<FormInst | null>(null)
const templateOptions = ref<Array<{ label: string; value: string }>>([])

const currentWorkspace = computed(() => route.params.workspaceName as string)
const selectedServer = computed(() => servers.value.find(s => s.id === selectedServerId.value))

// 服务器选项
const serverOptions = computed(() => 
  servers.value.map(server => ({
    label: `${server.name} (${server.host}:${server.port})`,
    value: server.id
  }))
)

// 部署表单
const deployForm = ref({
  name: '',
  type: 'java',
  sourceType: 'git',
  gitUrl: '',
  svnUrl: '',
  branch: 'main',
  buildTool: 'maven',
  template: '',
  namespace: 'default',
  ports: {
    app: 8080,
    expose: 30080
  },
  resources: {
    cpu: '1000m',
    memory: '2Gi',
    storage: '10Gi'
  }
})

// 应用类型选项
const applicationTypes = APPLICATION_TYPES

// 构建工具选项
const buildTools = [
  { label: 'Maven', value: 'maven' },
  { label: 'Gradle', value: 'gradle' }
]

// 表单验证规则
const deployRules = {
  name: [
    { required: true, message: '请输入应用名称' },
    { pattern: /^[a-z0-9-]+$/, message: '只能包含小写字母、数字和连字符' }
  ],
  type: [
    { required: true, message: '请选择应用类型' }
  ],
  gitUrl: [
    { 
      required: true, 
      message: '请输入Git地址',
      trigger: ['blur', 'input'],
      validator: (rule: any, value: string) => {
        if (deployForm.value.sourceType === 'git' && !value) {
          return new Error('Git模式需要输入Git地址')
        }
        return true
      }
    }
  ],
  svnUrl: [
    { 
      required: true, 
      message: '请输入SVN地址',
      trigger: ['blur', 'input'],
      validator: (rule: any, value: string) => {
        if (deployForm.value.sourceType === 'svn' && !value) {
          return new Error('SVN模式需要输入SVN地址')
        }
        return true
      }
    }
  ]
}

// 应用表格列
const applicationColumns: DataTableColumns = [
  {
    title: '应用名称',
    key: 'name',
    width: 150
  },
  {
    title: '类型',
    key: 'type',
    width: 100,
    render: (row: ApplicationDeployment) => {
      const typeMap: Record<string, string> = {
        java: 'Java',
        vue: 'Vue',
        go: 'Go',
        nginx: 'Nginx',
        tomcat: 'Tomcat',
        python: 'Python'
      }
      return typeMap[row.type] || row.type
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row: ApplicationDeployment) => {
      const statusMap = {
        deploying: { type: 'info', text: '部署中' },
        running: { type: 'success', text: '运行中' },
        stopped: { type: 'default', text: '已停止' },
        failed: { type: 'error', text: '失败' }
      }
      const status = statusMap[row.status]
      return h(NTag, { type: status.type }, { default: () => status.text })
    }
  },
  {
    title: 'Git/SVN',
    key: 'source',
    width: 200,
    render: (row: ApplicationDeployment) => row.gitUrl || row.svnUrl || '-'
  },
  {
    title: '创建时间',
    key: 'createdAt',
    width: 150,
    render: (row: ApplicationDeployment) => new Date(row.createdAt).toLocaleString()
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render: (row: ApplicationDeployment) => 
      h(NSpace, null, {
        default: () => [
          h(NButton, 
            { 
              size: 'small',
              onClick: () => viewApplication(row) 
            }, 
            { 
              default: () => '详情',
              icon: () => h(NIcon, null, { default: () => h(Eye) })
            }
          ),
          row.status === 'running' ? 
            h(NButton, 
              { 
                size: 'small', 
                onClick: () => stopApplication(row)
              }, 
              { 
                default: () => '停止',
                icon: () => h(NIcon, null, { default: () => h(Stop) })
              }
            ) : 
            h(NButton, 
              { 
                size: 'small', 
                type: 'primary',
                onClick: () => startApplication(row)
              }, 
              { 
                default: () => '启动',
                icon: () => h(NIcon, null, { default: () => h(Play) })
              }
            ),
          h(NButton, 
            { 
              size: 'small', 
              type: 'error',
              onClick: () => deleteApplication(row)
            }, 
            { 
              default: () => '删除',
              icon: () => h(NIcon, null, { default: () => h(Trash) })
            }
          )
        ]
      })
  }
]

// 方法
const refreshData = async () => {
  loading.value = true
  try {
    const result = await deployApi.getRemoteServers()
    servers.value = result.data.servers
    
    // 如果已选择服务器，刷新应用列表
    if (selectedServerId.value) {
      await loadApplications()
    }
  } catch (error: any) {
    message.error(error.response?.data?.message || '获取数据失败')
  } finally {
    loading.value = false
  }
}

const handleServerChange = async (serverId: string) => {
  selectedServerId.value = serverId
  devopsStatus.value = null
  
  if (serverId) {
    // 获取DevOps状态
    try {
      const status = await deployApi.getDevopsStatus(serverId)
      devopsStatus.value = status.data
    } catch (error) {
      console.error('获取DevOps状态失败:', error)
    }
    
    // 加载应用列表
    await loadApplications()
    
    // 加载模板列表
    await loadTemplates()
  }
}

const loadApplications = async () => {
  if (!selectedServerId.value) return
  
  applicationsLoading.value = true
  try {
    const result = await deployApi.getApplications(currentWorkspace.value, selectedServerId.value)
    applications.value = result.data.applications
  } catch (error: any) {
    message.error(error.response?.data?.message || '获取应用列表失败')
  } finally {
    applicationsLoading.value = false
  }
}

const loadTemplates = async () => {
  if (!selectedServerId.value) return
  
  templatesLoading.value = true
  try {
    const result = await deployApi.getRemoteTemplates(selectedServerId.value, deployForm.value.type)
    templateOptions.value = result.data.templates.map((t: any) => ({
      label: t.name,
      value: t.name
    }))
  } catch (error: any) {
    console.error('获取模板列表失败:', error)
    templateOptions.value = []
  } finally {
    templatesLoading.value = false
  }
}

const resetDeployForm = () => {
  deployForm.value = {
    name: '',
    type: 'java',
    sourceType: 'git',
    gitUrl: '',
    svnUrl: '',
    branch: 'main',
    buildTool: 'maven',
    template: '',
    namespace: 'default',
    ports: {
      app: 8080,
      expose: 30080
    },
    resources: {
      cpu: '1000m',
      memory: '2Gi',
      storage: '10Gi'
    }
  }
}

const buildDeployCommand = () => {
  const form = deployForm.value
  const args = ['run', form.type]
  
  if (form.sourceType === 'git' && form.gitUrl) {
    args.push('--git-url', form.gitUrl)
    if (form.branch) {
      args.push('--git-branch', form.branch)
    }
  } else if (form.sourceType === 'svn' && form.svnUrl) {
    args.push('--svn-url', form.svnUrl)
  }
  
  if (form.buildTool) {
    args.push('--build-tool', form.buildTool)
  }
  
  if (form.template) {
    args.push('--template', form.template)
  }
  
  if (form.namespace) {
    args.push('--namespace', form.namespace)
  }
  
  args.push('--workspace', currentWorkspace.value)
  
  if (form.ports.app) {
    args.push('--app-port', form.ports.app.toString())
  }
  
  if (form.ports.expose) {
    args.push('--expose-port', form.ports.expose.toString())
  }
  
  args.push(form.name)
  
  return `devops ${args.join(' ')}`
}

const previewDeploy = async () => {
  if (!deployFormRef.value) return
  
  try {
    await deployFormRef.value.validate()
    previewing.value = true
    
    previewCommand.value = buildDeployCommand()
    showPreviewModal.value = true
  } catch (error) {
    message.error('请完善表单信息')
  } finally {
    previewing.value = false
  }
}

const startDeploy = async () => {
  if (!deployFormRef.value || !selectedServerId.value) return
  
  try {
    await deployFormRef.value.validate()
    await confirmDeploy()
  } catch (error) {
    message.error('请完善表单信息')
  }
}

const confirmDeploy = async () => {
  if (!selectedServerId.value) {
    message.error('请先选择目标服务器')
    return
  }
  
  deploying.value = true
  try {
    const deployConfig = {
      ...deployForm.value,
      serverId: selectedServerId.value
    }
    
    const result = await deployApi.deployApplication(currentWorkspace.value, deployConfig)
    message.success('部署任务已创建，正在执行...')
    
    showDeployModal.value = false
    showPreviewModal.value = false
    resetDeployForm()
    
    // 刷新应用列表
    await loadApplications()
    
    // 跳转到执行进度页面
    if (result.data.id) {
      router.push({
        name: 'MiddlewareProgress',
        params: {
          workspaceName: currentWorkspace.value,
          deploymentId: result.data.id
        }
      })
    }
  } catch (error: any) {
    message.error(error.response?.data?.message || '部署失败')
  } finally {
    deploying.value = false
  }
}

const viewApplication = (app: ApplicationDeployment) => {
  // 跳转到应用详情页面
  router.push({
    name: 'ApplicationDetails',
    params: {
      workspaceName: currentWorkspace.value,
      appName: app.name
    },
    query: {
      serverId: selectedServerId.value
    }
  })
}

const startApplication = async (app: ApplicationDeployment) => {
  try {
    await deployApi.startApplication(currentWorkspace.value, app.name, selectedServerId.value)
    message.success('应用启动成功')
    await loadApplications()
  } catch (error: any) {
    message.error(error.response?.data?.message || '启动失败')
  }
}

const stopApplication = async (app: ApplicationDeployment) => {
  try {
    await deployApi.stopApplication(currentWorkspace.value, app.name, selectedServerId.value)
    message.success('应用停止成功')
    await loadApplications()
  } catch (error: any) {
    message.error(error.response?.data?.message || '停止失败')
  }
}

const deleteApplication = async (app: ApplicationDeployment) => {
  try {
    await deployApi.deleteApplication(currentWorkspace.value, app.name, selectedServerId.value)
    message.success('应用删除成功')
    await loadApplications()
  } catch (error: any) {
    message.error(error.response?.data?.message || '删除失败')
  }
}

// 监听应用类型变化，刷新模板列表
watch(() => deployForm.value.type, () => {
  if (selectedServerId.value) {
    loadTemplates()
  }
})

// 生命周期
onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.application-deploy {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-3 {
  margin-top: 12px;
}

.mt-2 {
  margin-top: 8px;
}

.server-info {
  padding: 12px;
  background-color: #fafafa;
  border-radius: 6px;
}

.command-preview {
  background-color: #f8f8f9;
  padding: 16px;
  border-radius: 6px;
}
</style>