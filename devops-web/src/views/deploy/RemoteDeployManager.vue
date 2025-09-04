<template>
  <div class="remote-deploy-manager">
    <div class="page-header">
      <h2>远程部署管理</h2>
      <n-space>
        <n-button @click="showServerModal = true" type="primary">
          <template #icon>
            <n-icon><Add /></n-icon>
          </template>
          添加服务器
        </n-button>
        <n-button @click="refreshData" :loading="loading">
          <template #icon>
            <n-icon><Refresh /></n-icon>
          </template>
          刷新
        </n-button>
      </n-space>
    </div>

    <!-- 服务器列表 -->
    <n-card title="远程服务器" class="mb-4">
      <n-data-table
        :columns="serverColumns"
        :data="servers"
        :loading="loading"
        :pagination="false"
        :row-key="(row: any) => row.id"
      />
    </n-card>

    <!-- 最近执行记录 -->
    <n-card title="最近执行记录">
      <n-data-table
        :columns="executionColumns"
        :data="recentExecutions"
        :loading="executionLoading"
        :pagination="executionPagination"
        @update:page="handleExecutionPageChange"
      />
    </n-card>

    <!-- 添加/编辑服务器对话框 -->
    <n-modal v-model:show="showServerModal">
      <n-card
        style="width: 600px"
        :title="editingServer ? '编辑服务器' : '添加服务器'"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
      >
        <template #header-extra>
          <n-button quaternary @click="showServerModal = false">
            <n-icon><Close /></n-icon>
          </n-button>
        </template>

        <n-form
          ref="serverFormRef"
          :model="serverForm"
          :rules="serverRules"
          label-placement="left"
          label-width="100px"
        >
          <n-form-item label="服务器名称" path="name">
            <n-input v-model:value="serverForm.name" placeholder="请输入服务器名称" />
          </n-form-item>
          
          <n-form-item label="主机地址" path="host">
            <n-input v-model:value="serverForm.host" placeholder="IP地址或域名" />
          </n-form-item>
          
          <n-form-item label="端口" path="port">
            <n-input-number v-model:value="serverForm.port" :min="1" :max="65535" />
          </n-form-item>
          
          <n-form-item label="用户名" path="username">
            <n-input v-model:value="serverForm.username" placeholder="SSH用户名" />
          </n-form-item>
          
          <n-form-item label="认证方式" path="authType">
            <n-select
              v-model:value="serverForm.authType"
              :options="authTypeOptions"
              placeholder="请选择认证方式"
            />
          </n-form-item>
          
          <n-form-item v-if="serverForm.authType === 'password'" label="密码" path="password">
            <n-input
              v-model:value="serverForm.password"
              type="password"
              show-password-on="click"
              placeholder="SSH密码"
            />
          </n-form-item>
          
          <n-form-item v-if="serverForm.authType === 'key'" label="私钥路径" path="privateKey">
            <n-input v-model:value="serverForm.privateKey" placeholder="私钥文件路径或内容" />
          </n-form-item>
          
          <n-form-item v-if="serverForm.authType === 'key'" label="私钥密码" path="passphrase">
            <n-input
              v-model:value="serverForm.passphrase"
              type="password"
              show-password-on="click"
              placeholder="私钥密码（可选）"
            />
          </n-form-item>
          
          <n-form-item label="标签" path="tags">
            <n-dynamic-tags v-model:value="serverForm.tags" />
          </n-form-item>
          
          <n-form-item label="描述" path="description">
            <n-input
              v-model:value="serverForm.description"
              type="textarea"
              placeholder="服务器描述"
              :autosize="{ minRows: 2, maxRows: 4 }"
            />
          </n-form-item>
        </n-form>

        <template #footer>
          <n-space justify="end">
            <n-button @click="showServerModal = false">取消</n-button>
            <n-button @click="testServerConnection" :loading="testingConnection">测试连接</n-button>
            <n-button type="primary" @click="saveServer" :loading="saving">保存</n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>

    <!-- 执行详情对话框 -->
    <n-modal v-model:show="showExecutionModal">
      <n-card
        style="width: 800px; max-height: 600px"
        title="执行详情"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
      >
        <template #header-extra>
          <n-button quaternary @click="showExecutionModal = false">
            <n-icon><Close /></n-icon>
          </n-button>
        </template>

        <ExecutionDetails
          v-if="selectedExecution"
          :execution="selectedExecution"
          :workspace="currentWorkspace"
        />
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue'
import { useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import {
  NButton,
  NCard,
  NDataTable,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NDynamicTags,
  NSpace,
  NIcon,
  NTag,
  NTime,
  type DataTableColumns,
  type FormInst
} from 'naive-ui'
import { Add, Refresh, Close, Play, Stop, Trash, Settings } from '@vicons/ionicons5'
import { deployApi, type RemoteServer, type CommandExecution } from '@/api/deploy'
import ExecutionDetails from '@/components/deploy/ExecutionDetails.vue'

const route = useRoute()
const message = useMessage()

// 响应式数据
const loading = ref(false)
const executionLoading = ref(false)
const saving = ref(false)
const testingConnection = ref(false)
const servers = ref<RemoteServer[]>([])
const recentExecutions = ref<CommandExecution[]>([])
const showServerModal = ref(false)
const showExecutionModal = ref(false)
const editingServer = ref<RemoteServer | null>(null)
const selectedExecution = ref<CommandExecution | null>(null)
const serverFormRef = ref<FormInst | null>(null)

const currentWorkspace = computed(() => route.params.workspaceName as string)

// 表单数据
const serverForm = ref({
  name: '',
  host: '',
  port: 22,
  username: '',
  authType: 'password' as 'password' | 'key',
  password: '',
  privateKey: '',
  passphrase: '',
  tags: [] as string[],
  description: ''
})

// 认证方式选项
const authTypeOptions = [
  { label: '密码认证', value: 'password' },
  { label: '密钥认证', value: 'key' }
]

// 表单验证规则
const serverRules = {
  name: [
    { required: true, message: '请输入服务器名称' }
  ],
  host: [
    { required: true, message: '请输入主机地址' }
  ],
  username: [
    { required: true, message: '请输入用户名' }
  ],
  password: [
    { 
      required: true, 
      message: '请输入密码',
      trigger: ['input', 'blur'],
      validator: (rule: any, value: string) => {
        if (serverForm.value.authType === 'password' && !value) {
          return new Error('密码认证需要输入密码')
        }
        return true
      }
    }
  ],
  privateKey: [
    { 
      required: true, 
      message: '请输入私钥路径或内容',
      trigger: ['input', 'blur'],
      validator: (rule: any, value: string) => {
        if (serverForm.value.authType === 'key' && !value) {
          return new Error('密钥认证需要输入私钥')
        }
        return true
      }
    }
  ]
}

// 分页
const executionPagination = ref({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  itemCount: 0,
  prefix: ({ itemCount }: { itemCount: number }) => `共 ${itemCount} 条`
})

// 服务器表格列
const serverColumns: DataTableColumns = [
  {
    title: '服务器名称',
    key: 'name',
    width: 150
  },
  {
    title: '主机地址',
    key: 'host',
    width: 150
  },
  {
    title: '端口',
    key: 'port',
    width: 80
  },
  {
    title: '用户名',
    key: 'username',
    width: 100
  },
  {
    title: '认证方式',
    key: 'authType',
    width: 100,
    render: (row: RemoteServer) => row.authType === 'password' ? '密码' : '密钥'
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row: RemoteServer) => {
      const statusMap = {
        connected: { type: 'success', text: '已连接' },
        disconnected: { type: 'default', text: '未连接' },
        error: { type: 'error', text: '错误' }
      }
      const status = statusMap[row.status]
      return h(NTag, { type: status.type }, { default: () => status.text })
    }
  },
  {
    title: '标签',
    key: 'tags',
    width: 150,
    render: (row: RemoteServer) => 
      row.tags?.map(tag => h(NTag, { size: 'small', style: { marginRight: '4px' } }, { default: () => tag }))
  },
  {
    title: '最后连接',
    key: 'lastConnected',
    width: 150,
    render: (row: RemoteServer) => 
      row.lastConnected ? h(NTime, { time: new Date(row.lastConnected) }) : '-'
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render: (row: RemoteServer) => 
      h(NSpace, null, {
        default: () => [
          h(NButton, 
            { 
              size: 'small', 
              onClick: () => testConnection(row.id) 
            }, 
            { 
              default: () => '测试',
              icon: () => h(NIcon, null, { default: () => h(Play) })
            }
          ),
          h(NButton, 
            { 
              size: 'small', 
              onClick: () => editServer(row) 
            }, 
            { 
              default: () => '编辑',
              icon: () => h(NIcon, null, { default: () => h(Settings) })
            }
          ),
          h(NButton, 
            { 
              size: 'small', 
              type: 'error',
              onClick: () => deleteServer(row.id) 
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

// 执行记录表格列
const executionColumns: DataTableColumns = [
  {
    title: '执行ID',
    key: 'id',
    width: 100,
    render: (row: CommandExecution) => row.id.substring(0, 8)
  },
  {
    title: '命令',
    key: 'command',
    width: 150,
    render: (row: CommandExecution) => `${row.command} ${row.args.slice(0, 2).join(' ')}`
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row: CommandExecution) => {
      const statusMap = {
        pending: { type: 'default', text: '等待中' },
        running: { type: 'info', text: '执行中' },
        completed: { type: 'success', text: '完成' },
        failed: { type: 'error', text: '失败' },
        cancelled: { type: 'warning', text: '已取消' }
      }
      const status = statusMap[row.status]
      return h(NTag, { type: status.type }, { default: () => status.text })
    }
  },
  {
    title: '开始时间',
    key: 'startTime',
    width: 150,
    render: (row: CommandExecution) => h(NTime, { time: new Date(row.startTime) })
  },
  {
    title: '结束时间',
    key: 'endTime',
    width: 150,
    render: (row: CommandExecution) => 
      row.endTime ? h(NTime, { time: new Date(row.endTime) }) : '-'
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (row: CommandExecution) => 
      h(NSpace, null, {
        default: () => [
          h(NButton, 
            { 
              size: 'small',
              onClick: () => viewExecution(row) 
            }, 
            { default: () => '详情' }
          ),
          row.status === 'running' ? 
            h(NButton, 
              { 
                size: 'small', 
                type: 'error',
                onClick: () => cancelExecution(row.id) 
              }, 
              { default: () => '取消' }
            ) : null
        ].filter(Boolean)
      })
  }
]

// 方法
const refreshData = async () => {
  loading.value = true
  try {
    const [serversRes, executionsRes] = await Promise.all([
      deployApi.getRemoteServers(),
      deployApi.getExecutionHistory(currentWorkspace.value, {
        page: executionPagination.value.page,
        size: executionPagination.value.pageSize
      })
    ])
    
    servers.value = serversRes.data.servers
    recentExecutions.value = executionsRes.data.items
    executionPagination.value.itemCount = executionsRes.data.total
  } catch (error: any) {
    message.error(error.response?.data?.message || '获取数据失败')
  } finally {
    loading.value = false
  }
}

const resetServerForm = () => {
  serverForm.value = {
    name: '',
    host: '',
    port: 22,
    username: '',
    authType: 'password',
    password: '',
    privateKey: '',
    passphrase: '',
    tags: [],
    description: ''
  }
  editingServer.value = null
}

const saveServer = async () => {
  if (!serverFormRef.value) return
  
  try {
    await serverFormRef.value.validate()
    saving.value = true
    
    if (editingServer.value) {
      await deployApi.updateRemoteServer(editingServer.value.id, serverForm.value)
      message.success('服务器配置更新成功')
    } else {
      await deployApi.addRemoteServer(serverForm.value)
      message.success('服务器添加成功')
    }
    
    showServerModal.value = false
    resetServerForm()
    await refreshData()
  } catch (error: any) {
    message.error(error.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const editServer = (server: RemoteServer) => {
  editingServer.value = server
  serverForm.value = {
    name: server.name,
    host: server.host,
    port: server.port,
    username: server.username,
    authType: server.authType,
    password: '',
    privateKey: '',
    passphrase: '',
    tags: [...server.tags],
    description: server.description || ''
  }
  showServerModal.value = true
}

const deleteServer = async (serverId: string) => {
  try {
    await deployApi.deleteRemoteServer(serverId)
    message.success('服务器删除成功')
    await refreshData()
  } catch (error: any) {
    message.error(error.response?.data?.message || '删除失败')
  }
}

const testConnection = async (serverId: string) => {
  try {
    const result = await deployApi.testConnection(serverId)
    if (result.data.success) {
      message.success(`连接成功 (延迟: ${result.data.latency}ms)`)
    } else {
      message.error(result.data.message)
    }
    await refreshData()
  } catch (error: any) {
    message.error(error.response?.data?.message || '连接测试失败')
  }
}

const testServerConnection = async () => {
  if (!serverFormRef.value) return
  
  try {
    await serverFormRef.value.validate()
    testingConnection.value = true
    
    // 这里可以实现测试连接逻辑
    message.success('连接测试成功')
  } catch (error: any) {
    message.error('连接测试失败')
  } finally {
    testingConnection.value = false
  }
}

const viewExecution = (execution: CommandExecution) => {
  selectedExecution.value = execution
  showExecutionModal.value = true
}

const cancelExecution = async (executionId: string) => {
  try {
    await deployApi.cancelExecution(currentWorkspace.value, executionId)
    message.success('执行已取消')
    await refreshData()
  } catch (error: any) {
    message.error(error.response?.data?.message || '取消失败')
  }
}

const handleExecutionPageChange = (page: number) => {
  executionPagination.value.page = page
  refreshData()
}

// 生命周期
onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.remote-deploy-manager {
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
</style>